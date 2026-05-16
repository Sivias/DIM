import type { JSX } from 'solid-js';
import { For, createMemo, createSignal } from 'solid-js';
import { state, toggleLogFilter } from '../../state/store';
import type { LogCategory } from '../../data/types';

// Canonical display order
const DEFAULT_ORDER: LogCategory[] = [
  'major', 'inn', 'hearth', 'bar', 'guestRooms', 'kitchen', 'cellar', 'stable', 'adventure',
];

const FILTER_ICONS: Record<LogCategory, string> = {
  major:      '⭐',
  inn:        '🏠',
  hearth:     '🔥',
  bar:        '🍺',
  guestRooms: '🛏️',
  kitchen:    '🍳',
  cellar:     '⚗️',
  stable:     '🐴',
  adventure:  '⚔️',
};

const FILTER_TITLES: Record<LogCategory, string> = {
  major:      'Major events',
  inn:        'Inn',
  hearth:     'Hearth',
  bar:        'Bar',
  guestRooms: 'Guest Rooms',
  kitchen:    'Kitchen',
  cellar:     'Cellar',
  stable:     'Stable',
  adventure:  'Adventure',
};

export default function EventLog(): JSX.Element {
  const [filterOrder, setFilterOrder] = createSignal<LogCategory[]>(DEFAULT_ORDER);
  let dragSrc = -1;

  const visibleEntries = createMemo(() => {
    const filters = state.logFilters;
    return state.log
      .filter((e) => filters.includes(e.category) || (e.isMajor && filters.includes('major')))
      .slice(-80);
  });

  let logEl: HTMLDivElement | undefined;
  const scrollToBottom = () => {
    if (logEl) requestAnimationFrame(() => { if (logEl) logEl.scrollTop = logEl.scrollHeight; });
  };

  const onDragStart = (idx: number, e: DragEvent) => {
    dragSrc = idx;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (idx: number, e: DragEvent) => {
    e.preventDefault();
    if (dragSrc < 0 || dragSrc === idx) return;
    setFilterOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragSrc, 1);
      next.splice(idx, 0, item);
      dragSrc = idx;
      return next;
    });
  };

  const onDragEnd = () => { dragSrc = -1; };

  return (
    <div class="event-log">
      <div class="log-toolbar">
        <For each={filterOrder()}>
          {(cat, i) => (
            <button
              class={`log-filter-btn${state.logFilters.includes(cat) ? ' active' : ''}`}
              title={FILTER_TITLES[cat]}
              onClick={() => toggleLogFilter(cat)}
              draggable={true}
              onDragStart={(e) => onDragStart(i(), e)}
              onDragOver={(e) => onDragOver(i(), e)}
              onDragEnd={onDragEnd}
            >
              {FILTER_ICONS[cat]}
            </button>
          )}
        </For>
      </div>
      <div class="log-entries" ref={logEl}>
        <For each={visibleEntries()}>
          {(entry) => {
            scrollToBottom();
            return (
              <div class={`log-entry ${entry.isMajor ? 'major' : entry.category}`}>
                <span class="log-day">D{entry.day}</span>
                {entry.message}
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
