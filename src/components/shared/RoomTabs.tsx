import type { JSX } from 'solid-js';
import { For, Show } from 'solid-js';
import { state, navigateTo } from '../../state/store';
import type { RoomId } from '../../data/types';

const TABS: Array<{ id: RoomId; icon: string; label: string }> = [
  { id: 'hearth',     icon: '🔥', label: 'Hearth'  },
  { id: 'bar',        icon: '🍺', label: 'Bar'     },
  { id: 'guestRooms', icon: '🛏️', label: 'Rooms'   },
  { id: 'kitchen',    icon: '🍳', label: 'Kitchen' },
  { id: 'cellar',     icon: '⚗️', label: 'Cellar'  },
  { id: 'stable',     icon: '🐴', label: 'Stable'  },
];

const ROOM_SCREENS = new Set<string>(['hearth','bar','guestRooms','kitchen','cellar','stable']);

export default function RoomTabs(): JSX.Element {
  return (
    <Show when={ROOM_SCREENS.has(state.activeScreen)}>
      <nav class="room-tabs" role="tablist">
        {/* Inn — always first, never "active" like a room tab */}
        <button
          class="room-tab room-tab-inn"
          onClick={() => navigateTo('inn')}
          title="Return to the Inn"
        >
          <span class="room-tab-icon">🏰</span>
          <span class="room-tab-label">Inn</span>
        </button>

        <For each={TABS}>
          {(tab) => (
            <button
              class={`room-tab${state.activeScreen === tab.id ? ' active' : ''}`}
              role="tab"
              aria-selected={state.activeScreen === tab.id}
              onClick={() => navigateTo(tab.id)}
            >
              <span class="room-tab-icon">{tab.icon}</span>
              <span class="room-tab-label">{tab.label}</span>
            </button>
          )}
        </For>
      </nav>
    </Show>
  );
}
