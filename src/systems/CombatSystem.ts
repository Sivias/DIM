import type { Hero, Enemy, CombatState, Combatant, StatusEffect } from '../data/types';
import { ABILITY_DEFS } from '../data/abilityData';
import { d20, clamp } from '../utils/dice';
import { uid, pick } from '../utils/random';
import { flavorText } from '../utils/formatting';
import { getEffectiveStats, getArmorValue, getWeaponDamage } from './HeroSystem';
import {
  COMBAT_ATTACK,
  ENEMY_ATTACK,
  COMBAT_VICTORY,
  HERO_KILLED,
} from '../data/eventTemplates';

// Build a Combatant from a Hero
export function heroToCombatant(hero: Hero): Combatant {
  const stats = getEffectiveStats(hero);
  const initiativeRoll = d20() + Math.floor((stats.agility - 10) / 2);
  return {
    id: hero.id,
    name: hero.name,
    type: 'hero',
    hp: hero.hp,
    maxHp: hero.maxHp,
    initiative: initiativeRoll,
    statusEffects: [],
    shieldAmount: 0,
  };
}

// Build a Combatant from an Enemy
export function enemyToCombatant(enemy: Enemy): Combatant {
  const initiativeRoll = d20() + Math.floor((enemy.stats.agility - 10) / 2);
  return {
    id: enemy.id,
    name: enemy.name,
    type: 'enemy',
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    initiative: initiativeRoll,
    statusEffects: [],
    shieldAmount: 0,
  };
}

// Initialize combat state from heroes and enemies
export function initCombat(heroes: Hero[], enemies: Enemy[]): CombatState {
  const combatants: Combatant[] = [
    ...heroes.map(heroToCombatant),
    ...enemies.map(enemyToCombatant),
  ].sort((a, b) => b.initiative - a.initiative);

  return {
    combatants,
    currentTurnIndex: 0,
    round: 1,
    isActive: true,
    log: [`⚔️ Combat begins! ${enemies.map((e) => e.name).join(', ')} appear!`],
  };
}

export interface CombatTickResult {
  state: CombatState;
  messages: string[];
  heroUpdates: Array<{ id: string; hp: number; mp: number }>;
  enemyKills: string[];
  isOver: boolean;
  heroesWon: boolean;
}

// Calculate damage from attacker to target
function calcDamage(
  attackerId: string,
  targetId: string,
  combat: CombatState,
  heroes: Hero[],
  enemies: Enemy[],
  damageMult = 1,
  ignoreArmor = false,
): number {
  const attacker = combat.combatants.find((c) => c.id === attackerId)!;
  const target = combat.combatants.find((c) => c.id === targetId)!;

  let baseDmg = 0;
  if (attacker.type === 'hero') {
    const hero = heroes.find((h) => h.id === attackerId)!;
    const stats = getEffectiveStats(hero);
    baseDmg = Math.floor(stats.strength * 0.5) + getWeaponDamage(hero) + Math.floor(Math.random() * 4);
  } else {
    const enemy = enemies.find((e) => e.id === attackerId)!;
    baseDmg = enemy.damage + Math.floor(Math.random() * 3);
  }

  baseDmg = Math.floor(baseDmg * damageMult);

  if (!ignoreArmor) {
    let armor = 0;
    if (target.type === 'hero') {
      const th = heroes.find((h) => h.id === targetId);
      if (th) armor = getArmorValue(th);
    } else {
      const te = enemies.find((e) => e.id === targetId);
      if (te) armor = te.armor;
    }
    baseDmg = Math.max(1, baseDmg - armor);
  }

  return baseDmg;
}

// Get the target ID for the current attacker (simple AI)
function chooseTarget(attacker: Combatant, combat: CombatState): Combatant | null {
  const opponents = combat.combatants.filter(
    (c) => c.type !== attacker.type && c.hp > 0,
  );
  if (opponents.length === 0) return null;
  // Enemies target lowest HP hero; heroes target lowest HP enemy
  return opponents.reduce((a, b) => (a.hp < b.hp ? a : b));
}

// Apply a status tick (decrement durations, remove expired)
function tickStatuses(combatant: Combatant): { combatant: Combatant; bleedDmg: number } {
  let bleedDmg = 0;
  const effects: StatusEffect[] = [];
  for (const eff of combatant.statusEffects) {
    if (eff.type === 'bleed' && eff.value) bleedDmg += eff.value;
    if (eff.remaining > 1) effects.push({ ...eff, remaining: eff.remaining - 1 });
  }
  return { combatant: { ...combatant, statusEffects: effects }, bleedDmg };
}

// Execute one combat turn and return the result
export function tickCombat(
  combat: CombatState,
  heroes: Hero[],
  enemies: Enemy[],
): CombatTickResult {
  const messages: string[] = [];
  const heroUpdates: Array<{ id: string; hp: number; mp: number }> = [];
  const enemyKills: string[] = [];

  let cs = { ...combat, combatants: combat.combatants.map((c) => ({ ...c })) };

  // Find the current active combatant (skip dead)
  let idx = cs.currentTurnIndex % cs.combatants.length;
  let actor = cs.combatants[idx];

  // Advance past dead combatants
  let tries = 0;
  while (actor.hp <= 0 && tries < cs.combatants.length) {
    idx = (idx + 1) % cs.combatants.length;
    actor = cs.combatants[idx];
    tries++;
  }

  if (!actor || actor.hp <= 0) {
    // Check victory
    const heroesAlive = cs.combatants.some((c) => c.type === 'hero' && c.hp > 0);
    const enemiesAlive = cs.combatants.some((c) => c.type === 'enemy' && c.hp > 0);
    return { state: cs, messages, heroUpdates, enemyKills, isOver: true, heroesWon: heroesAlive && !enemiesAlive };
  }

  // Tick status effects on actor
  const { combatant: tickedActor, bleedDmg } = tickStatuses(actor);
  cs.combatants[idx] = tickedActor;
  actor = tickedActor;

  if (bleedDmg > 0) {
    cs.combatants[idx].hp = Math.max(0, actor.hp - bleedDmg);
    messages.push(`🩸 ${actor.name} bleeds for ${bleedDmg} damage.`);
  }

  // Stun check
  const isStunned = actor.statusEffects.some((e) => e.type === 'stun');
  if (!isStunned && actor.hp > 0) {
    const target = chooseTarget(actor, cs);
    if (target) {
      const targetIdx = cs.combatants.findIndex((c) => c.id === target.id);
      const dmg = calcDamage(actor.id, target.id, cs, heroes, enemies);

      // Apply shield first
      let remaining = dmg;
      if (cs.combatants[targetIdx].shieldAmount > 0) {
        const absorbed = Math.min(cs.combatants[targetIdx].shieldAmount, remaining);
        cs.combatants[targetIdx].shieldAmount -= absorbed;
        remaining -= absorbed;
      }

      cs.combatants[targetIdx].hp = Math.max(0, cs.combatants[targetIdx].hp - remaining);

      if (actor.type === 'hero') {
        messages.push(flavorText(COMBAT_ATTACK, { HERO: actor.name, ENEMY: target.name, DAMAGE: String(dmg) }));
        // Track damage done
        const heroObj = heroes.find((h) => h.id === actor.id);
        if (heroObj) heroUpdates.push({ id: actor.id, hp: heroObj.hp, mp: heroObj.mp });
      } else {
        messages.push(flavorText(ENEMY_ATTACK, { ENEMY: actor.name, HERO: target.name, DAMAGE: String(dmg) }));
      }

      // Check target death
      if (cs.combatants[targetIdx].hp <= 0) {
        if (cs.combatants[targetIdx].type === 'hero') {
          messages.push(flavorText(HERO_KILLED, { HERO: target.name }));
        } else {
          enemyKills.push(target.id);
        }
      }
    }
  } else if (isStunned) {
    messages.push(`💫 ${actor.name} is stunned and loses their turn.`);
  }

  // Advance turn index (skip dead)
  let nextIdx = (idx + 1) % cs.combatants.length;
  let nextRound = cs.round;
  if (nextIdx === 0) nextRound++;

  cs.currentTurnIndex = nextIdx;
  cs.round = nextRound;

  // Check if combat over
  const heroesAlive = cs.combatants.some((c) => c.type === 'hero' && c.hp > 0);
  const enemiesAlive = cs.combatants.some((c) => c.type === 'enemy' && c.hp > 0);
  const isOver = !heroesAlive || !enemiesAlive;

  if (isOver && heroesAlive) {
    messages.push(flavorText(COMBAT_VICTORY, { ROOM: 'dungeon' }));
  }

  cs.isActive = !isOver;

  // Sync hero HP back
  cs.combatants.forEach((c) => {
    if (c.type === 'hero') {
      heroUpdates.push({ id: c.id, hp: c.hp, mp: heroes.find((h) => h.id === c.id)?.mp ?? 0 });
    }
  });

  return {
    state: cs,
    messages,
    heroUpdates,
    enemyKills,
    isOver,
    heroesWon: heroesAlive && !enemiesAlive,
  };
}

// Use an ability - returns result messages and combat state
export function useAbility(
  abilityId: string,
  userId: string,
  targetId: string | null,
  combat: CombatState,
  heroes: Hero[],
  enemies: Enemy[],
): { messages: string[]; combat: CombatState; heroUpdates: Array<{ id: string; hp: number; mp: number }> } {
  const abilDef = ABILITY_DEFS[abilityId];
  if (!abilDef) return { messages: [], combat, heroUpdates: [] };

  const messages: string[] = [];
  const heroUpdates: Array<{ id: string; hp: number; mp: number }> = [];
  const cs = { ...combat, combatants: combat.combatants.map((c) => ({ ...c })) };

  const userHero = heroes.find((h) => h.id === userId);
  if (!userHero || userHero.mp < abilDef.mpCost) {
    messages.push(`${userHero?.name ?? 'Hero'} doesn't have enough mana!`);
    return { messages, combat: cs, heroUpdates };
  }

  const stats = getEffectiveStats(userHero);
  const eff = abilDef.effect;

  messages.push(`✨ ${userHero.name} uses ${abilDef.name}!`);

  const getTargets = (): Combatant[] => {
    switch (abilDef.targetType) {
      case 'all_enemies':   return cs.combatants.filter((c) => c.type === 'enemy' && c.hp > 0);
      case 'all_allies':    return cs.combatants.filter((c) => c.type === 'hero' && c.hp > 0);
      case 'lowest_ally': {
        const allies = cs.combatants.filter((c) => c.type === 'hero' && c.hp > 0);
        return allies.length ? [allies.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b))] : [];
      }
      case 'single_enemy':
      case 'single_ally':
        return targetId ? cs.combatants.filter((c) => c.id === targetId && c.hp > 0) : [];
      case 'self':
        return cs.combatants.filter((c) => c.id === userId);
      default: return [];
    }
  };

  const targets = getTargets();

  targets.forEach((t) => {
    const ti = cs.combatants.findIndex((c) => c.id === t.id);
    if (ti < 0) return;

    if (eff.damageMult !== undefined) {
      let base = 0;
      if (abilDef.heroClass === 'wizard') base = stats.intelligence * 2;
      else if (abilDef.heroClass === 'cleric' && t.type === 'enemy') base = stats.wisdom * 1.5;
      else if (abilDef.heroClass === 'ranger') base = stats.agility * 1.5;
      else if (abilDef.heroClass === 'rogue') base = stats.agility * 2;
      else base = stats.strength * 1.2 + getWeaponDamage(userHero);
      const dmg = Math.max(1, Math.floor(base * eff.damageMult));
      cs.combatants[ti].hp = Math.max(0, cs.combatants[ti].hp - dmg);
      messages.push(`💥 ${t.name} takes ${dmg} damage!`);
    }

    if (eff.healMult !== undefined) {
      const healAmt = Math.floor(stats.wisdom * eff.healMult);
      cs.combatants[ti].hp = Math.min(cs.combatants[ti].maxHp, cs.combatants[ti].hp + healAmt);
      messages.push(`💚 ${t.name} recovers ${healAmt} HP.`);
    }

    if (eff.shieldAmount !== undefined) {
      cs.combatants[ti].shieldAmount = (cs.combatants[ti].shieldAmount ?? 0) + eff.shieldAmount;
      messages.push(`🛡️ ${t.name} gains a ${eff.shieldAmount} damage shield.`);
    }

    if (eff.stun !== undefined) {
      cs.combatants[ti].statusEffects = [
        ...cs.combatants[ti].statusEffects,
        { type: 'stun', remaining: eff.stun },
      ];
      messages.push(`💫 ${t.name} is stunned for ${eff.stun} turn(s)!`);
    }
  });

  // Deduct MP cost - sync to heroes array outside
  heroUpdates.push({ id: userId, hp: userHero.hp, mp: Math.max(0, userHero.mp - abilDef.mpCost) });

  return { messages, combat: cs, heroUpdates };
}

export function generateUniqueId() {
  return uid();
}

