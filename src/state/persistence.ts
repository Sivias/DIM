import type { GameState } from '../data/types';
import { makeDefaultState } from './defaultState';

const STORAGE_KEY = 'dungeon_inn_save';

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game state:', e);
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed.initialized) return null;

    // Merge with defaults so any fields added after the save still have sane values
    const defaults = makeDefaultState();
    return {
      ...defaults,
      ...parsed,
      // Nested objects — spread defaults first so new keys survive
      roomLevels: { ...defaults.roomLevels, ...(parsed.roomLevels ?? {}) },
      // Array fields that must never be undefined
      heroes:          parsed.heroes          ?? [],
      heroPool:        parsed.heroPool         ?? [],
      parties:         parsed.parties          ?? [],
      cellarInventory: parsed.cellarInventory  ?? [],
      log:             parsed.log              ?? defaults.log,
      logFilters:      parsed.logFilters       ?? defaults.logFilters,
      completedChores: parsed.completedChores  ?? [],
    };
  } catch (e) {
    console.warn('Failed to load game state:', e);
    return null;
  }
}

export function resetState(): GameState {
  localStorage.removeItem(STORAGE_KEY);
  return makeDefaultState();
}
