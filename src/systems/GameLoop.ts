import { tickParties } from './QuestSystem';

let lastTime = 0;
let rafId: number;
let running = false;

function loop(timestamp: number) {
  if (!running) return;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.5); // cap at 500ms to avoid huge jumps
  lastTime = timestamp;
  tickParties(dt);
  rafId = requestAnimationFrame(loop);
}

export function startGameLoop(): void {
  if (running) return;
  running = true;
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

export function stopGameLoop(): void {
  running = false;
  cancelAnimationFrame(rafId);
}

