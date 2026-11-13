import type { JSX } from 'solid-js';
import { Show, For, createMemo, createSignal } from 'solid-js';
import { state, navigateTo } from './state/store';
import { cookHeat, cookPhase } from './state/cookState';

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
  let dragMoved = false;

  // Shared resize logic — works for both mouse and touch
  const startResize = (startY: number) => {
    dragMoved = false;
    setIsResizing(true);
    const startOpen = logOpen();
    const startH    = startOpen ? logHeight() : LOG_MIN_H;

    const onMove = (clientY: number) => {
      const delta = startY - clientY; // positive = dragged upward
      if (Math.abs(delta) > 4) dragMoved = true;
      // Dragging up from collapsed state opens the log
      if (!startOpen && delta > 8) setLogOpen(true);
      if (logOpen()) {
        setLogHeight(Math.max(LOG_MIN_H, Math.min(LOG_MAX_H, startH + delta)));
      }
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

  const cookOverlayClass = createMemo(() => {
    if (state.activeScreen === 'kitchen') return '';
    if (state.completedChores.includes('kitchen_cook')) return '';
    if (cookPhase() === 'burned') return 'cook-warn-overlay burning';
    if (cookHeat() >= 80 && cookPhase() !== 'idle') return 'cook-warn-overlay warning';
    return '';
  });

  return (
    <div class="game-container">
      <Show when={cookOverlayClass() !== ''}>
        <div class={cookOverlayClass()} aria-hidden="true" />
      </Show>
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
          {/* Drag-to-resize + collapse tab */}
          <div
            class="log-resize-handle"
            onMouseDown={onResizeMouseDown}
            onTouchStart={onResizeTouchStart}
            onClick={() => { if (!dragMoved) { const opening = !logOpen(); if (opening) setLogHeight(LOG_DEFAULT_H); setLogOpen(opening); } }}
            title={logOpen() ? 'Collapse log' : 'Expand log'}
          >
            <span class="log-collapse-chevron">{logOpen() ? '▾' : '▴'}</span>
          </div>

          {/* Settings button — top-right corner of log */}
          <div class="log-corner-btns">
            <button
              class="log-minimize-btn"
              onClick={() => navigateTo('settings')}
              title="Settings"
            >⚙️</button>
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


