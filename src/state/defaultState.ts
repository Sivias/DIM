import type { GameState } from '../data/types';

export function makeDefaultState(): GameState {
  return {
    initialized: true,
    gold: 50,
    day: 1,
    laborUsed: 0,
    laborMax: 8,
    roomLevels: {
      hearth: 1,
      bar: 1,
      guestRooms: 1,
      kitchen: 1,
      cellar: 1,
      stable: 1,
    },
    heroes: [],
    heroPool: [],
    lastPoolRefreshDay: 0,
    parties: [],
    cellarInventory: [],
    log: [
      {
        id: 'welcome',
        timestamp: Date.now(),
        day: 1,
        category: 'inn',
        message: 'The door swings open with a groan. Cobwebs stir. The inn is yours — but it won\'t fix itself.',
        isMajor: true,
      },
    ],
    activeScreen: 'inn',
    activePartyId: null,
    logFilters: ['inn', 'major'],
    dailyBonusIncome: 0,
    completedChores: [],
    devMode: false,
  };
}





