import type { JSX } from 'solid-js';
import { For, Show, createSignal, onCleanup, createEffect, on } from 'solid-js';
import { Portal } from 'solid-js/web';
import { state, addLog, spendGold, upgradeRoom } from '../../../state/store';
import { cookHeat, setCookHeat, cookPhase, setCookPhase } from '../../../state/cookState';
import { doChore } from '../../../systems/LaborSystem';
import { ROOM_DEFS } from '../../../data/roomData';
import { INN_CHORE_DONE } from '../../../data/eventTemplates';
import { pick } from '../../../utils/random';
import LaborSection from '../../shared/LaborSection';

interface FoodItem {
  id: string;
  icon: string;
  name: string;
  category: string;
}

const FOOD_POOL: FoodItem[] = [
  { id: 'turnip',      icon: '🥕', name: 'Turnips',      category: 'Vegetables' },
  { id: 'mushroom',    icon: '🍄', name: 'Mushrooms',    category: 'Fungi'      },
  { id: 'bread',       icon: '🍞', name: 'Bread',        category: 'Grains'     },
  { id: 'chicken',     icon: '🍗', name: 'Chicken',      category: 'Meats'      },
  { id: 'potato',      icon: '🥔', name: 'Potatoes',     category: 'Vegetables' },
  { id: 'barley',      icon: '🌾', name: 'Barley',       category: 'Grains'     },
  { id: 'mutton',      icon: '🥩', name: 'Mutton',       category: 'Meats'      },
  { id: 'truffle',     icon: '🫧', name: 'Truffles',     category: 'Fungi'      },
  { id: 'cabbage',     icon: '🥬', name: 'Cabbage',      category: 'Vegetables' },
  { id: 'flour',       icon: '🧂', name: 'Flour',        category: 'Grains'     },
  { id: 'pork',        icon: '🫀', name: 'Pork',         category: 'Meats'      },
  { id: 'chanterelle', icon: '🍂', name: 'Chanterelles', category: 'Fungi'      },
  { id: 'onion',       icon: '🧅', name: 'Onions',       category: 'Vegetables' },
  { id: 'rye',         icon: '🌾', name: 'Rye',          category: 'Grains'     },
  { id: 'venison',     icon: '🫙', name: 'Venison',      category: 'Meats'      },
  { id: 'oyster_mush', icon: '🌰', name: 'Oyster Mush.', category: 'Fungi'      },
];

const BINS = [
  { label: 'Vegetables', icon: '🥕', color: '#3a6a2a' },
  { label: 'Grains',     icon: '🌾', color: '#7a6020' },
  { label: 'Meats',      icon: '🥩', color: '#7a2a2a' },
  { label: 'Fungi',      icon: '🍄', color: '#4a3a6a' },
];

function randomItems(): FoodItem[] {
  const shuffled = [...FOOD_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8).map((f, i) => ({ ...f, id: `${f.id}_${i}` }));
}

// ── Cooking minigame data ─────────────────────────────────────────────────────
interface Recipe { name: string; icon: string; categories: string[]; }

const ALL_RECIPES: Recipe[] = [
  { name: 'Mushroom Soup',  icon: '🍲', categories: ['Fungi', 'Vegetables'] },
  { name: 'Meat Stew',      icon: '🥘', categories: ['Meats', 'Vegetables'] },
  { name: 'Herb Porridge',  icon: '🥣', categories: ['Grains', 'Fungi']     },
  { name: 'Bread & Gravy',  icon: '🍞', categories: ['Grains', 'Meats']     },
  { name: 'Roast Dinner',   icon: '🍖', categories: ['Meats', 'Vegetables', 'Grains'] },
  { name: 'Herb Broth',     icon: '🫕', categories: ['Vegetables', 'Fungi'] },
];

function randomRecipes(): Recipe[] {
  return [...ALL_RECIPES].sort(() => Math.random() - 0.5).slice(0, 3);
}

export default function KitchenView(): JSX.Element {
  const nextUpgrade = () => ROOM_DEFS.kitchen.upgrades.find((u) => u.level === state.roomLevels.kitchen + 1);

  // ── Sort minigame state ───────────────────────────────────────────────────
  const [gameItems, setGameItems] = createSignal<FoodItem[]>(randomItems());
  const [sorted, setSorted]       = createSignal(0);
  const [feedback, setFeedback]   = createSignal<{ msg: string; ok: boolean } | null>(null);

  const [dragId, setDragId]         = createSignal<string | null>(null);
  const [ghostPos, setGhostPos]     = createSignal<{ x: number; y: number } | null>(null);
  const [hoveredBin, setHoveredBin] = createSignal<string | null>(null);

  const draggedItem = () => gameItems().find((i) => i.id === dragId());

  // ── Cook minigame state (timed heat bar) ─────────────────────────────────
  const [cookQueue, setCookQueue]         = createSignal<Recipe[]>(randomRecipes());
  // cookHeat / cookPhase are module-level (cookState.ts) so the timer persists across navigation
  const [ingredientIdx, setIngredientIdx] = createSignal(0);
  const [cookFb, setCookFb]               = createSignal<{ msg: string; ok: boolean } | null>(null);
  let cookTimer:   ReturnType<typeof setInterval> | null = null;
  let cookFbTimer: ReturnType<typeof setTimeout>;

  const HEAT_RATE      = 0.5;    // % per tick — normal
  const HEAT_RATE_SLOW = 0.08;   // % per tick — slowed while awaiting ingredient
  const TICK_MS        = 150;    // ms → ~100% in ~30 s at normal rate

  const activeRecipe      = () => cookQueue()[0] ?? null;
  const allCooked         = () => cookQueue().length === 0;
  const nextIngredient    = () => {
    const recipe = activeRecipe();
    const idx    = ingredientIdx();
    return recipe && idx < recipe.categories.length ? recipe.categories[idx] : null;
  };
  const canComplete       = () =>
    cookPhase() === 'heating' &&
    cookHeat()  >= 80 &&
    ingredientIdx() >= (activeRecipe()?.categories.length ?? 0);

  const showCookFb = (msg: string, ok: boolean) => {
    clearTimeout(cookFbTimer);
    setCookFb({ msg, ok });
    cookFbTimer = setTimeout(() => setCookFb(null), 2000);
  };

  const stopCookTimer = () => {
    if (cookTimer !== null) { clearInterval(cookTimer); cookTimer = null; }
  };

  const startHeating = () => {
    stopCookTimer();
    setCookPhase('heating');
    cookTimer = setInterval(() => {
      const heat  = cookHeat();
      const phase = cookPhase();
      const idx   = ingredientIdx();
      const ms    = activeRecipe()?.categories.map((_, i) => (i + 1) * 10) ?? [];

      if (phase !== 'heating' && phase !== 'awaiting') { stopCookTimer(); return; }

      const rate = phase === 'awaiting' ? HEAT_RATE_SLOW : HEAT_RATE;
      const next = +(heat + rate).toFixed(2);

      // Transition to awaiting at the next milestone (only from heating)
      if (phase === 'heating' && idx < ms.length && next >= ms[idx]) {
        setCookHeat(ms[idx]);
        setCookPhase('awaiting');
        return;
      }
      if (next >= 110) {
        stopCookTimer(); setCookHeat(110); setCookPhase('burned'); return;
      }
      setCookHeat(next);
    }, TICK_MS);
  };

  const addIngredient = (cat: string) => {
    if (cookPhase() !== 'awaiting') return;
    const recipe = activeRecipe();
    if (!recipe) return;
    const expected = recipe.categories[ingredientIdx()];
    if (cat === expected) {
      showCookFb(`✓ ${cat} added!`, true);
      setIngredientIdx((n) => n + 1);
    } else if (recipe.categories.includes(cat)) {
      showCookFb(`Add ${expected} first!`, false);
      setCookHeat((h) => Math.min(h + 8, 109));
    } else {
      showCookFb(`${cat} isn't part of this recipe`, false);
      setCookHeat((h) => Math.min(h + 8, 109));
    }
    setCookPhase('heating'); // resume at normal rate (timer already running)
  };

  const completeCookMeal = () => {
    if (!canComplete()) return;
    stopCookTimer();
    showCookFb(`✓ ${activeRecipe()!.name} is served!`, true);
    setCookQueue((q) => q.slice(1));
    setCookHeat(0);
    setCookPhase('idle');
    setIngredientIdx(0);
  };

  const disposeBurnedMeal = () => {
    stopCookTimer();
    showCookFb('Meal disposed. Try again.', false);
    setCookHeat(0);
    setCookPhase('idle');
    setIngredientIdx(0);
  };

  onCleanup(stopCookTimer);

  // Reset all local cook state at the start of each new day
  createEffect(on(() => state.day, () => {
    stopCookTimer();
    setCookQueue(randomRecipes());
    setIngredientIdx(0);
    setCookFb(null);
    setCookDragCat(null);
    setCookGhostPos(null);
    setPanHovered(false);
  }, { defer: true }));

  // ── Cook drag (stovetop) ─────────────────────────────────────────────────
  const [cookDragCat, setCookDragCat]   = createSignal<string | null>(null);
  const [cookGhostPos, setCookGhostPos] = createSignal<{ x: number; y: number } | null>(null);
  const [panHovered, setPanHovered]     = createSignal(false);

  const addedIngredients = () => activeRecipe()?.categories.slice(0, ingredientIdx()) ?? [];

  const burnerRingColor = () => {
    const h = cookHeat();
    if (h < 3) return '#383030';
    const t = Math.min(h / 90, 1);
    return `rgb(${Math.round(80 + 140 * t)}, ${Math.round(35 - 25 * t)}, 0)`;
  };

  const burnerGlowStyle = () => {
    const h = cookHeat();
    if (h < 3) return {};
    const t = Math.min(h / 100, 1);
    const blur = Math.round(6 + 18 * t);
    const alpha = (0.3 + 0.55 * t).toFixed(2);
    return { 'box-shadow': `0 0 ${blur}px rgba(${Math.round(180 + 75 * t)}, ${Math.round(60 - 55 * t)}, 0, ${alpha})` };
  };

  const slotState = (bin: { label: string }) => {
    const recipe = activeRecipe();
    if (!recipe || !recipe.categories.includes(bin.label)) return 'empty';
    if (addedIngredients().includes(bin.label)) return 'added';
    if (cookPhase() === 'awaiting' && bin.label === nextIngredient()) return 'next';
    return 'pending';
  };

  const onIngPointerDown = (e: PointerEvent, cat: string) => {
    if (cookPhase() !== 'awaiting' || addedIngredients().includes(cat)) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setCookDragCat(cat);
    setCookGhostPos({ x: e.clientX, y: e.clientY });
  };

  // ── Pointer handlers (sort + cook drag on shared room-body) ─────────────
  const onItemPointerDown = (e: PointerEvent, id: string) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragId(id);
    setGhostPos({ x: e.clientX, y: e.clientY });
  };

  const onContainerPointerMove = (e: PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (dragId()) {
      setGhostPos({ x: e.clientX, y: e.clientY });
      const binEl = el?.closest('[data-bin]') as HTMLElement | null;
      setHoveredBin(binEl?.dataset?.bin ?? null);
    }
    if (cookDragCat()) {
      setCookGhostPos({ x: e.clientX, y: e.clientY });
      setPanHovered(!!el?.closest('[data-pan]'));
    }
  };

  const onContainerPointerUp = () => {
    if (dragId()) {
      const id  = dragId();
      const bin = hoveredBin();
      if (id && bin) dropInto(id, bin);
      setDragId(null);
      setGhostPos(null);
      setHoveredBin(null);
    }
    if (cookDragCat()) {
      const cat = cookDragCat();
      if (cat && panHovered()) addIngredient(cat);
      setCookDragCat(null);
      setCookGhostPos(null);
      setPanHovered(false);
    }
  };

  // ── Drop logic ───────────────────────────────────────────────────────────
  const dropInto = (itemId: string, binLabel: string) => {
    const item = gameItems().find((i) => i.id === itemId);
    if (!item) return;
    const ok = item.category === binLabel;
    if (ok) {
      setGameItems((prev) => prev.filter((i) => i.id !== itemId));
      setSorted((n) => n + 1);
    } else {
      showFeedback(`✗ ${item.name} doesn't belong there!`, false);
    }
  };

  let feedbackTimer: ReturnType<typeof setTimeout>;
  const showFeedback = (msg: string, ok: boolean) => {
    clearTimeout(feedbackTimer);
    setFeedback({ msg, ok });
    feedbackTimer = setTimeout(() => setFeedback(null), 1800);
  };

  // ── Chore completions ────────────────────────────────────────────────────
  const completeSort = () => {
    doChore('kitchen_sort', 1, 15, pick(INN_CHORE_DONE.kitchen_sort));
    setGameItems(randomItems());
    setSorted(0);
    setFeedback(null);
  };

  const completeCook = () => {
    doChore('kitchen_cook', 1, 20, pick(INN_CHORE_DONE.kitchen_cook ?? ['The kitchen smells wonderful.']));
    stopCookTimer();
    setCookQueue(randomRecipes());
    setCookHeat(0);
    setCookPhase('idle');
    setIngredientIdx(0);
    setCookFb(null);
  };

  const tryUpgrade = () => {
    const up = nextUpgrade();
    if (!up || !spendGold(up.cost)) return;
    upgradeRoom('kitchen');
    addLog(`Kitchen upgraded to Level ${state.roomLevels.kitchen}!`, 'kitchen', true);
  };

  return (
    <div class="room-view">
      <div class="room-header">
        <span>🍳</span>
        <span class="room-title">The Kitchen</span>
        <span class="room-subtitle">Level {state.roomLevels.kitchen}</span>
      </div>

      <div
        class="room-body"
        style={{ 'touch-action': 'none' }}
        onPointerMove={onContainerPointerMove}
        onPointerUp={onContainerPointerUp}
      >
        <LaborSection tasks={[
          {
            key:    'kitchen_unload',
            icon:   '📦',
            name:   'Unload Provisions',
            desc:   'Haul the delivery in from the yard. Unlocks sorting.',
            bonus:  '',
            verb:   'Unload',
            action: () => doChore('kitchen_unload', 1, 0, pick(INN_CHORE_DONE.kitchen_unload ?? ['Provisions unloaded.'])),
          },
          {
            key:    'kitchen_sort',
            icon:   '🍽️',
            name:   'Sort the Provisions',
            desc:   'Sort all 8 provisions into their bins, then collect the bonus.',
            bonus:  '+15g',
            verb:   'Claim',
            canAct: () => state.completedChores.includes('kitchen_unload') && gameItems().length === 0,
            hint:   state.completedChores.includes('kitchen_unload') ? 'Sort all items in the bins below first.' : 'Unload the provisions first.',
            action: completeSort,
          },
          {
            key:    'kitchen_cook',
            icon:   '🍲',
            name:   'Cook the Meals',
            desc:   'Prepare 3 dishes from the sorted provisions.',
            bonus:  '+20g',
            verb:   'Claim',
            canAct: () => state.completedChores.includes('kitchen_sort') && allCooked(),
            hint:   state.completedChores.includes('kitchen_sort') ? 'Cook all 3 meals below first.' : 'Sort the provisions first.',
            action: completeCook,
          },
        ]} />

        {/* ── Minigames row ─────────────────────────────────────────────── */}
        <div class="grid-2" style={{ gap: '12px', 'align-items': 'flex-start' }}>

          {/* ── Sort minigame ───────────────────────────────────────────── */}
          <div class="minigame-container">
            <div class="minigame-title">🍽️ Sort the Provisions</div>

            <Show when={state.completedChores.includes('kitchen_sort')}>
              <div class="chore-done-banner">✓ Provisions sorted for today.</div>
            </Show>
            <Show when={!state.completedChores.includes('kitchen_unload') && !state.completedChores.includes('kitchen_sort')}>
              <div class="text-sm text-dim italic">Unload the provisions first.</div>
            </Show>
            <Show when={state.completedChores.includes('kitchen_unload') && !state.completedChores.includes('kitchen_sort')}>
              <p class="text-sm text-dim italic mb-8">Drag each item into its correct bin.</p>
              <Show when={feedback()}>
                {(fb) => <div class={`kitchen-feedback${fb().ok ? ' ok' : ' err'}`}>{fb().msg}</div>}
              </Show>
              <div class={`kitchen-items${dragId() ? ' dragging-active' : ''}`}>
                <For each={gameItems()}>
                  {(item) => (
                    <div
                      class={`food-item${dragId() === item.id ? ' item-dragging' : ''}`}
                      onPointerDown={(e) => onItemPointerDown(e, item.id)}
                      style={{ cursor: 'grab', 'user-select': 'none' }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                  )}
                </For>
                <Show when={gameItems().length === 0}>
                  <span class="text-dim italic text-sm">All sorted! Claim your bonus above.</span>
                </Show>
              </div>
              <div class="bin-row">
                <For each={BINS}>
                  {(bin) => (
                    <div
                      class={`bin${hoveredBin() === bin.label ? ' bin-hovered' : ''}`}
                      data-bin={bin.label}
                      style={{ '--bin-color': bin.color } as Record<string, string>}
                    >
                      <span class="bin-icon">{bin.icon}</span>
                      <span class="bin-label">{bin.label}</span>
                    </div>
                  )}
                </For>
              </div>
              <div class="text-sm text-dim mt-8">Sorted: <strong class="text-amber">{sorted()}</strong>/8</div>
            </Show>
          </div>

          {/* ── Cook minigame (stovetop) ──────────────────────────────── */}
          <div class="minigame-container">

            {/* ── Header row ─────────────────────────────────────────── */}
            <div class="cook-header-row">
              <div class="minigame-title" style={{ 'margin-bottom': 0 }}>🍲 Cooking</div>
              <Show when={state.completedChores.includes('kitchen_sort') && !state.completedChores.includes('kitchen_cook') && !allCooked()}>
                <span class="cook-meal-count text-dim text-sm">
                  <strong class="text-amber">{3 - cookQueue().length}</strong>/3
                </span>
              </Show>
            </div>

            {/* ── Status banners ─────────────────────────────────────── */}
            <Show when={state.completedChores.includes('kitchen_cook')}>
              <div class="chore-done-banner">✓ Meals cooked for today.</div>
            </Show>
            <Show when={!state.completedChores.includes('kitchen_sort') && !state.completedChores.includes('kitchen_cook')}>
              <div class="text-sm text-dim italic">Sort the provisions first.</div>
            </Show>
            <Show when={state.completedChores.includes('kitchen_sort') && !state.completedChores.includes('kitchen_cook')}>
              <Show
                when={!allCooked()}
                fallback={<div class="text-sm text-dim italic">All 3 meals ready! Claim your bonus above.</div>}
              >
                {/* Recipe reference card */}
                <div class="cook-recipe-card">
                  <div class="cook-recipe-header">
                    <span class="cook-recipe-icon">{activeRecipe()!.icon}</span>
                    <span class="cook-recipe-name">{activeRecipe()!.name}</span>
                  </div>
                </div>

                {/* ── Ingredient source row + action button ───────────── */}
                <div class="cook-ing-source-row">
                  <For each={BINS}>
                    {(bin) => (
                      <div
                        class={`cook-ing-source${cookPhase() === 'awaiting' && !addedIngredients().includes(bin.label) ? ' available' : ''}${cookPhase() === 'awaiting' && bin.label === nextIngredient() ? ' ing-next' : ''}${cookDragCat() === bin.label ? ' dragging' : ''}`}
                        onPointerDown={(e) => onIngPointerDown(e, bin.label)}
                      >
                        <span class="stove-ing-icon">{bin.icon}</span>
                        <span class="stove-ing-label">{bin.label}</span>
                      </div>
                    )}
                  </For>
                  <div class="cook-ing-actions">
                    <Show when={cookPhase() === 'idle'}>
                      <button class="btn btn-sm btn-primary" onClick={startHeating}>🔥 Start Cooking</button>
                    </Show>
                    <Show when={canComplete()}>
                      <button class="btn btn-sm btn-primary" onClick={completeCookMeal}>✓ Complete</button>
                    </Show>
                    <Show when={cookPhase() === 'burned'}>
                      <button class="btn btn-sm cook-dispose-btn" onClick={disposeBurnedMeal}>🗑️ Dispose</button>
                    </Show>
                  </div>
                </div>

                {/* ── Stovetop ─────────────────────────────────────────── */}
                <div class="stove-view-wrap">
                  <div class="stove-surface">
                    <div class="stove-layout">
                      {/* Top — Fungi */}
                      <div class={`stove-ing-slot stove-slot-top slot-${slotState(BINS[3])}`}>
                        <Show when={slotState(BINS[3]) !== 'empty'}>
                          <span class="stove-ing-icon">{BINS[3].icon}</span>
                          <span class="stove-ing-label">{BINS[3].label}</span>
                        </Show>
                      </div>

                      {/* Left — Vegetables */}
                      <div class={`stove-ing-slot stove-slot-left slot-${slotState(BINS[0])}`}>
                        <Show when={slotState(BINS[0]) !== 'empty'}>
                          <span class="stove-ing-icon">{BINS[0].icon}</span>
                          <span class="stove-ing-label">{BINS[0].label}</span>
                        </Show>
                      </div>

                      {/* Centre — Burner + Pan */}
                      <div class="stove-burner" data-pan="true" style={burnerGlowStyle()}>
                        <div class="stove-burner-ring outer" style={{ 'border-color': burnerRingColor() }} />
                        <div class="stove-burner-ring inner" style={{ 'border-color': burnerRingColor() }} />
                        <div class={`stove-pan${cookPhase() === 'awaiting' ? ' pan-awaiting' : ''}${cookPhase() === 'burned' ? ' pan-burned' : ''}${panHovered() ? ' pan-hovered' : ''}`}>
                          <div class="stove-pan-contents">
                            <For each={addedIngredients()}>
                              {(cat) => <span class="stove-pan-ing">{BINS.find((b) => b.label === cat)?.icon}</span>}
                            </For>
                          </div>
                        </div>
                      </div>

                      {/* Right — Grains */}
                      <div class={`stove-ing-slot stove-slot-right slot-${slotState(BINS[1])}`}>
                        <Show when={slotState(BINS[1]) !== 'empty'}>
                          <span class="stove-ing-icon">{BINS[1].icon}</span>
                          <span class="stove-ing-label">{BINS[1].label}</span>
                        </Show>
                      </div>

                      {/* Bottom — Meats */}
                      <div class={`stove-ing-slot stove-slot-bot slot-${slotState(BINS[2])}`}>
                        <Show when={slotState(BINS[2]) !== 'empty'}>
                          <span class="stove-ing-icon">{BINS[2].icon}</span>
                          <span class="stove-ing-label">{BINS[2].label}</span>
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Heat bar */}
                <div class="cook-heat-wrap">
                  <div class="cook-heat-bar">
                    <div class="cook-heat-cover" style={{ width: `${Math.max(0, (1 - cookHeat() / 110) * 100)}%` }} />
                  </div>
                  <div class="cook-heat-legend">
                    <span>❄ Cold</span>
                    <span class="cook-legend-ready">Cooking</span>
                    <span class="cook-legend-burn">Burning</span>
                  </div>
                </div>

                {/* Feedback area — below the heat bar */}
                <div class="cook-feedback-area">
                  <Show when={cookFb()}>
                    {(fb) => <div class={`kitchen-feedback${fb().ok ? ' ok' : ' err'}`}>{fb().msg}</div>}
                  </Show>
                  <Show when={cookPhase() === 'awaiting' && !cookFb()}>
                    <div class="cook-prompt">
                      {BINS.find((b) => b.label === nextIngredient())?.icon} Add <strong>{nextIngredient()}</strong> to the pan!
                    </div>
                  </Show>
                  <Show when={cookPhase() === 'burned' && !cookFb()}>
                    <div class="cook-burned-msg">🔥 The meal is burned!</div>
                  </Show>
                </div>

              </Show>
            </Show>
          </div>
        </div>

        {/* ── Upgrades & stats ──────────────────────────────────────────── */}
        <div class="grid-2 mt-12" style={{ gap: '12px', 'align-items': 'flex-start' }}>
          <div>
            <div class="heading-font text-sm text-amber mb-8">Kitchen Upgrades</div>
            <Show when={nextUpgrade()}>
              {(up) => (
                <div class="upgrade-row">
                  <div class="upgrade-info">
                    <div class="upgrade-label">{up().label}</div>
                    <div class="upgrade-desc">{up().description}</div>
                  </div>
                  <button class="btn btn-sm btn-primary" onClick={tryUpgrade}>{up().cost}g</button>
                </div>
              )}
            </Show>
            <Show when={!nextUpgrade()}>
              <div class="text-dim text-sm italic">Kitchen fully upgraded.</div>
            </Show>
          </div>
          <div class="panel">
            <div class="heading-font text-sm text-amber mb-8">Daily Bonus</div>
            <div class="text-sm text-dim">Bonus income today: <span class="text-amber bold">{state.dailyBonusIncome}g</span></div>
            <div class="text-xs text-dim italic mt-4">Earned through chores. Collected at day end.</div>
          </div>
        </div>

        {/* ── Drag ghost (sort) ─────────────────────────────────────────── */}
        <Show when={ghostPos() && draggedItem()}>
          <Portal>
            <div class="drag-ghost" style={{ left: `${ghostPos()!.x}px`, top: `${ghostPos()!.y}px` }}>
              {draggedItem()!.icon}&nbsp;{draggedItem()!.name}
            </div>
          </Portal>
        </Show>

        {/* ── Drag ghost (cook) ─────────────────────────────────────────── */}
        <Show when={cookGhostPos() && cookDragCat()}>
          <Portal>
            <div class="drag-ghost" style={{ left: `${cookGhostPos()!.x}px`, top: `${cookGhostPos()!.y}px` }}>
              {BINS.find((b) => b.label === cookDragCat())?.icon}&nbsp;{cookDragCat()}
            </div>
          </Portal>
        </Show>
      </div>
    </div>
  );
}

