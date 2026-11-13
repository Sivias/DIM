import { createSignal } from 'solid-js';

export type CookPhase = 'idle' | 'heating' | 'awaiting' | 'burned';

export const [cookHeat,  setCookHeat]  = createSignal(0);
export const [cookPhase, setCookPhase] = createSignal<CookPhase>('idle');

export function resetCookState(): void {
  setCookHeat(0);
  setCookPhase('idle');
}
