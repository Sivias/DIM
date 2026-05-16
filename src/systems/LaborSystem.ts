import {
  state,
  useLabor,
  addBonusIncome,
  addLog,
  advanceDay,
  setHeroPool,
  markChoreComplete,
  isChoreComplete,
} from '../state/store';
import { generateHeroPool } from './HeroSystem';
import { POOL_SIZE_BY_LEVEL } from '../data/roomData';

export function doChore(choreKey: string, laborCost: number, bonusGold: number, message: string): boolean {
  if (isChoreComplete(choreKey)) {
    addLog(`You've already done that today.`, state.activeScreen as Parameters<typeof addLog>[1]);
    return false;
  }
  if (laborCost > 0 && !useLabor(laborCost)) return false;
  if (bonusGold > 0) addBonusIncome(bonusGold);
  if (message) addLog(message, state.activeScreen as Parameters<typeof addLog>[1]);
  markChoreComplete(choreKey);
  return true;
}

export function canAdvanceDay(): boolean {
  return state.laborUsed >= state.laborMax || state.laborUsed > 0;
}

export function tryAdvanceDay(): void {
  advanceDay();
  // Refresh bar pool once per day
  if (state.lastPoolRefreshDay < state.day) {
    const poolSize = POOL_SIZE_BY_LEVEL[state.roomLevels.bar] ?? 3;
    const pool = generateHeroPool(poolSize, state.roomLevels.stable);
    setHeroPool(pool);
  }
}

export function laborPercent(): number {
  return state.laborMax > 0 ? state.laborUsed / state.laborMax : 0;
}



