import type { Item } from './types';

// Template factory – id is assigned at generation time
export interface ItemTemplate {
  templateId: string;
  name: string;
  type: Item['type'];
  slot?: Item['slot'];
  description: string;
  baseValue: number;
  effect: Item['effect'];
  rarity: Item['rarity'];
  icon: string;
}

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  // ── Weapons ────────────────────────────────────────────────────────────────
  rusty_dagger: {
    templateId: 'rusty_dagger', name: 'Rusty Dagger', type: 'weapon', slot: 'weapon',
    description: 'A chipped blade that has seen better days.', baseValue: 5, rarity: 'common',
    effect: { damageBonus: 2 }, icon: '🗡️',
  },
  iron_sword: {
    templateId: 'iron_sword', name: 'Iron Sword', type: 'weapon', slot: 'weapon',
    description: 'A dependable short sword forged from common iron.', baseValue: 20, rarity: 'common',
    effect: { damageBonus: 4 }, icon: '⚔️',
  },
  orcish_axe: {
    templateId: 'orcish_axe', name: 'Orcish Axe', type: 'weapon', slot: 'weapon',
    description: 'A heavy notched axe with savage weight behind each swing.', baseValue: 40, rarity: 'uncommon',
    effect: { damageBonus: 7, statBonus: { strength: 2 } }, icon: '🪓',
  },
  dark_staff: {
    templateId: 'dark_staff', name: 'Staff of Shadows', type: 'weapon', slot: 'weapon',
    description: 'Carved from blackened bone. Whispers secrets in the dark.', baseValue: 60, rarity: 'uncommon',
    effect: { damageBonus: 5, statBonus: { intelligence: 3 } }, icon: '🪄',
  },
  flame_sword: {
    templateId: 'flame_sword', name: 'Flame Sword', type: 'weapon', slot: 'weapon',
    description: 'A blade shimmering with captured dragon fire.', baseValue: 120, rarity: 'rare',
    effect: { damageBonus: 12, statBonus: { strength: 3 } }, icon: '🔥',
  },
  necrotic_staff: {
    templateId: 'necrotic_staff', name: 'Staff of Endings', type: 'weapon', slot: 'weapon',
    description: 'Radiates a fell cold. To wield it costs more than gold.', baseValue: 150, rarity: 'rare',
    effect: { damageBonus: 14, statBonus: { intelligence: 5 } }, icon: '☠️',
  },

  // ── Armor ──────────────────────────────────────────────────────────────────
  tattered_armor: {
    templateId: 'tattered_armor', name: 'Tattered Gambeson', type: 'armor', slot: 'armor',
    description: 'Frayed padded cloth. Better than nothing.', baseValue: 6, rarity: 'common',
    effect: { armorBonus: 1 }, icon: '👕',
  },
  iron_shield: {
    templateId: 'iron_shield', name: 'Iron Buckler', type: 'armor', slot: 'armor',
    description: 'A battered shield that has turned away many blows.', baseValue: 25, rarity: 'common',
    effect: { armorBonus: 3, statBonus: { strength: 1 } }, icon: '🛡️',
  },
  troll_hide: {
    templateId: 'troll_hide', name: 'Troll-Hide Vest', type: 'armor', slot: 'armor',
    description: 'Cured from a cave troll. Unpleasant to the touch but surprisingly tough.', baseValue: 50, rarity: 'uncommon',
    effect: { armorBonus: 5, hpBonus: 10 }, icon: '🥋',
  },
  granite_shield: {
    templateId: 'granite_shield', name: 'Granite Aegis', type: 'armor', slot: 'armor',
    description: 'Hewn from ensorcelled rock. Weighs a ton.', baseValue: 100, rarity: 'rare',
    effect: { armorBonus: 9, statBonus: { strength: 2 } }, icon: '🪨',
  },
  dragon_scale: {
    templateId: 'dragon_scale', name: 'Dragon Scale Plate', type: 'armor', slot: 'armor',
    description: 'Scales scraped from the hide of an Ancient Dragon. Near impenetrable.', baseValue: 200, rarity: 'legendary',
    effect: { armorBonus: 14, hpBonus: 25 }, icon: '🐲',
  },

  // ── Trinkets ───────────────────────────────────────────────────────────────
  bone_charm: {
    templateId: 'bone_charm', name: 'Bone Charm', type: 'trinket', slot: 'trinket',
    description: 'A superstitious bauble that wards off misfortune.', baseValue: 10, rarity: 'common',
    effect: { statBonus: { wisdom: 2 } }, icon: '🦴',
  },
  silver_fragment: {
    templateId: 'silver_fragment', name: 'Silver Ward', type: 'trinket', slot: 'trinket',
    description: 'A sliver of pure silver that repels dark creatures.', baseValue: 35, rarity: 'uncommon',
    effect: { statBonus: { wisdom: 3, charisma: 2 } }, icon: '🪙',
  },
  mana_crystal: {
    templateId: 'mana_crystal', name: 'Mana Crystal', type: 'trinket', slot: 'trinket',
    description: 'Pulses with raw arcane potential.', baseValue: 55, rarity: 'uncommon',
    effect: { mpBonus: 15, statBonus: { intelligence: 2 } }, icon: '💎',
  },
  death_ring: {
    templateId: 'death_ring', name: 'Ring of the Revenant', type: 'trinket', slot: 'trinket',
    description: 'Cold to the touch. Once per quest, prevents the wearer from dying.', baseValue: 180, rarity: 'legendary',
    effect: { statBonus: { wisdom: 4, intelligence: 4 } }, icon: '💍',
  },
  legendary_trinket: {
    templateId: 'legendary_trinket', name: 'Amulet of Fates', type: 'trinket', slot: 'trinket',
    description: 'Carved with the faces of gods. Grants favor beyond understanding.', baseValue: 250, rarity: 'legendary',
    effect: { statBonus: { strength: 3, intelligence: 3, wisdom: 3, agility: 3, charisma: 3 } }, icon: '🌟',
  },

  // ── Potions ────────────────────────────────────────────────────────────────
  minor_health_potion: {
    templateId: 'minor_health_potion', name: 'Minor Health Potion', type: 'potion',
    description: 'A small red vial. Restores 20 HP when consumed.', baseValue: 12, rarity: 'common',
    effect: { healAmount: 20 }, icon: '❤️',
  },
  health_potion: {
    templateId: 'health_potion', name: 'Health Potion', type: 'potion',
    description: 'A rich ruby draught. Restores 50 HP when consumed.', baseValue: 30, rarity: 'uncommon',
    effect: { healAmount: 50 }, icon: '🧪',
  },
  mana_potion: {
    templateId: 'mana_potion', name: 'Mana Potion', type: 'potion',
    description: 'Shimmers with blue light. Restores 30 MP when consumed.', baseValue: 30, rarity: 'uncommon',
    effect: { mpRestoreAmount: 30 }, icon: '💙',
  },
  elixir_of_strength: {
    templateId: 'elixir_of_strength', name: 'Elixir of Might', type: 'potion',
    description: 'Tastes of iron and thunder. Grants +5 Strength for a quest floor.', baseValue: 45, rarity: 'rare',
    effect: { statBonus: { strength: 5 } }, icon: '💪',
  },

  // ── Ingredients (Cellar) ───────────────────────────────────────────────────
  healing_herb: {
    templateId: 'healing_herb', name: 'Healing Herb', type: 'ingredient',
    description: 'A bright green sprig with a warm, earthy scent.', baseValue: 4, rarity: 'common',
    effect: {}, icon: '🌿',
  },
  slime_vial: {
    templateId: 'slime_vial', name: 'Slime Extract', type: 'ingredient',
    description: 'A captured glob of green slime in a cork-sealed vial.', baseValue: 6, rarity: 'common',
    effect: {}, icon: '🫧',
  },
  wolf_pelt: {
    templateId: 'wolf_pelt', name: 'Wolf Pelt', type: 'ingredient',
    description: 'Thick grey fur, still warm.', baseValue: 8, rarity: 'common',
    effect: {}, icon: '🐺',
  },
  phylactery_shard: {
    templateId: 'phylactery_shard', name: 'Phylactery Shard', type: 'ingredient',
    description: 'A fragment of a shattered soul vessel. Pulses faintly.', baseValue: 30, rarity: 'rare',
    effect: {}, icon: '🔮',
  },
  elemental_stone: {
    templateId: 'elemental_stone', name: 'Elemental Stone', type: 'ingredient',
    description: 'Crackling with elemental energy.', baseValue: 25, rarity: 'rare',
    effect: {}, icon: '🌀',
  },

  // Kitchen items
  pouch_of_coins: {
    templateId: 'pouch_of_coins', name: 'Pouch of Coins', type: 'ingredient',
    description: 'A small purse of clattering gold coins.', baseValue: 15, rarity: 'common',
    effect: {}, icon: '💰',
  },
};

// Potion recipes for the Cellar minigame
export const POTION_RECIPES: Array<{ ingredients: [string, string]; result: string }> = [
  { ingredients: ['healing_herb', 'healing_herb'],  result: 'minor_health_potion' },
  { ingredients: ['healing_herb', 'slime_vial'],    result: 'health_potion' },
  { ingredients: ['slime_vial', 'mana_crystal'],    result: 'mana_potion' },
  { ingredients: ['elemental_stone', 'wolf_pelt'],  result: 'elixir_of_strength' },
];

