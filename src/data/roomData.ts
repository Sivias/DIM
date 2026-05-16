import type { RoomUpgrade } from './types';

export interface RoomDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  upgrades: RoomUpgrade[];
  laborCostPerChore: number;
}

export const ROOM_DEFS: Record<string, RoomDef> = {
  hearth: {
    id: 'hearth',
    label: 'The Hearth',
    icon: '🔥',
    description: 'The beating heart of the inn. Heroes gather here by the fire, ready for adventure.',
    laborCostPerChore: 1,
    upgrades: [
      { level: 2, cost: 150, label: 'Carved Mantle', description: 'A proper stone mantle. Allows 2 simultaneous parties and better quest variety.' },
      { level: 3, cost: 400, label: 'Grand Fireplace', description: 'A roaring hearth worthy of heroes. 3 parties simultaneously and elite quest access.' },
    ],
  },
  bar: {
    id: 'bar',
    label: 'The Bar',
    icon: '🍺',
    description: 'Adventurers gather here seeking coin and glory. Hire heroes, clean the counter, and keep the keg fresh.',
    laborCostPerChore: 1,
    upgrades: [
      { level: 2, cost: 120, label: 'Polished Counter', description: 'The bar gleams. Attracts better quality adventurers. Pool grows to 6.' },
      { level: 3, cost: 350, label: 'Grand Tap Room', description: 'A renowned watering hole. Heroes come from afar. Pool grows to 9 with rare classes.' },
    ],
  },
  guestRooms: {
    id: 'guestRooms',
    label: 'Guest Rooms',
    icon: '🛏️',
    description: 'Rooms for rent. Each hired hero needs a bed. Tidy the rooms for extra income.',
    laborCostPerChore: 1,
    upgrades: [
      { level: 2, cost: 200, label: 'Repaired Floorboards', description: 'Solid floors and fresh coats of paint. Capacity grows to 6.' },
      { level: 3, cost: 500, label: 'Fine Lodgings', description: 'Comfortable rooms worthy of legendary heroes. Capacity grows to 12.' },
    ],
  },
  kitchen: {
    id: 'kitchen',
    label: 'The Kitchen',
    icon: '🍳',
    description: 'Feed the inn. Sorting provisions and keeping things organised boosts daily income.',
    laborCostPerChore: 1,
    upgrades: [
      { level: 2, cost: 180, label: 'New Cook Stove', description: 'Hot food draws paying guests. Unlocks ration buffs for departing parties.' },
      { level: 3, cost: 450, label: 'Proper Larder', description: 'Abundant stores. Provides richer rations and higher income bonuses.' },
    ],
  },
  cellar: {
    id: 'cellar',
    label: 'The Cellar',
    icon: '⚗️',
    description: 'A hidden laboratory below the inn. Brew potions from quest ingredients.',
    laborCostPerChore: 1,
    upgrades: [
      { level: 2, cost: 220, label: 'Alchemist\'s Corner', description: 'Proper equipment. Inventory capacity grows to 12 potions.' },
      { level: 3, cost: 550, label: 'Alchemist\'s Workshop', description: 'Advanced alchemy unlocked. Rare elixirs possible. Capacity 24.' },
    ],
  },
  stable: {
    id: 'stable',
    label: 'The Stable',
    icon: '🐴',
    description: 'Keep the horses healthy and the hay fresh. A happy stable attracts better-equipped heroes.',
    laborCostPerChore: 1,
    upgrades: [
      { level: 2, cost: 160, label: 'Repaired Stalls', description: 'Proper stalls attract more horses and better-mounted heroes (may arrive equipped).' },
      { level: 3, cost: 400, label: 'Prize Stables', description: 'Heroes arrive equipped 50% more often with weapons, armor, or trinkets.' },
    ],
  },
};

// Max heroes based on guest room level
export const MAX_HEROES_BY_LEVEL: Record<number, number> = { 1: 4, 2: 8, 3: 12 };

// Hero pool size based on bar level
export const POOL_SIZE_BY_LEVEL: Record<number, number> = { 1: 3, 2: 6, 3: 9 };

// Max simultaneous parties based on hearth level
export const MAX_PARTIES_BY_LEVEL: Record<number, number> = { 1: 1, 2: 2, 3: 3 };

// Cellar capacity based on level
export const CELLAR_CAPACITY_BY_LEVEL: Record<number, number> = { 1: 6, 2: 12, 3: 24 };

// Daily rent income per occupied room
export const DAILY_RENT = 8;
// Daily expense deducted
export const DAILY_EXPENSE = 10;
// Gold cost to manually refresh the hero pool
export const POOL_REFRESH_COST = 20;


