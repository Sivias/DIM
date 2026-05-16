/** Roll a single die with `sides` faces, returning 1–sides. */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export const d4  = () => rollDie(4);
export const d6  = () => rollDie(6);
export const d8  = () => rollDie(8);
export const d10 = () => rollDie(10);
export const d12 = () => rollDie(12);
export const d20 = () => rollDie(20);

/** Roll multiple dice and sum them (e.g. roll(2, 6) = 2d6). */
export function roll(count: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) total += rollDie(sides);
  return total;
}

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

