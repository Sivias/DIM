// ─── Hero ────────────────────────────────────────────────────────────────────
export type HeroClass = 'knight' | 'wizard' | 'cleric' | 'bard' | 'ranger' | 'rogue';
export type HeroStatus = 'available' | 'on_quest' | 'resting' | 'dead';

export interface BaseStats {
  strength: number;
  intelligence: number;
  wisdom: number;
  agility: number;
  charisma: number;
}

export interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  trinket: Item | null;
}

export interface TrackedStats {
  monstersSlain: number;
  questsCompleted: number;
  goldEarned: number;
  damageDone: number;
  damageReceived: number;
  healingDone: number;
  itemsFound: number;
}

export interface Hero {
  id: string;
  name: string;
  heroClass: HeroClass;
  level: number;
  xp: number;
  xpToNext: number;
  stats: BaseStats;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  equipment: Equipment;
  abilities: string[];           // ability IDs
  status: HeroStatus;
  trackedStats: TrackedStats;
  hireDay: number;
  portrait: string;              // CSS color class for placeholder art
}

// ─── Item ────────────────────────────────────────────────────────────────────
export type ItemType = 'weapon' | 'armor' | 'trinket' | 'potion' | 'ingredient';
export type EquipSlot = 'weapon' | 'armor' | 'trinket';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface ItemEffect {
  statBonus?: Partial<BaseStats>;
  hpBonus?: number;
  mpBonus?: number;
  damageBonus?: number;
  armorBonus?: number;
  healAmount?: number;
  mpRestoreAmount?: number;
}

export interface Item {
  id: string;
  templateId: string;
  name: string;
  type: ItemType;
  slot?: EquipSlot;
  description: string;
  value: number;
  effect: ItemEffect;
  rarity: ItemRarity;
  icon: string;                  // emoji placeholder
}

// ─── Ability ─────────────────────────────────────────────────────────────────
export type TargetType = 'single_enemy' | 'all_enemies' | 'single_ally' | 'lowest_ally' | 'all_allies' | 'self';

export interface AbilityEffect {
  damage?: number;
  damageMult?: number;
  heal?: number;
  healMult?: number;
  stun?: number;
  damageRedirect?: boolean;
  shieldAmount?: number;
  buffStat?: keyof BaseStats;
  buffValue?: number;
  buffDuration?: number;
}

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  heroClass: HeroClass;
  mpCost: number;
  cooldown: number;
  targetType: TargetType;
  effect: AbilityEffect;
  icon: string;
}

// ─── Enemy ───────────────────────────────────────────────────────────────────
export interface LootEntry {
  itemTemplateId: string;
  chance: number;
}

export interface EnemyTemplate {
  templateId: string;
  name: string;
  tier: 1 | 2 | 3;
  baseHp: number;
  baseStats: BaseStats;
  baseDamage: number;
  baseArmor: number;
  xpValue: number;
  goldValue: number;
  lootTable: LootEntry[];
  specialAbility?: string;
  icon: string;
  color: string;
}

export interface Enemy {
  id: string;
  templateId: string;
  name: string;
  hp: number;
  maxHp: number;
  stats: BaseStats;
  damage: number;
  armor: number;
  xpValue: number;
  goldValue: number;
  lootTable: LootEntry[];
  specialAbility?: string;
  icon: string;
  color: string;
  statusEffects: StatusEffect[];
}

// ─── Combat ──────────────────────────────────────────────────────────────────
export type StatusEffectType = 'stun' | 'bleed' | 'blessed' | 'buffed' | 'shielded';

export interface StatusEffect {
  type: StatusEffectType;
  remaining: number;
  value?: number;
}

export interface Combatant {
  id: string;
  name: string;
  type: 'hero' | 'enemy';
  hp: number;
  maxHp: number;
  initiative: number;
  statusEffects: StatusEffect[];
  shieldAmount: number;
}

export interface CombatState {
  combatants: Combatant[];
  currentTurnIndex: number;
  round: number;
  isActive: boolean;
  log: string[];
}

// ─── Quest & Events ──────────────────────────────────────────────────────────
export type QuestEnvironment = 'dungeon' | 'forest' | 'cave' | 'town' | 'quarry' | 'sewer' | 'seaside';
export type EventType = 'combat' | 'discovery' | 'trap' | 'lore' | 'choice' | 'boss' | 'treasure' | 'rest';

export interface ChoiceOption {
  label: string;
  description: string;
  effect: {
    goldDelta?: number;
    damage?: number;
    heal?: number;
    flee?: boolean;
  };
}

export interface PlayerChoice {
  prompt: string;
  options: ChoiceOption[];
}

export interface QuestEvent {
  id: string;
  type: EventType;
  flavor: string;
  enemies?: Enemy[];
  lootItems?: Item[];
  goldReward?: number;
  xpReward?: number;
  damage?: number;
  choice?: PlayerChoice;
}

export interface Quest {
  id: string;
  templateId: string;
  name: string;
  description: string;
  environment: QuestEnvironment;
  difficulty: 1 | 2 | 3 | 4 | 5;
  totalFloors: number;
  goldReward: number;
  xpReward: number;
  isDungeon: boolean;
}

export type PartyStatus = 'active' | 'in_combat' | 'resting' | 'returning' | 'complete' | 'waiting_choice' | 'wiped';

export interface Party {
  id: string;
  heroIds: string[];
  quest: Quest;
  status: PartyStatus;
  currentFloor: number;
  floorProgress: number;       // 0–1
  timeElapsed: number;         // seconds
  recallTimeRemaining: number | null;
  eventLog: string[];
  awaitingChoice: PlayerChoice | null;
  combatState: CombatState | null;
  inventory: Item[];           // items picked up during quest
  goldFound: number;
}

// ─── Inn Rooms ───────────────────────────────────────────────────────────────
export type RoomId = 'hearth' | 'bar' | 'guestRooms' | 'kitchen' | 'cellar' | 'stable';

export interface RoomUpgrade {
  level: number;
  cost: number;
  label: string;
  description: string;
}

export interface RoomLevels {
  hearth: number;
  bar: number;
  guestRooms: number;
  kitchen: number;
  cellar: number;
  stable: number;
}

// ─── Log ────────────────────────────────────────────────────────────────────
export type LogCategory = 'inn' | 'hearth' | 'bar' | 'guestRooms' | 'kitchen' | 'cellar' | 'stable' | 'adventure' | 'major';

export interface LogEntry {
  id: string;
  timestamp: number;
  day: number;
  category: LogCategory;
  message: string;
  isMajor: boolean;
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export type ActiveScreen = 'inn' | RoomId | 'adventure' | 'settings';

// ─── Full Game State ──────────────────────────────────────────────────────────
export interface GameState {
  initialized: boolean;
  gold: number;
  day: number;
  laborUsed: number;
  laborMax: number;
  roomLevels: RoomLevels;
  heroes: Hero[];
  heroPool: Hero[];              // available to hire at the bar
  lastPoolRefreshDay: number;
  parties: Party[];
  cellarInventory: Item[];
  log: LogEntry[];
  activeScreen: ActiveScreen;
  activePartyId: string | null;
  logFilters: LogCategory[];
  dailyBonusIncome: number;     // from chores during the day
  completedChores: string[];    // chore keys finished this day
  devMode: boolean;
}



