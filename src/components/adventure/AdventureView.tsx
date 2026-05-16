import type { JSX } from 'solid-js';
import { For, Show, onMount, onCleanup, createMemo } from 'solid-js';
import { state, navigateTo } from '../../state/store';
import { resolveChoice, recallParty, continueFromRest } from '../../systems/QuestSystem';
import { formatTime } from '../../utils/formatting';
import { CLASS_DEFS } from '../../data/heroData';
import { ABILITY_DEFS } from '../../data/abilityData';
import type { Party } from '../../data/types';

// ─── Simple CSS-based adventure scene renderer ────────────────────────────────
const ENV_BG: Record<string, { bg: string; floor: string; label: string }> = {
  dungeon: { bg: 'linear-gradient(180deg,#0a0810 0%,#1a1428 50%,#120f1a 100%)', floor: '#2a2030', label: '🏰 Dungeon' },
  forest:  { bg: 'linear-gradient(180deg,#041208 0%,#0a2010 60%,#061510 100%)', floor: '#1a3015', label: '🌲 Forest' },
  cave:    { bg: 'linear-gradient(180deg,#080808 0%,#151010 60%,#0a0a08 100%)',  floor: '#282018', label: '⛏️ Cave' },
  town:    { bg: 'linear-gradient(180deg,#080c18 0%,#101828 60%,#080c14 100%)',  floor: '#1a1a28', label: '🏘️ Town' },
  quarry:  { bg: 'linear-gradient(180deg,#101008 0%,#201c10 50%,#181408 100%)', floor: '#2a2810', label: '⛏️ Quarry' },
  sewer:   { bg: 'linear-gradient(180deg,#08100a 0%,#101808 60%,#081008 100%)', floor: '#141c10', label: '🪣 Sewer' },
  seaside: { bg: 'linear-gradient(180deg,#081018 0%,#0a1828 50%,#061014 100%)', floor: '#0c1820', label: '⚓ Seaside' },
};

function AdventureScene(props: { party: Party }): JSX.Element {
  const env = createMemo(() => ENV_BG[props.party.quest.environment] ?? ENV_BG.dungeon);
  const heroes = createMemo(() =>
    props.party.heroIds
      .map((id) => state.heroes.find((h) => h.id === id))
      .filter(Boolean) as typeof state.heroes,
  );
  const enemies = createMemo(() =>
    props.party.combatState?.combatants.filter((c) => c.type === 'enemy') ?? [],
  );

  return (
    <div style={{
      flex: '1',
      position: 'relative',
      background: env().bg,
      'min-height': '180px',
      overflow: 'hidden',
      display: 'flex',
      'align-items': 'flex-end',
      'padding-bottom': '20px',
    }}>
      {/* Environment label */}
      <div style={{ position: 'absolute', top: '8px', left: '12px', 'font-family': 'var(--font-heading)', 'font-size': '.75rem', color: 'rgba(255,255,255,.5)' }}>
        {env().label} · Floor {props.party.currentFloor}/{props.party.quest.totalFloors}
      </div>

      {/* Torch lights */}
      <div style={{ position: 'absolute', top: '12px', left: '8%', 'font-size': '1.2rem', animation: 'flicker 3s infinite alternate' }}>🕯️</div>
      <div style={{ position: 'absolute', top: '12px', right: '8%', 'font-size': '1.2rem', animation: 'flicker 2.5s infinite alternate' }}>🕯️</div>

      {/* Floor */}
      <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', height: '24px', background: env().floor, 'border-top': '1px solid rgba(255,255,255,.05)' }} />

      {/* Heroes */}
      <div style={{ display: 'flex', gap: '20px', 'padding-left': '10%', 'align-items': 'flex-end', 'z-index': '2', position: 'relative' }}>
        <For each={heroes()}>
          {(hero) => {
            const def = CLASS_DEFS[hero.heroClass];
            const hpPct = () => (hero.hp / hero.maxHp) * 100;
            const isActive = () =>
              props.party.combatState?.combatants[props.party.combatState.currentTurnIndex]?.id === hero.id;
            return (
              <div class={`entity-sprite${isActive() ? ' attacking' : ''}`}>
                <div class="entity-hp-mini">
                  <div class="entity-hp-mini-fill" style={{ width: `${hpPct()}%` }} />
                </div>
                <span class="entity-sprite-icon" style={{ color: hero.portrait, 'text-shadow': `0 0 8px ${hero.portrait}` }}>
                  {def.icon}
                </span>
              </div>
            );
          }}
        </For>
      </div>

      {/* vs divider during combat */}
      <Show when={enemies().length > 0}>
        <div style={{ position: 'absolute', left: '50%', bottom: '24px', transform: 'translateX(-50%)', 'font-family': 'var(--font-heading)', 'font-size': '.7rem', color: 'rgba(200,50,50,.7)', 'letter-spacing': '.1em' }}>VS</div>
      </Show>

      {/* Enemies */}
      <Show when={enemies().length > 0}>
        <div style={{ display: 'flex', gap: '18px', 'padding-right': '10%', 'align-items': 'flex-end', 'margin-left': 'auto', 'z-index': '2', position: 'relative' }}>
          <For each={enemies()}>
            {(e) => {
              const isActive = () =>
                props.party.combatState?.combatants[props.party.combatState.currentTurnIndex]?.id === e.id;
              const hpPct = () => (e.hp / e.maxHp) * 100;
              return (
                <div class={`entity-sprite${isActive() ? ' attacking' : ''}${e.hp <= 0 ? ' dead' : ''}`}
                  style={{ transform: 'scaleX(-1)' }}>
                  <div class="entity-hp-mini">
                    <div class="entity-hp-mini-fill" style={{ width: `${hpPct()}%`, background: 'var(--red-light)' }} />
                  </div>
                  <span class="entity-sprite-icon">{e.name.includes('Dragon') ? '🐲' : e.name.includes('Goblin') ? '👺' : e.name.includes('Troll') ? '🧌' : e.name.includes('Skeleton') ? '💀' : e.name.includes('Slime') ? '🫧' : e.name.includes('Orc') ? '👹' : e.name.includes('Wolf') ? '🐺' : e.name.includes('Lich') ? '☠️' : e.name.includes('Golem') ? '🗿' : e.name.includes('Mage') ? '🧙' : e.name.includes('Bandit') ? '🦹' : '👾'}</span>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}

export default function AdventureView(): JSX.Element {
  const party = createMemo(() =>
    state.parties.find((p) => p.id === state.activePartyId) ??
    state.parties.find((p) => p.status !== 'complete' && p.status !== 'wiped'),
  );

  return (
    <div class="adventure-view">
      <div class="room-header">
        <span>⚔️</span>
        <span class="room-title">Adventure</span>
        <Show when={party()}>
          {(p) => (
            <>
              <span class="room-subtitle">{p().quest.name} · ⏱ {formatTime(p().timeElapsed)}</span>
              <span class={`party-status-badge status-${p().status}`} style={{ 'margin-left': '8px' }}>{p().status.replace('_', ' ')}</span>
            </>
          )}
        </Show>
        <button class="btn btn-sm" style={{ 'margin-left': 'auto' }} onClick={() => navigateTo('hearth')}>← Hearth</button>
      </div>

      <Show when={!party()}>
        <div class="empty-state" style={{ 'margin-top': '60px' }}>
          <span class="empty-state-icon">⚔️</span>
          <span class="empty-state-text">No active parties</span>
          <span class="empty-state-small">Assign a party to a quest at the Hearth.</span>
          <button class="btn btn-primary mt-12" onClick={() => navigateTo('hearth')}>Go to Hearth</button>
        </div>
      </Show>

      <Show when={party()}>
        {(p) => (
          <>
            <AdventureScene party={p()} />

            {/* Choice overlay */}
            <Show when={p().awaitingChoice}>
              {(choice) => (
                <div class="choice-overlay">
                  <div class="choice-box">
                    <div class="choice-prompt">{choice().prompt}</div>
                    <div class="choice-options">
                      <For each={choice().options}>
                        {(opt, i) => (
                          <div class="choice-option" onClick={() => resolveChoice(p().id, i())}>
                            <div class="choice-option-label">{opt.label}</div>
                            <div class="choice-option-desc">{opt.description}</div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </div>
              )}
            </Show>

            {/* Combat initiative */}
            <Show when={p().combatState}>
              {(cs) => (
                <div style={{ position: 'absolute', top: '44px', right: '8px', background: 'rgba(10,8,4,.85)', border: '1px solid var(--border)', 'border-radius': '5px', 'font-size': '.75rem', 'max-height': '160px', 'overflow-y': 'auto', 'z-index': '5' }}>
                  <div class="combat-initiative">
                    <div class="heading-font text-xs text-amber" style={{ 'padding': '2px 7px' }}>Initiative · Round {cs().round}</div>
                    <For each={cs().combatants}>
                      {(c, i) => (
                        <div class={`initiative-row${i() === cs().currentTurnIndex ? ' active' : ''}`}>
                          <span class="init-icon">{c.type === 'hero' ? '⚔️' : '👾'}</span>
                          <span class="init-name">{c.name}</span>
                          <span class="init-roll">{c.initiative}</span>
                          <span style={{ 'font-size': '.68rem', color: c.hp > c.maxHp * 0.5 ? 'var(--green-light)' : 'var(--red-light)' }}>
                            {c.hp}/{c.maxHp}
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </Show>

            {/* Party portraits */}
            <div class="adventure-portraits">
              <For each={p().heroIds}>
                {(hid) => {
                  const hero = createMemo(() => state.heroes.find((h) => h.id === hid));
                  if (!hero()) return null;
                  const def = () => CLASS_DEFS[hero()!.heroClass];
                  const hpPct = () => ((hero()?.hp ?? 0) / (hero()?.maxHp ?? 1)) * 100;
                  const mpPct = () => (hero()?.maxMp ?? 0) > 0 ? ((hero()?.mp ?? 0) / (hero()?.maxMp ?? 1)) * 100 : 0;
                  const hpClass = () => hpPct() > 60 ? 'good' : hpPct() > 25 ? 'medium' : '';
                  return (
                    <div class="portrait-card">
                      <div class="portrait-icon" style={{ background: `${hero()?.portrait}22` }}>
                        {def().icon}
                      </div>
                      <div class="portrait-name">{hero()?.name.split(' ')[0]}</div>
                      <div class="hp-bar" style={{ width: '72px' }}>
                        <div class={`hp-fill ${hpClass()}`} style={{ width: `${hpPct()}%` }} />
                      </div>
                      <Show when={(hero()?.maxMp ?? 0) > 0}>
                        <div class="mp-bar" style={{ width: '72px' }}>
                          <div class="mp-fill" style={{ width: `${mpPct()}%` }} />
                        </div>
                      </Show>
                      <div style={{ display: 'flex', gap: '3px', 'flex-wrap': 'wrap', 'justify-content': 'center', 'margin-top': '2px' }}>
                        <For each={hero()?.abilities ?? []}>
                          {(abilId) => {
                            const abil = ABILITY_DEFS[abilId];
                            if (!abil) return null;
                            return (
                              <button
                                class="portrait-ability-btn"
                                title={`${abil.name}: ${abil.description}`}
                                disabled={p().status !== 'in_combat' || (hero()?.mp ?? 0) < abil.mpCost}
                              >
                                {abil.icon}
                              </button>
                            );
                          }}
                        </For>
                      </div>
                    </div>
                  );
                }}
              </For>

              {/* Actions */}
              <div style={{ 'margin-left': 'auto', display: 'flex', 'flex-direction': 'column', gap: '5px', 'justify-content': 'center' }}>
                <Show when={p().status === 'resting'}>
                  <button class="btn btn-sm btn-success" onClick={() => continueFromRest(p().id)}>▶ Descend</button>
                </Show>
                <Show when={p().status === 'active' || p().status === 'resting'}>
                  <button class="btn btn-sm btn-danger" onClick={() => recallParty(p().id)}>🔙 Recall</button>
                </Show>
              </div>
            </div>

            {/* Recent log */}
            <div style={{ 'max-height': '80px', 'overflow-y': 'auto', padding: '6px 14px', background: 'rgba(0,0,0,.5)', 'border-top': '1px solid var(--border)', 'flex-shrink': '0' }}>
              <For each={p().eventLog.slice(-6)}>
                {(msg) => <div class="log-entry adventure">{msg}</div>}
              </For>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}

