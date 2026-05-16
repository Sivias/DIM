/** Fill template placeholders in flavor text strings. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

/** Pick a random template from an array and fill placeholders. */
import { pick } from './random';
export function flavorText(templates: string[], vars: Record<string, string> = {}): string {
  return fillTemplate(pick(templates), vars);
}

/** Format gold with commas: 1234 → "1,234 gold" */
export function formatGold(amount: number): string {
  return amount.toLocaleString() + ' gold';
}

/** Format seconds into "Xm Ys" string. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/** Capitalize the first letter of a string. */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Friendly class label with capital. */
export function classLabel(heroClass: string): string {
  return capitalize(heroClass.replace('_', ' '));
}

/** Stat abbreviation. */
export const STAT_ABBR: Record<string, string> = {
  strength: 'STR',
  intelligence: 'INT',
  wisdom: 'WIS',
  agility: 'AGI',
  charisma: 'CHA',
};

