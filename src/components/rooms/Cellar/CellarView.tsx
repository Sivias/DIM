import type { JSX } from 'solid-js';
import { For, Show, createSignal, createMemo } from 'solid-js';
import { state, addLog, addCellarItem, removeCellarItem, spendGold, upgradeRoom } from '../../../state/store';
import { POTION_RECIPES } from '../../../data/itemData';
import { makeItem } from '../../../systems/ItemSystem';
import { doChore } from '../../../systems/LaborSystem';
import { CELLAR_CAPACITY_BY_LEVEL, ROOM_DEFS } from '../../../data/roomData';
import { INN_CHORE_DONE } from '../../../data/eventTemplates';
import { pick } from '../../../utils/random';
import LaborSection from '../../shared/LaborSection';

export default function CellarView(): JSX.Element {
  const [sel1, setSel1] = createSignal<string | null>(null);
  const [sel2, setSel2] = createSignal<string | null>(null);
  const [brewMsg, setBrewMsg] = createSignal('');

  const capacity = createMemo(() => CELLAR_CAPACITY_BY_LEVEL[state.roomLevels.cellar] ?? 6);
  const ingredients = createMemo(() => state.cellarInventory.filter((i) => i.type === 'ingredient'));
  const potions     = createMemo(() => state.cellarInventory.filter((i) => i.type === 'potion'));
  const nextUpgrade = () => ROOM_DEFS.cellar.upgrades.find((u) => u.level === state.roomLevels.cellar + 1);

  const brew = () => {
    const id1 = sel1(), id2 = sel2();
    if (!id1 || !id2 || id1 === id2 || state.laborUsed >= state.laborMax) return;

    const ing1 = state.cellarInventory.find((i) => i.id === id1);
    const ing2 = state.cellarInventory.find((i) => i.id === id2);
    if (!ing1 || !ing2) return;

    const recipe = POTION_RECIPES.find(
      (r) =>
        (r.ingredients[0] === ing1.templateId && r.ingredients[1] === ing2.templateId) ||
        (r.ingredients[0] === ing2.templateId && r.ingredients[1] === ing1.templateId),
    );

    if (recipe && potions().length < capacity()) {
      const potion = makeItem(recipe.result);
      addCellarItem(potion);
      removeCellarItem(id1);
      removeCellarItem(id2);
      doChore('cellar_brew', 1, 0, pick(INN_CHORE_DONE.cellar_brew).replace('{ITEM}', potion.name));
      setBrewMsg(`✅ Brewed: ${potion.name}!`);
    } else if (!recipe) {
      setBrewMsg('❌ No known recipe for these two ingredients.');
      doChore('cellar_brew', 0, 0, 'The mixture fizzes and spits but produces nothing of value.');
    } else {
      setBrewMsg('❌ Cellar inventory full!');
    }

    setSel1(null);
    setSel2(null);
    setTimeout(() => setBrewMsg(''), 3000);
  };

  const tryUpgrade = () => {
    const up = nextUpgrade();
    if (!up || !spendGold(up.cost)) return;
    upgradeRoom('cellar');
    addLog(`Cellar upgraded to Level ${state.roomLevels.cellar}!`, 'cellar', true);
  };

  return (
    <div class="room-view">
      <div class="room-header">
        <span>⚗️</span>
        <span class="room-title">The Cellar</span>
        <span class="room-subtitle">Level {state.roomLevels.cellar} · {potions().length}/{capacity()} potions</span>
      </div>

      <div class="room-body">
        <LaborSection tasks={[{
          key: 'cellar_brew',
          icon: '⚗️',
          name: 'Brew a Potion',
          desc: 'Select two ingredients below, then brew. Quest returns provide ingredients.',
          bonus: '+potion',
          canAct: () => sel1() !== null && sel2() !== null && potions().length < capacity(),
          hint: sel1() && sel2() ? 'Cellar is full.' : 'Select two ingredients below first.',
          action: brew,
        }]} />

        <div class="grid-2" style={{ gap: '16px', 'align-items': 'flex-start' }}>
          {/* Brewing area */}
          <div class="minigame-container">
            <div class="minigame-title">🔬 Alchemy Lab</div>
            <p class="text-sm text-dim italic mb-8">Select two ingredients, then brew. Uses 1 labor. Quest returns provide ingredients.</p>

            <div class="cellar-grid">
              <div>
                <div class="heading-font text-xs text-amber mb-4">Ingredients ({ingredients().length})</div>
                <div class="ingredient-shelf">
                  <Show when={ingredients().length === 0}>
                    <span class="text-dim text-xs italic">Send parties on quests to gather ingredients.</span>
                  </Show>
                  <For each={ingredients()}>
                    {(ing) => {
                      const isSelected = () => sel1() === ing.id || sel2() === ing.id;
                      const toggle = () => {
                        if (sel1() === ing.id) { setSel1(null); return; }
                        if (sel2() === ing.id) { setSel2(null); return; }
                        if (!sel1()) { setSel1(ing.id); return; }
                        if (!sel2()) { setSel2(ing.id); return; }
                        setSel1(ing.id);
                      };
                      return (
                        <div class={`ingredient-chip${isSelected() ? ' selected' : ''}`} onClick={toggle}>
                          <span>{ing.icon}</span>
                          <span>{ing.name}</span>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>

              <div>
                <div class="heading-font text-xs text-amber mb-4">Known Recipes</div>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                  <For each={POTION_RECIPES}>
                    {(r) => (
                      <div class="text-xs text-dim" style={{ padding: '3px 6px', background: 'rgba(255,255,255,.03)', 'border-radius': '3px' }}>
                        {r.ingredients[0]} + {r.ingredients[1]} → {r.result.replace('_', ' ')}
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-8 mt-12">
              <span class="text-xs text-dim">
                {sel1() ? state.cellarInventory.find(i => i.id === sel1())?.name : '—'}
                {' + '}
                {sel2() ? state.cellarInventory.find(i => i.id === sel2())?.name : '—'}
              </span>
            </div>

            <Show when={brewMsg()}>
              <div class="mt-8 text-sm" style={{ color: brewMsg().startsWith('✅') ? 'var(--green-light)' : 'var(--red-light)' }}>
                {brewMsg()}
              </div>
            </Show>
          </div>

          <div>
            {/* Potion inventory */}
            <div class="panel mb-12">
              <div class="heading-font text-xs text-amber mb-8">Potions ({potions().length}/{capacity()})</div>
              <Show when={potions().length === 0}>
                <div class="text-dim text-xs italic">No potions brewed yet.</div>
              </Show>
              <div class="flex gap-4 flex-wrap">
                <For each={potions()}>
                  {(p) => (
                    <div class="ingredient-chip" title={p.description} style={{ cursor: 'default' }}>
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Upgrade */}
            <div class="heading-font text-sm text-amber mb-8">Upgrades</div>
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
          </div>
        </div>
      </div>
    </div>
  );
}





