import type { JSX } from 'solid-js';
import { For, Show, createMemo } from 'solid-js';
import { state, navigateTo } from '../../state/store';
import { resolveChoice, recallParty, continueFromRest } from '../../systems/QuestSystem';
import { formatTime } from '../../utils/formatting';
import { CLASS_DEFS } from '../../data/heroData';
import { ABILITY_DEFS } from '../../data/abilityData';
import ThreeScene from './ThreeScene';

const ENV_LABEL: Record<string, string> = {
  dungeon: '🏰 Dungeon', forest: '🌲 Forest', cave: '⛏️ Cave',
  town: '🏘️ Town', quarry: '⛏️ Quarry', sewer: '🪣 Sewer', seaside: '⚓ Seaside',
};

const SCENE_HEIGHT = 'clamp(300px, 44dvh, 420px)';

export default function AdventureView(): JSX.Element {
  const party = createMemo(() =>
    state.parties.find((p) => p.id === state.activePartyId) ??
    state.parties.find((p) => p.status !== 'complete' && p.status !== 'wiped'),
  );

  return (
    <div class="room-view">

      {/* ── Standardised top bar ─────────────────────────────────────────── */}
      <div class="room-header">
        <span>⚔️</span>
        <span class="room-title">Adventure</span>
        <Show when={party()}>
          {(p) => (
            <>
              <span class="room-subtitle">{p().quest.name} · ⏱ {formatTime(p().timeElapsed)}</span>
              <span class={`party-status-badge status-${p().status}`}>
                {p().status.replace('_', ' ')}
              </span>
            </>
          )}
        </Show>
        <button class="btn btn-sm" style={{ 'margin-left': 'auto' }} onClick={() => navigateTo('hearth')}>
          ← Back
        </button>
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <div class="adventure-content">

        {/* Empty state */}
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
              {/* ── Isometric 3-D scene ──────────────────────────────────── */}
              <div class="adventure-scene-wrap">
                <ThreeScene party={p()} height={SCENE_HEIGHT} />

                {/* Env / floor label */}
                <div class="adventure-env-label">
                  {ENV_LABEL[p().quest.environment] ?? '🏰 Dungeon'}
                  &nbsp;·&nbsp;Floor {p().currentFloor}/{p().quest.totalFloors}
                </div>

                {/* Choice overlay (sits inside the scene frame) */}
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
              </div>

              {/* ── Info bar: portraits · initiative · actions ───────────── */}
              <div class="adventure-info-bar">

                {/* Hero portrait cards — centred, wrap on narrow screens */}
                <div class="adventure-portraits">
                  <For each={p().heroIds}>
                    {(hid) => {
                      const hero = createMemo(() => state.heroes.find((h) => h.id === hid));
                      if (!hero()) return null;
                      const def     = () => CLASS_DEFS[hero()!.heroClass];
                      const hpPct   = () => ((hero()?.hp ?? 0) / (hero()?.maxHp ?? 1)) * 100;
                      const mpPct   = () => (hero()?.maxMp ?? 0) > 0 ? ((hero()?.mp ?? 0) / (hero()?.maxMp ?? 1)) * 100 : 0;
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
                </div>

                {/* Inline initiative tracker — visible during combat */}
                <Show when={p().combatState}>
                  {(cs) => (
                    <div class="adventure-initiative">
                      <div class="combat-initiative">
                        <div class="heading-font text-xs text-amber" style={{ padding: '4px 8px 2px' }}>
                          Initiative · Round {cs().round}
                        </div>
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

                {/* Actions */}
                <div class="adventure-actions">
                  <Show when={p().status === 'resting'}>
                    <button class="btn btn-sm btn-success" onClick={() => continueFromRest(p().id)}>▶ Descend</button>
                  </Show>
                  <Show when={p().status === 'active' || p().status === 'resting'}>
                    <button class="btn btn-sm btn-danger" onClick={() => recallParty(p().id)}>🔙 Recall</button>
                  </Show>
                </div>

              </div>{/* /info-bar */}

              {/* ── Recent event log ─────────────────────────────────────── */}
              <div class="adventure-log-strip">
                <For each={p().eventLog.slice(-8)}>
                  {(msg) => <div class="log-entry adventure">{msg}</div>}
                </For>
              </div>

            </>
          )}
        </Show>

      </div>{/* /adventure-content */}
    </div>
  );
}
