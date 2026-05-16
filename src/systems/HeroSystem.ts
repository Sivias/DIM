import type { Hero, HeroClass, BaseStats, Equipment } from '../data/types';
import { CLASS_DEFS, randomHeroName, ALL_HERO_CLASSES } from '../data/heroData';
import { ABILITY_DEFS } from '../data/abilityData';
import { uid, randInt, pick, chance } from '../utils/random';
import { clamp } from '../utils/dice';
import { ITEM_TEMPLATES } from '../data/itemData';
import { makeItem } from './ItemSystem';

export function rollStats(base: BaseStats, variance: number): BaseStats {
  const roll = (v: number) => v + randInt(-variance, variance);
  return {
    strength:     clamp(roll(base.strength),     3, 20),
    intelligence: clamp(roll(base.intelligence), 3, 20),
    wisdom:       clamp(roll(base.wisdom),        3, 20),
    agility:      clamp(roll(base.agility),       3, 20),
    charisma:     clamp(roll(base.charisma),      3, 20),
  };
}

export function deriveMaxHp(stats: BaseStats, hpPerStr: number): number {
  return Math.max(10, stats.strength * hpPerStr);
}

export function deriveMaxMp(stats: BaseStats, mpPerInt: number): number {
  return Math.max(0, stats.intelligence * mpPerInt);
}

export function generateHero(heroClass?: HeroClass, stableLevel = 1): Hero {
  const cls = heroClass ?? pick(ALL_HERO_CLASSES);
  const def = CLASS_DEFS[cls];
  const stats = rollStats(def.baseStats, def.statVariance);

  // Chance to start with equipment based on stable level
  const equipChance = stableLevel === 1 ? 0.15 : stableLevel === 2 ? 0.35 : 0.55;

  const weapon: Equipment['weapon'] = chance(equipChance)
    ? makeItem(pick(['rusty_dagger', 'iron_sword']))
    : null;
  const armor: Equipment['armor'] = chance(equipChance * 0.7)
    ? makeItem(pick(['tattered_armor', 'iron_shield']))
    : null;
  const trinket: Equipment['trinket'] = chance(equipChance * 0.4)
    ? makeItem(pick(['bone_charm', 'silver_fragment']))
    : null;

  // Check we have those templates
  const safeItem = (item: ReturnType<typeof makeItem> | null, fallback: string) =>
    item ?? (ITEM_TEMPLATES[fallback] ? makeItem(fallback) : null);

  const maxHp = deriveMaxHp(stats, def.hpPerStr);
  const maxMp = deriveMaxMp(stats, def.mpPerInt);

  return {
    id: uid(),
    name:       randomHeroName(cls),
    heroClass:  cls,
    level:      1,
    xp:         0,
    xpToNext:   100,
    stats,
    hp:         maxHp,
    maxHp,
    mp:         maxMp,
    maxMp,
    equipment:  {
      weapon:  safeItem(weapon, 'rusty_dagger'),
      armor:   safeItem(armor, 'tattered_armor'),
      trinket,
    },
    abilities:  [...def.abilities],
    status:     'available',
    trackedStats: {
      monstersSlain: 0,
      questsCompleted: 0,
      goldEarned: 0,
      damageDone: 0,
      damageReceived: 0,
      healingDone: 0,
      itemsFound: 0,
    },
    hireDay: 0,
    portrait: def.color,
  };
}

/** Generate a pool of heroes for the bar */
export function generateHeroPool(poolSize: number, stableLevel: number): Hero[] {
  const weights = ALL_HERO_CLASSES.map((cls) => ({
    cls,
    weight: cls === 'knight' || cls === 'cleric' ? 2 : 1,
  }));
  const total = weights.reduce((a, b) => a + b.weight, 0);

  const pickWeighted = (): HeroClass => {
    let r = Math.random() * total;
    for (const { cls, weight } of weights) {
      r -= weight;
      if (r <= 0) return cls;
    }
    return 'knight';
  };

  return Array.from({ length: poolSize }, () => generateHero(pickWeighted(), stableLevel));
}

const XP_CURVE = [0, 100, 250, 500, 900, 1500, 2400, 3800];

export function grantXp(hero: Hero, amount: number): { hero: Hero; leveledUp: boolean } {
  let xp = hero.xp + amount;
  let level = hero.level;
  let xpToNext = hero.xpToNext;
  let stats = { ...hero.stats };
  let leveledUp = false;

  while (xp >= xpToNext && level < 8) {
    xp -= xpToNext;
    level++;
    xpToNext = XP_CURVE[level] ?? 9999;
    leveledUp = true;
    // Stat gains on level up
    stats = {
      strength:     stats.strength     + randInt(0, 1),
      intelligence: stats.intelligence + randInt(0, 1),
      wisdom:       stats.wisdom       + randInt(0, 1),
      agility:      stats.agility      + randInt(0, 1),
      charisma:     stats.charisma     + randInt(0, 1),
    };
  }

  const def = CLASS_DEFS[hero.heroClass];
  const maxHp = deriveMaxHp(stats, def.hpPerStr);
  const maxMp = deriveMaxMp(stats, def.mpPerInt);

  // Check for new abilities
  const newAbilities = [...hero.abilities];
  const bonusAbilities = def.bonusAbilities[level] ?? [];
  bonusAbilities.forEach((a) => {
    if (!newAbilities.includes(a)) newAbilities.push(a);
  });

  return {
    hero: { ...hero, xp, level, xpToNext, stats, maxHp, maxMp, abilities: newAbilities },
    leveledUp,
  };
}

export function getAbilityDef(id: string) {
  return ABILITY_DEFS[id] ?? null;
}

export function getEffectiveStats(hero: Hero): BaseStats {
  const s = { ...hero.stats };
  const eq = hero.equipment;
  if (eq.weapon?.effect.statBonus) Object.entries(eq.weapon.effect.statBonus).forEach(([k, v]) => { (s as Record<string, number>)[k] = ((s as Record<string, number>)[k] ?? 0) + (v ?? 0); });
  if (eq.armor?.effect.statBonus)  Object.entries(eq.armor.effect.statBonus).forEach(([k, v]) => { (s as Record<string, number>)[k] = ((s as Record<string, number>)[k] ?? 0) + (v ?? 0); });
  if (eq.trinket?.effect.statBonus) Object.entries(eq.trinket.effect.statBonus).forEach(([k, v]) => { (s as Record<string, number>)[k] = ((s as Record<string, number>)[k] ?? 0) + (v ?? 0); });
  return s;
}

export function getArmorValue(hero: Hero): number {
  return (hero.equipment.armor?.effect.armorBonus ?? 0);
}

export function getWeaponDamage(hero: Hero): number {
  return (hero.equipment.weapon?.effect.damageBonus ?? 0);
}



