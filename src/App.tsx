import type { JSX } from 'solid-js';
import { Show, For, createMemo, createSignal } from 'solid-js';
import { state, navigateTo } from './state/store';

import LaborBar    from './components/inn/LaborBar';
import EventLog    from './components/inn/EventLog';
import InnView     from './components/inn/InnView';

import HearthView     from './components/rooms/Hearth/HearthView';
import BarView        from './components/rooms/Bar/BarView';
import GuestRoomsView from './components/rooms/GuestRooms/GuestRoomsView';
import KitchenView    from './components/rooms/Kitchen/KitchenView';
import CellarView     from './components/rooms/Cellar/CellarView';
import StableView     from './components/rooms/Stable/StableView';

import AdventureView from './components/adventure/AdventureView';
import SettingsView  from './settings/SettingsView';
import RoomTabs      from './components/shared/RoomTabs';

const LOG_SLATS = [0, 1, 2, 3, 4, 5];
const LOG_MIN_H = 28;
const LOG_MAX_H = 500;
const LOG_DEFAULT_H = 120;

export default function App(): JSX.Element {
  const majorAlerts = createMemo(() =>
    state.parties.filter((p) => p.status === 'waiting_choice').length,
  );
  const [logOpen, setLogOpen] = createSignal(true);
  const [logHeight, setLogHeight] = createSignal(120);
  const [isResizing, setIsResizing] = createSignal(false);

  // Shared resize logic — works for both mouse and touch
  const startResize = (startY: number) => {
    if (!logOpen()) return;
    setIsResizing(true);
    const startH = logHeight();

    const onMove = (clientY: number) => {
      const h = Math.max(LOG_MIN_H, Math.min(LOG_MAX_H, startH + (startY - clientY)));
      setLogHeight(h);
    };
    const onMouseMove = (ev: MouseEvent) => onMove(ev.clientY);
    const onTouchMove = (ev: TouchEvent) => { ev.preventDefault(); onMove(ev.touches[0].clientY); };
    const cleanup = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', cleanup);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', cleanup);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', cleanup);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', cleanup);
  };

  const onResizeMouseDown = (e: MouseEvent) => { e.preventDefault(); startResize(e.clientY); };
  const onResizeTouchStart = (e: TouchEvent) => { e.preventDefault(); startResize(e.touches[0].clientY); };

  return (
    <div class="game-container">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header class="game-header">
        {/* Row 1: identity + stats */}
        <div class="header-top">
          <div class="header-title" onClick={() => navigateTo('inn')}>🏰 Dunge-Inn Master</div>
          <div class="header-stats">
            <div class="stat-chip">💰 <span class="value">{state.gold.toLocaleString()}g</span></div>
            <div class="stat-chip">📅 <span class="value">Day {state.day}</span></div>
            <Show when={majorAlerts() > 0}>
              <div class="stat-chip alert-chip">❓ {majorAlerts()}</div>
            </Show>
          </div>
          <LaborBar />
        </div>

        {/* Row 2: back button removed — Inn tab appears in RoomTabs */}
      </header>

      {/* Room tab navigation — visible only inside room screens */}
      <RoomTabs />

      {/* Main Content */}
      <main class="main-area">
        <div class={`screen${state.activeScreen === 'inn'        ? ' active' : ''}`}><InnView /></div>
        <div class={`screen${state.activeScreen === 'hearth'     ? ' active' : ''}`}><HearthView /></div>
        <div class={`screen${state.activeScreen === 'bar'        ? ' active' : ''}`}><BarView /></div>
        <div class={`screen${state.activeScreen === 'guestRooms' ? ' active' : ''}`}><GuestRoomsView /></div>
        <div class={`screen${state.activeScreen === 'kitchen'    ? ' active' : ''}`}><KitchenView /></div>
        <div class={`screen${state.activeScreen === 'cellar'     ? ' active' : ''}`}><CellarView /></div>
        <div class={`screen${state.activeScreen === 'stable'     ? ' active' : ''}`}><StableView /></div>
        <div class={`screen${state.activeScreen === 'adventure'  ? ' active' : ''}`}><AdventureView /></div>
        <div class={`screen${state.activeScreen === 'settings'   ? ' active' : ''}`}><SettingsView /></div>
      </main>

      {/* Event Log — collapsible + resizable */}
      <div class="log-area-outer">
        <div
          class={`log-area${logOpen() ? '' : ' log-collapsed'}`}
          style={{
            height: logOpen() ? `${logHeight()}px` : undefined,
            transition: isResizing() ? 'none' : undefined,
          }}
        >
          {/* Drag-to-resize handle */}
          <div class="log-resize-handle" onMouseDown={onResizeMouseDown} onTouchStart={onResizeTouchStart} />

          {/* Settings + minimize buttons — top-right corner of log */}
          <div class="log-corner-btns">
            <button
              class="log-minimize-btn"
              onClick={() => navigateTo('settings')}
              title="Settings"
            >⚙️</button>
            <button
              class="log-minimize-btn"
              onClick={() => { const opening = !logOpen(); if (opening) setLogHeight(LOG_DEFAULT_H); setLogOpen(opening); }}
              title={logOpen() ? 'Minimise log' : 'Restore log'}
            >
              {logOpen() ? '▾' : '▴'}
            </button>
          </div>

          <EventLog />

          {/* Venetian blind slats — overlay the entries area */}
          <div class="log-venetian" aria-hidden="true">
            <For each={LOG_SLATS}>
              {(i) => (
                <div
                  class={`log-slat${logOpen() ? ' log-slat-open' : ''}`}
                  style={{
                    top:    `${i * (100 / LOG_SLATS.length)}%`,
                    height: `${100 / LOG_SLATS.length}%`,
                    'transition-delay': logOpen()
                      ? `${i * 0.04}s`
                      : `${(LOG_SLATS.length - 1 - i) * 0.04}s`,
                  }}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}


