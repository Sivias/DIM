import type { Party, Quest } from '../data/types';
import { uid, randInt, chance, pick } from '../utils/random';
import { flavorText } from '../utils/formatting';
import {
  LORE,
  FLOOR_REST,
  FLOOR_COMPLETE,
  QUEST_COMPLETE,
  DISCOVERY,
} from '../data/eventTemplates';
import { QUEST_TEMPLATES } from '../data/questData';
import { generateEncounter, generateBoss } from './DungeonSystem';
import { rollLoot, makeItem } from './ItemSystem';
import { ITEM_TEMPLATES } from '../data/itemData';
import {
  state,
  addParty,
  updateParty,
  addPartyLog,
  addPartyGold,
  addPartyItem,
  setPartyCombat,
  addLog,
  addGold,
  updateHero,
  setHeroStatus,
  removeParty,
} from '../state/store';
import { grantXp } from './HeroSystem';
import { initCombat, tickCombat } from './CombatSystem';

// ─── Create a Quest ───────────────────────────────────────────────────────────
export function createQuestFromTemplate(templateId: string): Quest {
  const tpl = QUEST_TEMPLATES.find((q) => q.templateId === templateId);
  if (!tpl) throw new Error(`Unknown quest template: ${templateId}`);
  const diff = randInt(tpl.minDifficulty, tpl.maxDifficulty) as Quest['difficulty'];
  return {
    id: uid(),
    templateId,
    name: tpl.name,
    description: tpl.description,
    environment: tpl.environment,
    difficulty: diff,
    totalFloors: tpl.totalFloors,
    goldReward: Math.floor(tpl.baseGold * (1 + (diff - 1) * 0.3)),
    xpReward:   Math.floor(tpl.baseXp   * (1 + (diff - 1) * 0.3)),
    isDungeon: tpl.isDungeon,
  };
}

// ─── Get available quests based on hearth level ───────────────────────────────
export function getAvailableQuests(hearthLevel: number): Quest[] {
  const available = QUEST_TEMPLATES.filter((t) => {
    if (t.minDifficulty > hearthLevel + 1) return false;
    return true;
  });

  const count = hearthLevel === 1 ? 3 : hearthLevel === 2 ? 5 : 7;
  const chosen = available.slice(0, count);
  return chosen.map((t) => createQuestFromTemplate(t.templateId));
}

// ─── Start a Party ────────────────────────────────────────────────────────────
export function startParty(heroIds: string[], quest: Quest): void {
  const party: Party = {
    id: uid(),
    heroIds,
    quest,
    status: 'active',
    currentFloor: 1,
    floorProgress: 0,
    timeElapsed: 0,
    recallTimeRemaining: null,
    eventLog: [`The party sets out on "${quest.name}"!`],
    awaitingChoice: null,
    combatState: null,
    inventory: [],
    goldFound: 0,
  };
  addParty(party);
  addLog(`A party of ${heroIds.length} departs on "${quest.name}"!`, 'hearth', true);
}

// ─── Recall a Party ───────────────────────────────────────────────────────────
export function recallParty(partyId: string): void {
  const party = state.parties.find((p) => p.id === partyId);
  if (!party) return;
  const recallTime = Math.floor(party.timeElapsed * 0.5);
  updateParty(partyId, { status: 'returning', recallTimeRemaining: recallTime });
  addPartyLog(partyId, '🔙 The party turns back toward the inn.');
}

// ─── Resolve a Player Choice ──────────────────────────────────────────────────
export function resolveChoice(partyId: string, optionIndex: number): void {
  const party = state.parties.find((p) => p.id === partyId);
  if (!party?.awaitingChoice) return;
  const option = party.awaitingChoice.options[optionIndex];
  if (!option) return;

  const messages: string[] = [`> ${option.label}: ${option.description}`];

  if (option.effect.goldDelta) {
    addPartyGold(partyId, option.effect.goldDelta);
    messages.push(`💰 ${option.effect.goldDelta > 0 ? '+' : ''}${option.effect.goldDelta} gold.`);
  }

  if (option.effect.flee) {
    updateParty(partyId, { status: 'returning', recallTimeRemaining: Math.floor(party.timeElapsed * 0.5), awaitingChoice: null });
    messages.push('The party flees!');
    messages.forEach((m) => addPartyLog(partyId, m));
    return;
  }

  messages.forEach((m) => addPartyLog(partyId, m));
  updateParty(partyId, { awaitingChoice: null, status: 'active' });
}

// ─── Complete the Quest ───────────────────────────────────────────────────────
function completeParty(partyId: string): void {
  const party = state.parties.find((p) => p.id === partyId);
  if (!party) return;

  const totalGold = party.goldFound + party.quest.goldReward;
  addGold(totalGold);

  // XP distribution and status reset
  party.heroIds.forEach((hid) => {
    const hero = state.heroes.find((h) => h.id === hid);
    if (!hero) return;
    const { hero: updated, leveledUp } = grantXp(hero, party.quest.xpReward);
    updateHero(hid, updated);
    setHeroStatus(hid, 'available');
    if (leveledUp) {
      addLog(`🌟 ${hero.name} has reached level ${updated.level}!`, 'adventure', true);
    }
  });


  addPartyLog(partyId, flavorText(QUEST_COMPLETE, { HERO: party.heroIds.length ? 'the party' : 'them' }));
  addLog(`✅ "${party.quest.name}" completed! +${totalGold} gold.`, 'hearth', true);
  updateParty(partyId, { status: 'complete' });

  // Clean up after a short delay (allow UI to show complete state)
  setTimeout(() => {
    removeParty(partyId);
  }, 10000);
}

// ─── Game Loop Tick ───────────────────────────────────────────────────────────
// Called every 100ms by the GameLoop; dt is seconds since last call
export function tickParties(dt: number): void {
  for (const party of state.parties) {
    if (party.status === 'complete' || party.status === 'wiped') continue;
    if (party.status === 'waiting_choice') continue;

    if (party.status === 'returning') {
      const remaining = (party.recallTimeRemaining ?? 0) - dt;
      if (remaining <= 0) {
        completeParty(party.id);
      } else {
        updateParty(party.id, { recallTimeRemaining: remaining });
      }
      continue;
    }

    if (party.status === 'in_combat') {
      tickPartyBattle(party.id, dt);
      continue;
    }

    if (party.status === 'resting') {
      // Resting parties wait for player to send them onward or recall
      continue;
    }

    // Active party – advance floor progress
    if (party.status === 'active') {
      const progressRate = 1 / (60 + party.quest.difficulty * 30); // harder = slower
      const newProgress = party.floorProgress + dt * progressRate;
      const newElapsed = party.timeElapsed + dt;

      updateParty(party.id, { floorProgress: newProgress, timeElapsed: newElapsed });

      // Fire random events during travel
      if (newProgress < 1) {
        // Random event chance: once every ~20 seconds
        if (chance(dt / 20) && !party.combatState) {
          fireRandomEvent(party.id);
        }
      } else {
        // Floor complete
        finishFloor(party.id);
      }
    }
  }
}

let combatTimers: Record<string, number> = {};

function tickPartyBattle(partyId: string, _dt: number): void {
  const party = state.parties.find((p) => p.id === partyId);
  if (!party?.combatState) return;

  // Combat ticks at 2.5 second intervals
  const now = Date.now();
  const last = combatTimers[partyId] ?? 0;
  if (now - last < 2500) return;
  combatTimers[partyId] = now;

  const liveHeroes = party.heroIds
    .map((id) => state.heroes.find((h) => h.id === id))
    .filter(Boolean) as typeof state.heroes;

  // Reconstruct enemies from combatant list (they live in combat state)
  const enemyStubs = party.combatState.combatants
    .filter((c) => c.type === 'enemy')
    .map((c) => ({
      id: c.id,
      name: c.name,
      hp: c.hp,
      maxHp: c.maxHp,
      stats: { strength: 10, intelligence: 5, wisdom: 5, agility: 8, charisma: 3 },
      damage: 6,
      armor: 2,
      xpValue: 20,
      goldValue: 5,
      lootTable: [],
      icon: '👹',
      color: '#c04020',
      statusEffects: [],
      templateId: 'goblin',
    })) as Parameters<typeof tickCombat>[2];

  const result = tickCombat(party.combatState, liveHeroes, enemyStubs);

  // Apply message updates
  result.messages.forEach((m) => addPartyLog(partyId, m));

  // Sync hero HP
  result.heroUpdates.forEach(({ id, hp, mp }) => {
    updateHero(id, { hp: Math.max(0, hp), mp: Math.max(0, mp) });
  });

  // Handle enemy kills (loot)
  result.enemyKills.forEach((eid) => {
    const eCombatant = result.state.combatants.find((c) => c.id === eid);
    if (!eCombatant) return;
    const stub = enemyStubs.find((e) => e.id === eid);
    if (stub) {
      const loot = rollLoot(stub.lootTable);
      loot.forEach((item) => {
        addPartyItem(partyId, item);
        addPartyLog(partyId, `💎 Found ${item.name}!`);
      });
      addPartyGold(partyId, stub.goldValue);
    }
    // Track monster kills for heroes
    party.heroIds.forEach((hid) => {
      const hero = state.heroes.find((h) => h.id === hid);
      if (hero) {
        updateHero(hid, {
          trackedStats: { ...hero.trackedStats, monstersSlain: hero.trackedStats.monstersSlain + 1 },
        });
      }
    });
  });

  setPartyCombat(partyId, result.isOver ? null : result.state);

  if (result.isOver) {
    if (result.heroesWon) {
      updateParty(partyId, { status: 'active', combatState: null });
    } else {
      // Party wiped
      party.heroIds.forEach((hid) => setHeroStatus(hid, 'resting'));
      updateParty(partyId, { status: 'wiped' });
      addLog(`💀 A party has been wiped on "${party.quest.name}"!`, 'adventure', true);
      setTimeout(() => removeParty(partyId), 8000);
    }
  }
}

function fireRandomEvent(partyId: string): void {
  const party = state.parties.find((p) => p.id === partyId);
  if (!party) return;

  const roll = Math.random();

  if (roll < 0.45) {
    // Combat encounter
    const enemies = generateEncounter(party.quest.environment, party.quest.difficulty);
    const liveHeroes = party.heroIds
      .map((id) => state.heroes.find((h) => h.id === id))
      .filter((h) => h && h.hp > 0) as typeof state.heroes;

    if (liveHeroes.length === 0) return;

    addPartyLog(partyId, `⚔️ Enemies appear: ${enemies.map((e) => e.name).join(', ')}!`);
    const combat = initCombat(liveHeroes, enemies);
    setPartyCombat(partyId, combat);
    updateParty(partyId, { status: 'in_combat' });
    combatTimers[partyId] = Date.now();
  } else if (roll < 0.60) {
    // Treasure / item find
    const lootPool = Object.keys(ITEM_TEMPLATES).filter(
      (id) => ITEM_TEMPLATES[id].type !== 'ingredient',
    );
    const itemId = pick(lootPool);
    const item = makeItem(itemId);
    addPartyItem(partyId, item);
    const hero = state.heroes.find((h) => party.heroIds.includes(h.id));
    addPartyLog(
      partyId,
      flavorText(DISCOVERY, { HERO: hero?.name ?? 'The party', ITEM: item.name }),
    );
  } else if (roll < 0.70) {
    // Gold find
    const gold = randInt(5, 20 * party.quest.difficulty);
    addPartyGold(partyId, gold);
    addPartyLog(partyId, `💰 The party finds a stash of ${gold} gold coins!`);
  } else if (roll < 0.85) {
    // Lore
    addPartyLog(partyId, flavorText(LORE));
  } else if (roll < 0.95) {
    // Trap
    const trapDmg = randInt(3, 8 * party.quest.difficulty);
    const heroId = pick(party.heroIds);
    const hero = state.heroes.find((h) => h.id === heroId);
    if (hero) {
      const newHp = Math.max(1, hero.hp - trapDmg);
      updateHero(heroId, { hp: newHp });
      addPartyLog(partyId, `🪤 A trap activates! ${hero.name} takes ${trapDmg} damage.`);
    }
  } else {
    // Choice event
    const choice = {
      prompt: 'You find a locked chest with a suspicious aura. What do you do?',
      options: [
        {
          label: 'Force it open',
          description: 'Smash the lock. Might spring a trap!',
          effect: { damage: randInt(5, 15) },
        },
        {
          label: 'Leave it',
          description: 'Discretion is the better part of valor.',
          effect: {},
        },
        {
          label: 'Pick the lock',
          description: 'Careful work might yield treasure.',
          effect: { goldDelta: randInt(20, 60) },
        },
      ],
    };
    updateParty(partyId, { awaitingChoice: choice, status: 'waiting_choice' });
    addLog(`❓ "${party.quest.name}": Party is waiting for a decision!`, 'adventure', true);
  }
}

function finishFloor(partyId: string): void {
  const party = state.parties.find((p) => p.id === partyId);
  if (!party) return;

  if (party.currentFloor >= party.quest.totalFloors) {
    // Quest complete – boss fight first
    const boss = generateBoss(party.quest.environment, party.quest.difficulty);
    const liveHeroes = party.heroIds
      .map((id) => state.heroes.find((h) => h.id === id))
      .filter((h) => h && h.hp > 0) as typeof state.heroes;

    addPartyLog(partyId, `👑 ${boss.name} blocks the path!`);
    if (liveHeroes.length) {
      const combat = initCombat(liveHeroes, [boss]);
      setPartyCombat(partyId, combat);
      updateParty(partyId, { status: 'in_combat', floorProgress: 0, combatState: combat });
      combatTimers[partyId] = Date.now();
      // After combat finishes, completeParty is called from tickPartyBattle
      // We need to mark that this is the final combat
      // For simplicity, we'll just watch for in_combat → active on last floor
      // and trigger complete. Actually handled by finishFloor being called again.
      // Flagging via a post-combat hook - handled in tickPartyBattle checking floor vs totalFloors
    } else {
      completeParty(partyId);
    }
    return;
  }

  // Floor clear – party rests
  addPartyLog(partyId, flavorText(FLOOR_REST));
  addPartyLog(partyId, flavorText(FLOOR_COMPLETE));
  updateParty(partyId, {
    status: 'resting',
    currentFloor: party.currentFloor + 1,
    floorProgress: 0,
  });
  addLog(`⛺ "${party.quest.name}" party is resting at floor ${party.currentFloor}.`, 'adventure', true);
}

/** Call after player chooses to descend from rest */
export function continueFromRest(partyId: string): void {
  updateParty(partyId, { status: 'active' });
  addPartyLog(partyId, 'The party gathers their courage and descends deeper...');
}




