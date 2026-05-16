import type { JSX } from 'solid-js';
import { For, Show, createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import { state, addLog, spendGold } from '../../../state/store';
import { doChore } from '../../../systems/LaborSystem';
import { upgradeRoom } from '../../../state/store';
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

  // ── Cook minigame state ───────────────────────────────────────────────────
  const [cookQueue, setCookQueue] = createSignal<Recipe[]>(randomRecipes());
  const [cookSel, setCookSel]     = createSignal<string[]>([]);
  const [cookFb, setCookFb]       = createSignal<{ msg: string; ok: boolean } | null>(null);
  let cookFbTimer: ReturnType<typeof setTimeout>;

  const activeRecipe = () => cookQueue()[0] ?? null;
  const allCooked    = () => cookQueue().length === 0;

  const showCookFb = (msg: string, ok: boolean) => {
    clearTimeout(cookFbTimer);
    setCookFb({ msg, ok });
    cookFbTimer = setTimeout(() => setCookFb(null), 1800);
  };

  const toggleIngredient = (cat: string) => {
    const recipe = activeRecipe();
    if (!recipe) return;
    if (!recipe.categories.includes(cat)) {
      showCookFb(`✗ ${cat} isn't in this recipe`, false);
      setCookSel([]);
      return;
    }
    const next = cookSel().includes(cat)
      ? cookSel().filter((c) => c !== cat)
      : [...cookSel(), cat];
    setCookSel(next);
    if (next.length === recipe.categories.length) {
      showCookFb(`✓ ${recipe.name} cooked!`, true);
      setCookQueue((q) => q.slice(1));
      setCookSel([]);
    }
  };

  // ── Pointer handlers (sort drag) ─────────────────────────────────────────
  const onItemPointerDown = (e: PointerEvent, id: string) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragId(id);
    setGhostPos({ x: e.clientX, y: e.clientY });
  };

  const onContainerPointerMove = (e: PointerEvent) => {
    if (!dragId()) return;
    setGhostPos({ x: e.clientX, y: e.clientY });
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const binEl = el?.closest('[data-bin]') as HTMLElement | null;
    setHoveredBin(binEl?.dataset?.bin ?? null);
  };

  const onContainerPointerUp = (_e: PointerEvent) => {
    const id  = dragId();
    const bin = hoveredBin();
    if (id && bin) dropInto(id, bin);
    setDragId(null);
    setGhostPos(null);
    setHoveredBin(null);
  };

  // ── Drop logic ───────────────────────────────────────────────────────────
  const dropInto = (itemId: string, binLabel: string) => {
    const item = gameItems().find((i) => i.id === itemId);
    if (!item) return;
    const ok = item.category === binLabel;
    if (ok) {
      setGameItems((prev) => prev.filter((i) => i.id !== itemId));
      setSorted((n) => n + 1);
      showFeedback(`✓ ${item.name.split('_')[0]} sorted!`, true);
    } else {
      showFeedback(`✗ ${item.name} → ${item.category}`, false);
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
    if (state.laborUsed >= state.laborMax) { addLog('No labor remaining — rest first.', 'kitchen'); return; }
    doChore('kitchen_sort', 1, 15, pick(INN_CHORE_DONE.kitchen_sort));
    setGameItems(randomItems());
    setSorted(0);
    setFeedback(null);
  };

  const completeCook = () => {
    doChore('kitchen_cook', 1, 20, pick(INN_CHORE_DONE.kitchen_cook ?? ['The kitchen smells wonderful.']));
    setCookQueue(randomRecipes());
    setCookSel([]);
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
            action: () => doChore('kitchen_unload', 1, 0, pick(INN_CHORE_DONE.kitchen_unload ?? ['Provisions unloaded.'])),
          },
          {
            key:    'kitchen_sort',
            icon:   '🍽️',
            name:   'Sort the Provisions',
            desc:   'Sort all 8 provisions into their bins, then collect the bonus.',
            bonus:  '+15g',
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
                      <span>{item.name.replace(/_\d+$/, '')}</span>
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

          {/* ── Cook minigame ────────────────────────────────────────────── */}
          <div class="minigame-container">
            <div class="minigame-title">🍲 Cook the Meals</div>

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
                <p class="text-sm text-dim italic mb-8">Select the right ingredient categories for the recipe.</p>

                {/* Active recipe card */}
                <div class="cook-recipe-card">
                  <div class="cook-recipe-header">
                    <span class="cook-recipe-icon">{activeRecipe()!.icon}</span>
                    <span class="cook-recipe-name">{activeRecipe()!.name}</span>
                  </div>
                  <div class="cook-recipe-needs">
                    <For each={activeRecipe()!.categories}>
                      {(cat) => (
                        <span class={`ingredient-chip${cookSel().includes(cat) ? ' selected' : ''}`}>
                          {BINS.find((b) => b.label === cat)?.icon} {cat}
                        </span>
                      )}
                    </For>
                  </div>
                </div>

                {/* Ingredient selector */}
                <div class="cook-ingredient-btns">
                  <For each={BINS}>
                    {(bin) => (
                      <button
                        class={`ingredient-chip${cookSel().includes(bin.label) ? ' selected' : ''}`}
                        onClick={() => toggleIngredient(bin.label)}
                      >
                        {bin.icon} {bin.label}
                      </button>
                    )}
                  </For>
                </div>

                <Show when={cookFb()}>
                  {(fb) => <div class={`kitchen-feedback${fb().ok ? ' ok' : ' err'}`}>{fb().msg}</div>}
                </Show>
              </Show>

              <div class="text-sm text-dim mt-8">Cooked: <strong class="text-amber">{3 - cookQueue().length}</strong>/3</div>
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

        {/* ── Drag ghost ────────────────────────────────────────────────── */}
        <Show when={ghostPos() && draggedItem()}>
          <Portal>
            <div class="drag-ghost" style={{ left: `${ghostPos()!.x}px`, top: `${ghostPos()!.y}px` }}>
              {draggedItem()!.icon}&nbsp;{draggedItem()!.name.replace(/_\d+$/, '')}
            </div>
          </Portal>
        </Show>
      </div>
    </div>
  );
}

