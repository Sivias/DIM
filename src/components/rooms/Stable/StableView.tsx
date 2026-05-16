import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import { state, addLog, spendGold, upgradeRoom } from '../../../state/store';
import { doChore } from '../../../systems/LaborSystem';
import { ROOM_DEFS } from '../../../data/roomData';
import { INN_CHORE_DONE } from '../../../data/eventTemplates';
import { pick } from '../../../utils/random';
import LaborSection from '../../shared/LaborSection';
import type { LaborTask } from '../../shared/LaborSection';

const STABLE_TASKS: LaborTask[] = [
  { key: 'stable_hay',   icon: '🌾', name: 'Shovel Hay',      desc: 'Clear old hay and spread fresh bales.',       bonus: '+6g', action: () => doChore('stable_hay',   1, 6, pick(INN_CHORE_DONE.stable_hay   ?? ['Hay shovelled.'])) },
  { key: 'stable_feed',  icon: '🪣', name: 'Fill the Trough',  desc: 'Water and oats for every horse.',             bonus: '+5g', action: () => doChore('stable_feed',  1, 5, pick(INN_CHORE_DONE.stable_feed  ?? ['Trough filled.'])) },
  { key: 'stable_groom', icon: '🐴', name: 'Groom the Horses', desc: 'Brush each horse until their coat gleams.',  bonus: '+7g', action: () => doChore('stable_groom', 1, 7, pick(INN_CHORE_DONE.stable_groom ?? ['Horses groomed.'])) },
];

export default function StableView(): JSX.Element {
  const nextUpgrade = () => ROOM_DEFS.stable.upgrades.find((u) => u.level === state.roomLevels.stable + 1);

  const tryUpgrade = () => {
    const up = nextUpgrade();
    if (!up || !spendGold(up.cost)) return;
    upgradeRoom('stable');
    addLog(`Stable upgraded to Level ${state.roomLevels.stable}!`, 'stable', true);
  };

  return (
    <div class="room-view">
      <div class="room-header">
        <span>🐴</span>
        <span class="room-title">The Stable</span>
        <span class="room-subtitle">Level {state.roomLevels.stable}</span>
      </div>

      <div class="room-body">
        <LaborSection tasks={STABLE_TASKS} />

        <div class="grid-2" style={{ gap: '16px', 'align-items': 'flex-start' }}>
          <div class="panel">
            <div class="heading-font text-xs text-amber mb-8">Effect</div>
            <div class="text-sm text-dim">Bonus income today: <span class="text-amber bold">{state.dailyBonusIncome}g</span></div>
            <div class="text-xs text-dim italic mt-4">
              Level {state.roomLevels.stable} stable — heroes have a{' '}
              {state.roomLevels.stable === 1 ? '15%' : state.roomLevels.stable === 2 ? '35%' : '55%'} chance to arrive equipped.
            </div>
          </div>

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
            <Show when={!nextUpgrade()}>
              <div class="text-dim text-sm italic">Stable fully upgraded.</div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}
