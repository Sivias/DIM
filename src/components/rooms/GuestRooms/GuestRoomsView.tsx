import type { JSX } from 'solid-js';
import { For, Show, createSignal, createMemo } from 'solid-js';
import { state, updateHero, addLog, removeHero, spendGold, upgradeRoom } from '../../../state/store';
import { CLASS_DEFS } from '../../../data/heroData';
import { doChore } from '../../../systems/LaborSystem';
import { MAX_HEROES_BY_LEVEL, ROOM_DEFS } from '../../../data/roomData';
import StatBlock from '../../shared/StatBlock';
import { ABILITY_DEFS } from '../../../data/abilityData';
import { RARITY_COLORS } from '../../../systems/ItemSystem';
import type { Hero } from '../../../data/types';
import LaborSection from '../../shared/LaborSection';

export default function GuestRoomsView(): JSX.Element {
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const selectedHero = createMemo(() => state.heroes.find((h) => h.id === selectedId()));
  const maxHeroes = createMemo(() => MAX_HEROES_BY_LEVEL[state.roomLevels.guestRooms] ?? 4);
  const nextUpgrade = createMemo(() =>
    ROOM_DEFS.guestRooms.upgrades.find((u) => u.level === state.roomLevels.guestRooms + 1),
  );


  const tryUpgrade = () => {
    const up = nextUpgrade();
    if (!up) return;
    if (!spendGold(up.cost)) { addLog(`Need ${up.cost}g to upgrade the Guest Rooms.`, 'guestRooms'); return; }
    upgradeRoom('guestRooms');
    addLog(`Guest Rooms upgraded to Level ${state.roomLevels.guestRooms}!`, 'guestRooms', true);
  };

  const resurrect = (hero: Hero) => {
    updateHero(hero.id, { status: 'resting', hp: Math.floor(hero.maxHp * 0.3) });
    addLog(`${hero.name} stirs in their cot, pale but breathing.`, 'guestRooms', true);
  };

  return (
    <div class="room-view">
      <div class="room-header">
        <span>🛏️</span>
        <span class="room-title">Guest Rooms</span>
        <span class="room-subtitle">{state.heroes.length}/{maxHeroes()} occupied</span>
      </div>

      <div class="room-body">
        <LaborSection tasks={[{
          key: 'rooms_tidy',
          icon: '🧹',
          name: 'Tidy the Rooms',
          desc: 'Fresh linens and swept floors — guests pay a little extra.',
          bonus: '+10g',
          verb: 'Tidy',
          action: () => doChore('rooms_tidy', 1, 10, 'Rooms tidied — guests will pay a little extra tonight.'),
        }]} />

        <div class="grid-2" style={{ gap: '16px', 'align-items': 'flex-start' }}>
          {/* Hero list */}
          <div>
            <div class="heading-font text-sm text-amber mb-8">Residents</div>
            <Show when={state.heroes.length === 0}>
              <div class="empty-state">
                <span class="empty-state-icon">🛏️</span>
                <span class="empty-state-small">Hire heroes at the Bar.</span>
              </div>
            </Show>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '7px' }}>
              <For each={state.heroes}>
                {(hero) => {
                  const def = CLASS_DEFS[hero.heroClass];
                  const hpPct = () => (hero.hp / hero.maxHp) * 100;
                  const hpClass = () => hpPct() > 60 ? 'good' : hpPct() > 25 ? 'medium' : '';
                  return (
                    <div
                      class={`hero-card${selectedId() === hero.id ? ' selected' : ''}${hero.status === 'dead' ? ' dead' : ''}`}
                      onClick={() => setSelectedId(hero.id === selectedId() ? null : hero.id)}
                    >
                      <div class="hero-portrait" style={{ background: `${hero.portrait}22`, 'border-color': `${hero.portrait}55` }}>
                        <span>{def.icon}</span>
                        <span class="hero-portrait-level">Lv{hero.level}</span>
                      </div>
                      <div class="hero-info">
                        <div class="hero-name">{hero.name}</div>
                        <div class="hero-class-label">{def.label} · {hero.status}</div>
                        <div class="hp-bar">
                          <div class={`hp-fill ${hpClass()}`} style={{ width: `${hpPct()}%` }} />
                        </div>
                        <div class="bar-label">
                          <span>❤️ {hero.hp}/{hero.maxHp}</span>
                          {hero.maxMp > 0 && <span>💧 {hero.mp}/{hero.maxMp}</span>}
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>

            <div class="divider mt-12" />
            <div class="heading-font text-sm text-amber mt-8 mb-8">Upgrades</div>
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

          {/* Hero detail panel */}
          <Show when={selectedHero()}>
            {(hero) => {
              const def = CLASS_DEFS[hero().heroClass];
              const xpPct = () => (hero().xp / hero().xpToNext) * 100;
              return (
                <div class="hero-inspector">
                  <div class="inspector-header">
                    <div class="inspector-portrait" style={{ background: `${hero().portrait}22`, 'border-color': hero().portrait }}>
                      {def.icon}
                    </div>
                    <div>
                      <div class="inspector-title">{hero().name}</div>
                      <div class="inspector-subtitle">{def.label} · Level {hero().level}</div>
                      <div class="xp-bar mt-4">
                        <div class="xp-fill" style={{ width: `${xpPct()}%` }} />
                      </div>
                      <div class="text-xs text-dim mt-4">XP {hero().xp}/{hero().xpToNext}</div>
                    </div>
                  </div>

                  <div class="inspector-section">
                    <div class="inspector-section-title">Stats</div>
                    <StatBlock stats={hero().stats} />
                  </div>

                  <div class="inspector-section">
                    <div class="inspector-section-title">Equipment</div>
                    <div class="equip-slots">
                      {(['weapon', 'armor', 'trinket'] as const).map((slot) => {
                        const item = hero().equipment[slot];
                        return (
                          <div class={`equip-slot${item ? ' filled' : ''}`}>
                            <span class="equip-slot-label">{slot}</span>
                            <span class="equip-slot-icon">{item?.icon ?? '○'}</span>
                            <span class="equip-slot-name" style={{ color: item ? RARITY_COLORS[item.rarity] : 'var(--stone2)' }}>
                              {item?.name ?? '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div class="inspector-section">
                    <div class="inspector-section-title">Abilities</div>
                    <div class="flex gap-4 flex-wrap">
                      <For each={hero().abilities}>
                        {(abilId) => {
                          const a = ABILITY_DEFS[abilId];
                          if (!a) return null;
                          return (
                            <div class="item-tag rarity-uncommon" title={a.description}>
                              {a.icon} {a.name}
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </div>

                  <div class="inspector-section">
                    <div class="inspector-section-title">Deeds</div>
                    {([
                      { label: 'Monsters Slain',    val: hero().trackedStats.monstersSlain },
                      { label: 'Quests Completed',  val: hero().trackedStats.questsCompleted },
                      { label: 'Gold Earned',       val: hero().trackedStats.goldEarned },
                      { label: 'Damage Done',       val: hero().trackedStats.damageDone },
                    ]).map(({ label, val }) => (
                      <div class="tracked-stat-row">
                        <span class="tracked-stat-label">{label}</span>
                        <span class="tracked-stat-value">{val}</span>
                      </div>
                    ))}
                  </div>

                  <div class="mt-12 flex gap-8">
                    <Show when={hero().status === 'dead' || hero().status === 'resting'}>
                      <button class="btn btn-sm btn-success" onClick={() => resurrect(hero())}>
                        💊 Recover
                      </button>
                    </Show>
                    <button class="btn btn-sm btn-danger" onClick={() => {
                      removeHero(hero().id);
                      setSelectedId(null);
                      addLog(`${hero().name} has departed the inn.`, 'guestRooms');
                    }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            }}
          </Show>

          <Show when={!selectedHero()}>
            <div class="empty-state" style={{ 'padding-top': '20px' }}>
              <span class="empty-state-icon">👈</span>
              <span class="empty-state-small">Select a hero to inspect them.</span>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}







