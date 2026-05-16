import type { QuestEnvironment } from './types';

export interface QuestTemplate {
  templateId: string;
  name: string;
  description: string;
  environment: QuestEnvironment;
  minDifficulty: number;
  maxDifficulty: number;
  totalFloors: number;
  isDungeon: boolean;
  baseGold: number;
  baseXp: number;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  // ── Town / Simple quests ──────────────────────────────────────────────────
  {
    templateId: 'rat_infestation',
    name: 'Rat Infestation',
    description: 'The miller\'s cellar is overrun with giant rats. Exterminate them before the grain is spoiled.',
    environment: 'town', minDifficulty: 1, maxDifficulty: 2, totalFloors: 1,
    isDungeon: false, baseGold: 25, baseXp: 30,
  },
  {
    templateId: 'bandit_road',
    name: 'Bandit on the Road',
    description: 'A gang of brigands has taken the south road. The merchant guild offers a handsome reward.',
    environment: 'town', minDifficulty: 1, maxDifficulty: 3, totalFloors: 1,
    isDungeon: false, baseGold: 40, baseXp: 50,
  },
  {
    templateId: 'missing_cat',
    name: 'The Dame\'s Missing Cat',
    description: 'Lady Moorfield\'s prize-winning cat has vanished into the alleyways. She is inconsolable.',
    environment: 'town', minDifficulty: 1, maxDifficulty: 1, totalFloors: 1,
    isDungeon: false, baseGold: 15, baseXp: 20,
  },

  // ── Forest ────────────────────────────────────────────────────────────────
  {
    templateId: 'goblin_camp',
    name: 'Goblin Camp in the Thicket',
    description: 'Goblins have made a camp in Ashwood, raiding travellers and farmers alike.',
    environment: 'forest', minDifficulty: 1, maxDifficulty: 3, totalFloors: 2,
    isDungeon: false, baseGold: 50, baseXp: 65,
  },
  {
    templateId: 'werewolf_hunt',
    name: 'A Wolf Among Sheep',
    description: 'Mutilated livestock on the forest edge. A silver-tongued hunter suspects something… supernatural.',
    environment: 'forest', minDifficulty: 2, maxDifficulty: 4, totalFloors: 2,
    isDungeon: false, baseGold: 70, baseXp: 90,
  },
  {
    templateId: 'lost_expedition',
    name: 'The Lost Expedition',
    description: 'A scouting party sent to map the Thornwood has gone silent. Find survivors.',
    environment: 'forest', minDifficulty: 2, maxDifficulty: 3, totalFloors: 1,
    isDungeon: false, baseGold: 60, baseXp: 75,
  },

  // ── Cave ──────────────────────────────────────────────────────────────────
  {
    templateId: 'cave_slimes',
    name: 'The Oozing Grotto',
    description: 'Acidic slime has begun eating through the foundations of the quarry. Source it.',
    environment: 'cave', minDifficulty: 1, maxDifficulty: 2, totalFloors: 2,
    isDungeon: false, baseGold: 45, baseXp: 55,
  },
  {
    templateId: 'troll_bridge',
    name: 'Under the Bridge',
    description: 'A troll has claimed the river crossing. No merchant dare cross without tribute.',
    environment: 'cave', minDifficulty: 2, maxDifficulty: 4, totalFloors: 2,
    isDungeon: false, baseGold: 80, baseXp: 100,
  },

  // ── Quarry ────────────────────────────────────────────────────────────────
  {
    templateId: 'risen_workers',
    name: 'The Risen Workers',
    description: 'The old quarry was sealed for reason. Something stirs among the stone and bones.',
    environment: 'quarry', minDifficulty: 2, maxDifficulty: 4, totalFloors: 2,
    isDungeon: false, baseGold: 75, baseXp: 95,
  },

  // ── Dungeon ───────────────────────────────────────────────────────────────
  {
    templateId: 'dungeon_upper',
    name: 'Upper Vaults',
    description: 'The upper floors of the dungeon beneath the inn. Clammy, dark, and teeming with the restless dead.',
    environment: 'dungeon', minDifficulty: 1, maxDifficulty: 3, totalFloors: 3,
    isDungeon: true, baseGold: 80, baseXp: 100,
  },
  {
    templateId: 'dungeon_mid',
    name: 'The Sunken Hold',
    description: 'Deeper passages filled with ancient traps and the servants of a forgotten warlord.',
    environment: 'dungeon', minDifficulty: 3, maxDifficulty: 4, totalFloors: 4,
    isDungeon: true, baseGold: 150, baseXp: 200,
  },
  {
    templateId: 'dungeon_deep',
    name: 'The Abyssal Depths',
    description: 'No one who has returned from the bottom can speak of what lurks there without weeping.',
    environment: 'dungeon', minDifficulty: 4, maxDifficulty: 5, totalFloors: 5,
    isDungeon: true, baseGold: 300, baseXp: 400,
  },
];

