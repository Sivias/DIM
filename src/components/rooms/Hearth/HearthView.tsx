import type { JSX } from 'solid-js';
import { For, Show, createSignal, createMemo } from 'solid-js';
import { state, navigateTo, addLog } from '../../../state/store';import { startParty, recallParty, continueFromRest, getAvailableQuests } from '../../../systems/QuestSystem';
import { formatTime } from '../../../utils/formatting';
import type { Quest } from '../../../data/types';
import HeroCard from '../../shared/HeroCard';

export default function HearthView(): JSX.Element {
  const [selectedHeroIds, setSelectedHeroIds] = createSignal<string[]>([]);
  const [selectedQuest, setSelectedQuest]     = createSignal<Quest | null>(null);

  const availableQuests = createMemo(() => getAvailableQuests(state.roomLevels.hearth));
  const availableHeroes = createMemo(() => state.heroes.filter((h) => h.status === 'available'));
  const maxParties      = createMemo(() => state.roomLevels.hearth >= 3 ? 3 : state.roomLevels.hearth >= 2 ? 2 : 1);
  const activeParties   = createMemo(() => state.parties.filter((p) => p.status !== 'complete' && p.status !== 'wiped'));

  const toggleHero = (id: string) =>
    setSelectedHeroIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < 4 ? [...ids, id] : ids,
    );

  const sendParty = () => {
    const q = selectedQuest(), ids = selectedHeroIds();
    if (!q || ids.length === 0) return;
    if (activeParties().length >= maxParties()) {
      addLog('The hearth is full — no more parties can depart!', 'hearth');
      return;
    }
    startParty(ids, q);
    setSelectedHeroIds([]);
    setSelectedQuest(null);
  };

  const statusBadge = (status: string) => (
    <span class={`party-status-badge status-${status}`}>{status.replace('_', ' ')}</span>
  );

  return (
    <div class="room-view">
      <div class="room-header">
        <span>🔥</span>
        <span class="room-title">The Hearth</span>
        <span class="room-subtitle">Level {state.roomLevels.hearth} · {activeParties().length}/{maxParties()} parties</span>
      </div>

      <div class="room-body">
        {/* ── Active parties (always shown, compact when empty) ─────────── */}
        <Show when={activeParties().length > 0}>
          <div class="hearth-section-title">Active Parties</div>
          <div class="party-cards mb-12">
            <For each={activeParties()}>
              {(party) => (
                <div class="party-card">
                  <div class="party-card-header">
                    <span class="heading-font text-sm text-amber">{party.quest.name}</span>
                    {statusBadge(party.status)}
                    <span class="text-xs text-dim" style={{ 'margin-left': 'auto' }}>⏱ {formatTime(party.timeElapsed)}</span>
                  </div>
                  <div class="party-progress">
                    <div class="party-progress-fill" style={{ width: `${party.floorProgress * 100}%` }} />
                  </div>
                  <div class="mini-hero-row mb-8">
                    <For each={party.heroIds}>
                      {(hid) => {
                        const h = state.heroes.find((x) => x.id === hid);
                        return h ? <div class="mini-hero">{h.name.split(' ')[0]} ❤️{h.hp}</div> : null;
                      }}
                    </For>
                  </div>
                  <div class="flex gap-8 flex-wrap">
                    <button class="btn btn-sm btn-teal" onClick={() => navigateTo('adventure', party.id)}>⚔️ Watch</button>
                    <Show when={party.status === 'resting'}>
                      <button class="btn btn-sm btn-success" onClick={() => continueFromRest(party.id)}>▶ Continue Deeper</button>
                    </Show>
                    <Show when={party.status === 'waiting_choice'}>
                      <button class="btn btn-sm" style={{ 'border-color': '#cc9900', color: '#ffcc44' }}
                        onClick={() => navigateTo('adventure', party.id)}>❓ Decision Needed!</button>
                    </Show>
                    <Show when={party.status === 'active' || party.status === 'resting'}>
                      <button class="btn btn-sm btn-danger" onClick={() => recallParty(party.id)}>🔙 Recall</button>
                    </Show>
                  </div>
                  <Show when={party.eventLog.length > 0}>
                    <div class="mt-8 text-xs italic text-dim" style={{ 'border-left': '2px solid var(--stone2)', 'padding-left': '6px' }}>
                      {party.eventLog[party.eventLog.length - 1]}
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
          <div class="divider mb-12" />
        </Show>

        {/* ── Quest board + hero assignment (always visible) ────────────── */}
        <div class="hearth-section-title">
          Send a Party
          <Show when={activeParties().length >= maxParties()}>
            <span class="text-xs text-dim italic" style={{ 'margin-left': '8px', 'font-family': 'var(--font-b)' }}>
              (hearth full)
            </span>
          </Show>
        </div>

        <div class="hearth-layout">
          {/* Quest list */}
          <div class="hearth-quests">
            <div class="heading-font text-xs text-dim mb-6" style={{ 'letter-spacing': '.06em', 'text-transform': 'uppercase' }}>
              Available Quests
            </div>
            <div class="quest-list">
              <For each={availableQuests()}>
                {(quest) => (
                  <div
                    class={`quest-card${selectedQuest()?.id === quest.id ? ' selected' : ''}`}
                    onClick={() => setSelectedQuest((q) => q?.id === quest.id ? null : quest)}
                  >
                    <div class="quest-name">{quest.name}</div>
                    <div class="quest-env">📍 {quest.environment}</div>
                    <div class="quest-desc">{quest.description}</div>
                    <div class="quest-meta">
                      <span>💰 {quest.goldReward}g</span>
                      <span>✨ {quest.xpReward} xp</span>
                      <span>🗺 {quest.totalFloors} floor(s)</span>
                      <span class="difficulty-dots">
                        <For each={[1,2,3,4,5]}>
                          {(n) => <span class={`difficulty-dot${n <= quest.difficulty ? ' filled' : ''}`} />}
                        </For>
                      </span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Hero assignment + depart */}
          <div class="hearth-heroes">
            <div class="heading-font text-xs text-dim mb-6" style={{ 'letter-spacing': '.06em', 'text-transform': 'uppercase' }}>
              Assign Heroes ({selectedHeroIds().length}/4)
            </div>
            <Show when={availableHeroes().length === 0}>
              <div class="empty-state" style={{ padding: '16px 0' }}>
                <span class="empty-state-icon">🛏️</span>
                <span class="empty-state-small">
                  No heroes available —{' '}
                  <span class="text-link" onClick={() => navigateTo('bar')}>visit the Bar</span>.
                </span>
              </div>
            </Show>
            <div class="hearth-hero-list">
              <For each={availableHeroes()}>
                {(hero) => (
                  <HeroCard
                    hero={hero}
                    selected={selectedHeroIds().includes(hero.id)}
                    onClick={() => toggleHero(hero.id)}
                  />
                )}
              </For>
            </div>

            <div class="hearth-depart">
              <Show when={selectedQuest()}>
                <div class="text-xs text-dim italic mb-6">
                  Quest: <span class="text-amber">{selectedQuest()!.name}</span>
                </div>
              </Show>
              <button
                class="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                disabled={!selectedQuest() || selectedHeroIds().length === 0 || activeParties().length >= maxParties()}
                onClick={sendParty}
              >
                🗺 Depart on Quest
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




