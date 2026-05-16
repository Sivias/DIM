import type { Enemy, QuestEnvironment } from '../data/types';
import { ENEMY_TEMPLATES, ENV_ENEMY_POOLS } from '../data/enemyData';
import { uid, pick, pickN, randInt } from '../utils/random';

/** Instantiate an enemy from a template, scaled to difficulty */
export function spawnEnemy(templateId: string, difficultyScale = 1.0): Enemy {
  const tpl = ENEMY_TEMPLATES[templateId];
  if (!tpl) throw new Error(`Unknown enemy template: ${templateId}`);

  const scale = 0.8 + difficultyScale * 0.4; // 1.0 at difficulty 1.5
  return {
    id: uid(),
    templateId,
    name: tpl.name,
    hp:    Math.floor(tpl.baseHp * scale),
    maxHp: Math.floor(tpl.baseHp * scale),
    stats:  { ...tpl.baseStats },
    damage: Math.floor(tpl.baseDamage * scale),
    armor:  tpl.baseArmor,
    xpValue:   tpl.xpValue,
    goldValue: tpl.goldValue,
    lootTable:      [...tpl.lootTable],
    specialAbility: tpl.specialAbility,
    icon:    tpl.icon,
    color:   tpl.color,
    statusEffects: [],
  };
}

/** Pick an encounter group for an environment and difficulty */
export function generateEncounter(env: QuestEnvironment, difficulty: number): Enemy[] {
  const pool = ENV_ENEMY_POOLS[env] ?? ENV_ENEMY_POOLS.dungeon;

  // Filter pool by tier vs difficulty
  const allowedTiers = difficulty <= 2 ? [1] : difficulty <= 4 ? [1, 2] : [2, 3];
  const eligible = pool.filter((id) => {
    const tpl = ENEMY_TEMPLATES[id];
    return tpl && allowedTiers.includes(tpl.tier);
  });

  const available = eligible.length ? eligible : pool;

  // Count: 1-3 enemies for lower difficulty, 3-5 for high
  const min = difficulty <= 2 ? 1 : 2;
  const max = difficulty <= 2 ? 3 : difficulty <= 4 ? 4 : 5;
  const count = randInt(min, max);

  const chosen = pickN(available, count);
  if (!chosen.length) chosen.push(pick(pool));

  return chosen.map((id) => spawnEnemy(id, difficulty * 0.5));
}

/** Generate a boss enemy for floor completion */
export function generateBoss(env: QuestEnvironment, difficulty: number): Enemy {
  const bossPool = difficulty >= 4
    ? ['dragon', 'lich', 'golem']
    : difficulty >= 3
      ? ['troll', 'werewolf', 'dark_mage']
      : ['orc', 'troll'];

  const pool = ENV_ENEMY_POOLS[env] ?? bossPool;
  const bigEnemies = pool.filter((id) => {
    const tpl = ENEMY_TEMPLATES[id];
    return tpl && tpl.tier >= 2;
  });

  const id = bigEnemies.length ? pick(bigEnemies) : pick(bossPool);
  const enemy = spawnEnemy(id, difficulty);
  // Bosses are stronger
  enemy.hp = Math.floor(enemy.hp * 1.5);
  enemy.maxHp = enemy.hp;
  enemy.damage = Math.floor(enemy.damage * 1.3);
  enemy.xpValue = Math.floor(enemy.xpValue * 2);
  enemy.goldValue = Math.floor(enemy.goldValue * 2);
  enemy.name = `Champion ${enemy.name}`;
  return enemy;
}

