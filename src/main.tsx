import { render } from 'solid-js/web';
import App from './App';
import './style.css';
import { startGameLoop } from './systems/GameLoop';
import { generateHeroPool } from './systems/HeroSystem';
import { setHeroPool } from './state/store';
import { state } from './state/store';
import { POOL_SIZE_BY_LEVEL } from './data/roomData';

// Seed initial hero pool if needed
if (state.heroPool.length === 0) {
  const poolSize = POOL_SIZE_BY_LEVEL[state.roomLevels.bar] ?? 3;
  setHeroPool(generateHeroPool(poolSize, state.roomLevels.stable));
}

// Start the real-time quest game loop
startGameLoop();

// Mount the app
const root = document.getElementById('app');
if (root) {
  render(() => <App />, root);
}

