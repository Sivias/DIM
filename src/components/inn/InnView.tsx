import type { JSX } from 'solid-js';
import { state, navigateTo } from '../../state/store';
import type { RoomId } from '../../data/types';

const ZONES: Array<{ id: RoomId; icon: string; label: string; desc: string }> = [
  { id: 'hearth',     icon: '🔥', label: 'The Hearth',   desc: 'Quests & parties'  },
  { id: 'bar',        icon: '🍺', label: 'The Bar',      desc: 'Hire adventurers'  },
  { id: 'guestRooms', icon: '🛏️', label: 'Guest Rooms',  desc: 'Inspect heroes'    },
  { id: 'kitchen',    icon: '🍳', label: 'The Kitchen',  desc: 'Sort provisions'   },
  { id: 'cellar',     icon: '⚗️', label: 'The Cellar',  desc: 'Brew potions'      },
  { id: 'stable',     icon: '🐴', label: 'The Stable',   desc: 'Care for horses'   },
];


export default function InnView(): JSX.Element {

  const hasAlert = (id: RoomId) => {
    if (id === 'hearth') return state.parties.some((p) => p.status === 'waiting_choice');
    if (id === 'bar')    return state.heroPool.length > 0 && state.heroes.length < 2;
    return false;
  };

  return (
    <div class="inn-view">
      {/* Zone grid — fills remaining space */}
      <div class="inn-zones">
        {ZONES.map((zone) => (
          <div class="inn-zone" onClick={() => navigateTo(zone.id)}>
            {hasAlert(zone.id) && <span class="inn-zone-alert" />}
            <span class="inn-zone-icon">{zone.icon}</span>
            <span class="inn-zone-label">{zone.label}</span>
            <span class="inn-zone-desc">{zone.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
