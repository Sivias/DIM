import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import { navigateTo, navigateBack, state, resetGame, setDevMode } from '../state/store';
import { tryAdvanceDay } from '../systems/LaborSystem';

export default function SettingsView(): JSX.Element {
  const confirmReset = () => {
    if (window.confirm('Are you sure? This will erase ALL progress — gold, heroes, upgrades, and deeds.')) {
      resetGame();
      navigateTo('inn');
    }
  };

  return (
    <div class="settings-view">
      <div class="settings-header">
        <div class="heading-font text-amber" style={{ 'font-size': '1.1rem' }}>⚙️ Settings</div>
        <button class="settings-close-btn" onClick={navigateBack} title="Close settings">✕</button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Game</div>
        <div class="panel mb-8">
          <div class="heading-font text-sm text-parchment mb-4">Current Save</div>
          <div class="text-sm text-dim">Day {state.day} · {state.gold}g · {state.heroes.length} heroes</div>
          <div class="text-xs text-dim italic mt-4">Progress auto-saves to your browser every few seconds.</div>
        </div>
        <button class="btn btn-danger" onClick={confirmReset}>
          ⚠️ Reset All Progress
        </button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Day Cycle</div>
        <p class="text-sm text-dim mb-8">
          Each day you have <strong class="text-parchment">{state.laborMax} labor</strong> to spend on chores.
          Advance the day to collect rent and reset labor.
          Parties on quests continue regardless of the day cycle.
        </p>
        <button class="btn btn-primary" onClick={() => { tryAdvanceDay(); navigateTo('inn'); }}>
          🌙 End Day & Advance
        </button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Dev Mode</div>
        <div class="dev-toggle-row mb-8">
          <span class="text-sm text-dim">Enable developer shortcuts</span>
          <button
            class={`btn btn-sm${state.devMode ? ' btn-danger' : ''}`}
            onClick={() => setDevMode(!state.devMode)}
          >
            {state.devMode ? '🔴 On' : '⚫ Off'}
          </button>
        </div>
        <Show when={state.devMode}>
          <div class="dev-actions">
            <button class="btn btn-sm" onClick={() => { tryAdvanceDay(); navigateTo('inn'); }}>
              ⏭ Force End Day
            </button>
            <button class="btn btn-sm btn-danger" onClick={confirmReset}>
              💥 Reset Game
            </button>
          </div>
        </Show>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">About</div>
        <p class="text-sm text-dim">
          <strong class="text-amber">Dunge-Inn Master</strong> — A fantasy inn management game.<br />
          Hire heroes, send them into the dungeon below, and grow your establishment<br />
          from a crumbling ruin into a renowned establishment.
        </p>
      </div>

      <div class="mt-12">
        <button class="btn" onClick={() => navigateTo('inn')}>← Return to Inn</button>
      </div>
    </div>
  );
}
