import type { JSX } from 'solid-js';
import { For } from 'solid-js';
import type { BaseStats } from '../../data/types';
import { STAT_ABBR } from '../../utils/formatting';

interface StatBlockProps {
  stats: BaseStats;
}

export default function StatBlock(props: StatBlockProps): JSX.Element {
  const entries = () =>
    Object.entries(props.stats) as [keyof BaseStats, number][];

  return (
    <div class="stats-grid">
      <For each={entries()}>
        {([key, val]) => (
          <div class="stat-box">
            <span class="stat-abbr">{STAT_ABBR[key] ?? key.slice(0, 3).toUpperCase()}</span>
            <span class="stat-value">{val}</span>
          </div>
        )}
      </For>
    </div>
  );
}

