import { createStore, produce } from 'solid-js/store';
import { createEffect } from 'solid-js';
import type { GameState, Hero, Party, Item, LogEntry, LogCategory, ActiveScreen, CombatState, PlayerChoice } from '../data/types';
import { makeDefaultState } from './defaultState';
import { loadState, saveState } from './persistence';
import { uid } from '../utils/random';
import { resetCookState } from './cookState';

// ─── Store Creation ───────────────────────────────────────────────────────────
const initial = loadState() ?? makeDefaultState();
export const [state, setState] = createStore<GameState>(initial);

// Auto-save on any change (debounced)
let saveTimer: ReturnType<typeof setTimeout>;
createEffect(() => {
  JSON.stringify(state); // track all state
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(state), 500);
});

// ─── Navigation ───────────────────────────────────────────────────────────────
let _previousScreen: ActiveScreen = 'inn';

export function getPreviousScreen(): ActiveScreen {
  return _previousScreen;
}

export function navigateTo(screen: ActiveScreen, partyId?: string): void {
  _previousScreen = state.activeScreen;
  setState('activeScreen', screen);
  if (partyId !== undefined) setState('activePartyId', partyId);
}

export function navigateBack(): void {
  navigateTo(_previousScreen);
}

// ─── Log ─────────────────────────────────────────────────────────────────────
export function addLog(message: string, category: LogCategory = 'inn', isMajor = false): void {
  const entry: LogEntry = {
    id: uid(),
    timestamp: Date.now(),
    day: state.day,
    category,
    message,
    isMajor,
  };
  setState('log', (log) => [...log.slice(-199), entry]); // keep last 200 entries
}

// ─── Economy ──────────────────────────────────────────────────────────────────
export function addGold(amount: number, heroId?: string): void {
  setState('gold', (g) => g + amount);
  if (heroId) {
    const idx = state.heroes.findIndex((h) => h.id === heroId);
    if (idx >= 0) setState('heroes', idx, 'trackedStats', 'goldEarned', (g) => g + amount);
  }
}

export function spendGold(amount: number): boolean {
  if (state.gold < amount) return false;
  setState('gold', (g) => g - amount);
  return true;
}

// ─── Labor ───────────────────────────────────────────────────────────────────
export function useLabor(amount = 1): boolean {
  if (state.laborUsed >= state.laborMax) return false;
  setState('laborUsed', (l) => Math.min(state.laborMax, l + amount));
  return true;
}

export function addBonusIncome(amount: number): void {
  setState('dailyBonusIncome', (b) => b + amount);
}

export function markChoreComplete(key: string): void {
  setState('completedChores', (cs) => [...cs, key]);
}

export function isChoreComplete(key: string): boolean {
  return state.completedChores.includes(key);
}

// ─── Day Cycle ───────────────────────────────────────────────────────────────
export function advanceDay(): void {
  const rent    = state.heroes.length * 8;
  const bonus   = state.dailyBonusIncome; // already paid out; kept for log display only
  const expense = 10;
  const netGold = rent - expense;         // bonus was added immediately when earned

  setState(
    produce((s) => {
      s.gold = Math.max(0, s.gold + netGold);
      s.day += 1;
      s.laborUsed = 0;
      s.dailyBonusIncome = 0;
      s.completedChores = [];
    }),
  );

  resetCookState();

  addLog(
    `Day ${state.day - 1} ends. Rent: ${rent}g | Chores bonus: ${bonus}g | Expenses: ${expense}g | Net: ${netGold + bonus > 0 ? '+' : ''}${netGold + bonus}g`,
    'inn',
    true,
  );
}

// ─── Heroes ──────────────────────────────────────────────────────────────────
export function addHero(hero: Hero): void {
  setState('heroes', (h) => [...h, hero]);
}

export function removeHero(id: string): void {
  setState('heroes', (h) => h.filter((x) => x.id !== id));
}

export function updateHero(id: string, patch: Partial<Hero>): void {
  const idx = state.heroes.findIndex((h) => h.id === id);
  if (idx >= 0) setState('heroes', idx, patch as Hero);
}

export function setHeroStatus(id: string, status: Hero['status']): void {
  const idx = state.heroes.findIndex((h) => h.id === id);
  if (idx >= 0) setState('heroes', idx, 'status', status);
}

export function setHeroPool(pool: Hero[]): void {
  setState('heroPool', pool);
  setState('lastPoolRefreshDay', state.day);
}

// ─── Parties ─────────────────────────────────────────────────────────────────
export function addParty(party: Party): void {
  setState('parties', (p) => [...p, party]);
  party.heroIds.forEach((id) => setHeroStatus(id, 'on_quest'));
}

export function updateParty(id: string, patch: Partial<Party>): void {
  const idx = state.parties.findIndex((p) => p.id === id);
  if (idx >= 0) setState('parties', idx, patch as Party);
}

export function removeParty(id: string): void {
  setState('parties', (p) => p.filter((x) => x.id !== id));
}

export function setPartyCombat(partyId: string, combat: CombatState | null): void {
  const idx = state.parties.findIndex((p) => p.id === partyId);
  if (idx >= 0) setState('parties', idx, 'combatState', combat);
}

export function setPartyChoice(partyId: string, choice: PlayerChoice | null): void {
  const idx = state.parties.findIndex((p) => p.id === partyId);
  if (idx >= 0) {
    setState('parties', idx, 'awaitingChoice', choice);
    setState('parties', idx, 'status', choice ? 'waiting_choice' : 'active');
  }
}

export function addPartyItem(partyId: string, item: Item): void {
  const idx = state.parties.findIndex((p) => p.id === partyId);
  if (idx >= 0) setState('parties', idx, 'inventory', (inv) => [...inv, item]);
}

export function addPartyGold(partyId: string, amount: number): void {
  const idx = state.parties.findIndex((p) => p.id === partyId);
  if (idx >= 0) setState('parties', idx, 'goldFound', (g) => g + amount);
}

export function addPartyLog(partyId: string, message: string): void {
  const idx = state.parties.findIndex((p) => p.id === partyId);
  if (idx >= 0) setState('parties', idx, 'eventLog', (log) => [...log.slice(-99), message]);
  addLog(message, 'adventure');
}

// ─── Cellar Inventory ────────────────────────────────────────────────────────
export function addCellarItem(item: Item): void {
  setState('cellarInventory', (inv) => [...inv, item]);
}

export function removeCellarItem(id: string): void {
  setState('cellarInventory', (inv) => inv.filter((i) => i.id !== id));
}

// ─── Room Upgrade ─────────────────────────────────────────────────────────────
export function upgradeRoom(room: keyof GameState['roomLevels']): void {
  setState('roomLevels', room, (l) => l + 1);
}

// ─── Log Filters ─────────────────────────────────────────────────────────────
export function toggleLogFilter(cat: LogCategory): void {
  setState('logFilters', (filters) =>
    filters.includes(cat) ? filters.filter((f) => f !== cat) : [...filters, cat],
  );
}

// ─── Dev Mode ────────────────────────────────────────────────────────────────
export function setDevMode(enabled: boolean): void {
  setState('devMode', enabled);
}

// ─── Reset ───────────────────────────────────────────────────────────────────
export function resetGame(): void {
  const fresh = makeDefaultState();
  setState(produce((s) => {
    Object.assign(s, fresh);
  }));
}







