import type { HeroClass, BaseStats } from './types';

// ─── Name Tables ─────────────────────────────────────────────────────────────
const FIRST_NAMES: Record<HeroClass, string[]> = {
  knight: ['Aldric', 'Bowen', 'Calder', 'Dorin', 'Edric', 'Faron', 'Gawain', 'Hartwin', 'Idris', 'Jorin'],
  wizard: ['Alaric', 'Brennan', 'Casimir', 'Daven', 'Elric', 'Faolan', 'Gideon', 'Hadwin', 'Ivran', 'Jorath'],
  cleric: ['Ansel', 'Brother Bram', 'Candor', 'Devlin', 'Elara', 'Fritha', 'Galen', 'Hollis', 'Isra', 'Jovanna'],
  bard:   ['Avon', 'Blythe', 'Callum', 'Davin', 'Elio', 'Finn', 'Gareth', 'Harlow', 'Indra', 'Jasper'],
  ranger: ['Alwyn', 'Brecken', 'Calla', 'Drest', 'Elwyn', 'Faern', 'Grael', 'Holt', 'Ivara', 'Jyndra'],
  rogue:  ['Ash', 'Breck', 'Cinder', 'Dusk', 'Echo', 'Flint', 'Ghost', 'Hex', 'Ink', 'Jinx'],
};

const SURNAMES: string[] = [
  'Ashford', 'Blackwood', 'Coldwater', 'Dunmore', 'Embervale', 'Frostholm',
  'Grimshaw', 'Holloway', 'Ironkeep', 'Jadewing', 'Kestrel', 'Lochburn',
  'Mirethane', 'Nighthollow', 'Oakhaven', 'Peakstone', 'Quarrywall', 'Ravenmoor',
  'Stonecrest', 'Thornbury', 'Underhill', 'Vaultridge', 'Windmere', 'Yellowfen',
];

export function randomHeroName(heroClass: HeroClass): string {
  const firsts = FIRST_NAMES[heroClass];
  const first = firsts[Math.floor(Math.random() * firsts.length)];
  const last = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  return `${first} ${last}`;
}

// ─── Class Definitions ───────────────────────────────────────────────────────
export interface ClassDef {
  label: string;
  icon: string;
  color: string;            // CSS color for placeholder art
  description: string;
  baseStats: BaseStats;
  statVariance: number;     // ± spread on each stat
  hpPerStr: number;
  mpPerInt: number;
  abilities: string[];      // ability IDs granted at level 1
  bonusAbilities: Record<number, string[]>; // unlocked at level
}

export const CLASS_DEFS: Record<HeroClass, ClassDef> = {
  knight: {
    label: 'Knight',
    icon: '⚔️',
    color: '#7a8fa6',
    description: 'Stalwart warriors clad in steel. High health and armor. Can redirect damage to protect allies.',
    baseStats: { strength: 14, intelligence: 6, wisdom: 8, agility: 8, charisma: 9 },
    statVariance: 3,
    hpPerStr: 5,
    mpPerInt: 2,
    abilities: ['bulwark'],
    bonusAbilities: { 3: ['shield_bash'], 5: ['war_cry'] },
  },
  wizard: {
    label: 'Wizard',
    icon: '🔮',
    color: '#8a6ab5',
    description: 'Masters of the arcane. Devastating area spells but fragile. High mana pool.',
    baseStats: { strength: 5, intelligence: 16, wisdom: 10, agility: 9, charisma: 8 },
    statVariance: 3,
    hpPerStr: 3,
    mpPerInt: 5,
    abilities: ['fireball'],
    bonusAbilities: { 3: ['arcane_shield'], 5: ['meteor'] },
  },
  cleric: {
    label: 'Cleric',
    icon: '✝️',
    color: '#d4a843',
    description: 'Devoted healers blessed by the light. Heals allies and smites the undead.',
    baseStats: { strength: 9, intelligence: 10, wisdom: 15, agility: 7, charisma: 12 },
    statVariance: 3,
    hpPerStr: 4,
    mpPerInt: 4,
    abilities: ['blessed_light'],
    bonusAbilities: { 3: ['holy_smite'], 5: ['divine_aegis'] },
  },
  bard: {
    label: 'Bard',
    icon: '🎵',
    color: '#5ab88a',
    description: 'Travelling performers with silver tongues. Buffs the party and confuses foes.',
    baseStats: { strength: 8, intelligence: 10, wisdom: 9, agility: 12, charisma: 16 },
    statVariance: 3,
    hpPerStr: 3,
    mpPerInt: 3,
    abilities: ['inspiring_song'],
    bonusAbilities: { 3: ['distraction'], 5: ['battle_hymn'] },
  },
  ranger: {
    label: 'Ranger',
    icon: '🏹',
    color: '#6da85b',
    description: 'Swift hunters of the wilds. High agility and piercing single-target damage.',
    baseStats: { strength: 10, intelligence: 9, wisdom: 10, agility: 15, charisma: 9 },
    statVariance: 3,
    hpPerStr: 4,
    mpPerInt: 2,
    abilities: ['precise_shot'],
    bonusAbilities: { 3: ['hunters_mark'], 5: ['volley'] },
  },
  rogue: {
    label: 'Rogue',
    icon: '🗡️',
    color: '#b85555',
    description: 'Cunning thieves and assassins. Strikes hard from the shadows with high burst damage.',
    baseStats: { strength: 11, intelligence: 10, wisdom: 7, agility: 14, charisma: 10 },
    statVariance: 4,
    hpPerStr: 3,
    mpPerInt: 2,
    abilities: ['sneak_attack'],
    bonusAbilities: { 3: ['evasion'], 5: ['shadowstep'] },
  },
};

export const ALL_HERO_CLASSES: HeroClass[] = ['knight', 'wizard', 'cleric', 'bard', 'ranger', 'rogue'];

