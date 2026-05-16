import type { JSX } from 'solid-js';
import { For, Show, createMemo } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { state, addHero, addLog, setHeroPool, spendGold } from '../../../state/store';
import { MAX_HEROES_BY_LEVEL, ROOM_DEFS } from '../../../data/roomData';
import { CLASS_DEFS } from '../../../data/heroData';
import { doChore } from '../../../systems/LaborSystem';
import { upgradeRoom } from '../../../state/store';
import { INN_CHORE_DONE } from '../../../data/eventTemplates';
import { pick } from '../../../utils/random';
import LaborSection from '../../shared/LaborSection';

export default function BarView(): JSX.Element {
  const maxHeroes   = createMemo(() => MAX_HEROES_BY_LEVEL[state.roomLevels.guestRooms] ?? 4);
  const canHire     = createMemo(() => state.heroes.length < maxHeroes());
  const nextUpgrade = createMemo(() => ROOM_DEFS.bar.upgrades.find((u) => u.level === state.roomLevels.bar + 1));

  const hire = (heroId: string) => {
    // Re-fetch from the live pool by ID — avoids stale index-proxy captures from For
    const hero = state.heroPool.find((h) => h.id === heroId);
    if (!hero) return;
    if (!canHire()) { addLog('No room! Upgrade the Guest Rooms to hire more heroes.', 'bar'); return; }
    // unwrap() strips the SolidJS store proxy so we store a plain JS object
    const plain = JSON.parse(JSON.stringify(unwrap(hero)));
    addHero({ ...plain, hireDay: state.day, status: 'available' });
    setHeroPool(state.heroPool.filter((h) => h.id !== heroId));
    addLog(`${hero.name} the ${CLASS_DEFS[hero.heroClass].label} joins the inn!`, 'bar', true);
  };

  const barTasks = () => [
    { key: 'bar_clean', icon: '🧹', name: 'Scrub the Bar',   desc: 'Polish the counter until it gleams.',        bonus: '+5g', action: () => doChore('bar_clean', 1, 5, pick(INN_CHORE_DONE.bar_clean ?? ['The bar is cleaned.'])) },
    { key: 'bar_keg',   icon: '🛢️', name: 'Tap a Fresh Keg', desc: 'A new barrel means fresh business.',         bonus: '+5g', action: () => doChore('bar_keg',   1, 5, pick(INN_CHORE_DONE.bar_keg   ?? ['A fresh keg is tapped.'])) },
    { key: 'bar_sweep', icon: '🧺', name: 'Sweep the Floor', desc: 'Clear the debris and suspicious stains.',    bonus: '+5g', action: () => doChore('bar_sweep', 1, 5, pick(INN_CHORE_DONE.bar_sweep ?? ['The floor is swept.'])) },
  ];

  const tryUpgrade = () => {
    const up = nextUpgrade();
    if (!up || !spendGold(up.cost)) { addLog(`Need ${up?.cost}g to upgrade the Bar.`, 'bar'); return; }
    upgradeRoom('bar');
    addLog(`The Bar has been upgraded! (Level ${state.roomLevels.bar})`, 'bar', true);
  };

  return (
    <div class="room-view">
      <div class="room-header">
        <span>🍺</span>
        <span class="room-title">The Bar</span>
        <span class="room-subtitle">Level {state.roomLevels.bar} · {state.heroes.length}/{maxHeroes()} rooms filled</span>
      </div>

      <div class="room-body">
        <LaborSection tasks={barTasks()} />

        <div class="grid-2" style={{ gap: '16px', 'align-items': 'flex-start' }}>
          {/* Hero pool — full list */}
          <div>
            <div class="flex items-center justify-between mb-8">
              <div class="heading-font text-sm text-amber">Adventurers ({state.heroPool.length}/{maxHeroes()} beds)</div>
            </div>
            <Show when={state.heroPool.length === 0}>
              <div class="empty-state"><span class="empty-state-icon">🍺</span><span class="empty-state-small">No adventurers tonight. Refresh or end the day.</span></div>
            </Show>
            <div class="hire-list">
              <For each={state.heroPool}>
                {(hero) => {
                  const alreadyHired = () => state.heroes.some((h) => h.id === hero.id);
                  const cls = CLASS_DEFS[hero.heroClass];
                  return (
                    <div class={`hire-row${alreadyHired() ? ' already-hired' : ''}`}>
                      {/* Portrait */}
                      <div class="hire-portrait">{cls?.icon ?? '⚔️'}</div>

                      {/* Identity */}
                      <div class="hire-identity">
                        <div class="hero-name">{hero.name}</div>
                        <div class="hero-class-label">{cls?.label ?? hero.heroClass}</div>
                      </div>

                      {/* Stats inline */}
                      <div class="hire-stats">
                        {(['strength','intelligence','wisdom','agility','charisma'] as const).map((k) => (
                          <div class="hire-stat">
                            <span class="hire-stat-abbr">{k.slice(0,3).toUpperCase()}</span>
                            <span class="hire-stat-val">{hero.stats[k]}</span>
                          </div>
                        ))}
                      </div>

                      {/* Hire button — always visible, floats right */}
                      <button
                        class="btn btn-success btn-sm hire-btn"
                        disabled={alreadyHired() || !canHire()}
                        title={alreadyHired() ? 'Already hired' : !canHire() ? 'No rooms available' : `Hire ${hero.name}`}
                        onClick={(e) => { e.stopPropagation(); hire(hero.id); }}
                      >
                        {alreadyHired() ? '✓' : '+ Hire'}
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>

          {/* Upgrades */}
          <div>
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
            <Show when={!nextUpgrade()}><div class="text-dim text-sm italic">Bar is fully upgraded.</div></Show>
          </div>
        </div>
      </div>
    </div>
  );
}





