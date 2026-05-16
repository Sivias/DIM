import type { JSX } from 'solid-js';
import { createMemo, Show } from 'solid-js';
import { state } from '../../state/store';
import { tryAdvanceDay } from '../../systems/LaborSystem';

function getSkyPhase(used: number, max: number): string {
  if (used === 0)          return 'dawn';
  const pct = used / max;
  if (pct <= 3 / 8)       return 'morning';   // 1–3
  if (pct <= 5 / 8)       return 'midday';    // 4–5
  if (pct < 1)            return 'evening';   // 6–7
  return 'night';                              // 8 → moon
}

function bodyPos(pct: number, w: number, h: number): { x: number; y: number } {
  const angle = Math.PI * pct;
  const cx = w / 2, cy = h, rx = w * 0.44, ry = h * 0.82;
  return {
    x: cx - rx * Math.cos(angle) - 6,
    y: cy - ry * Math.sin(angle) - 6,
  };
}

export default function LaborBar(): JSX.Element {
  // Arc draws inside a 76×32 viewBox
  const W = 76, H = 32, arcR = 30;
  const cx = W / 2, cy = H;
  const arcLen = Math.PI * arcR;

  const pct    = createMemo(() => state.laborMax > 0 ? state.laborUsed / state.laborMax : 0);
  const phase  = createMemo(() => getSkyPhase(state.laborUsed, state.laborMax));
  const offset = createMemo(() => arcLen * (1 - pct()));
  const pos    = createMemo(() => bodyPos(pct(), W, H));
  const canEnd = createMemo(() => state.laborUsed >= state.laborMax || (state.devMode ?? false));
  // Skip the slide-back animation when the day resets so the dial snaps to the start
  const bodyStyle = createMemo(() => ({
    left: `${pos().x}px`,
    top:  `${pos().y}px`,
    transition: pct() === 0 ? 'none' : undefined,
  }));

  return (
    <div class="labor-bar" title={`Labor ${state.laborUsed}/${state.laborMax} · ${phase()}`}>
      <div class="labor-arc-container" style={{ width: `${W}px`, height: `${H}px` }}>
        <svg
          width={W} height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ overflow: 'visible', display: 'block' }}
        >
          <path
            d={`M ${cx - arcR} ${cy} A ${arcR} ${arcR} 0 0 1 ${cx + arcR} ${cy}`}
            class="labor-arc-bg"
          />
          <path
            d={`M ${cx - arcR} ${cy} A ${arcR} ${arcR} 0 0 1 ${cx + arcR} ${cy}`}
            class="labor-arc-fill"
            stroke-dasharray={String(arcLen)}
            stroke-dashoffset={String(offset())}
          />
          <Show when={canEnd()}>
            <text
              x={cx}
              y={cy - 3}
              text-anchor="middle"
              dominant-baseline="auto"
              class="labor-end-day-text"
              onClick={tryAdvanceDay}
            >end day</text>
          </Show>
        </svg>

        <Show
          when={canEnd()}
          fallback={<div class="labor-sun-body sun" style={bodyStyle()} />}
        >
          <button
            class="labor-sun-body moon labor-end-btn"
            style={bodyStyle()}
            onClick={tryAdvanceDay}
            title="End the day"
          />
        </Show>
      </div>

      <div class="labor-info">
        <span class="labor-text">{state.laborUsed}/{state.laborMax}</span>
        <span class="labor-phase">{phase()}</span>
      </div>
    </div>
  );
}








