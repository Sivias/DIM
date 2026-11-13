/**
 * ThreeScene.tsx
 * Isometric Three.js environment window driven by the active Party's
 * combatState and eventLog.
 *
 * Layout (top-down):
 *   ┌─────────────────────────────────┐
 *   │  [heroes]   ←VS→   [enemies]   │  ← isometric ortho camera
 *   └─────────────────────────────────┘
 *
 * Characters are THREE.Sprite objects built from emoji CanvasTextures.
 * The floor is a grid of flat PlaneGeometry tiles coloured per environment.
 * Animations are driven by reading combatState + eventLog diffs.
 */

import { onMount, onCleanup, createEffect, on, createMemo } from 'solid-js';
import type { JSX } from 'solid-js';
import * as THREE from 'three';
import type { Party, QuestEnvironment } from '../../data/types';
import { state } from '../../state/store';
import { CLASS_DEFS } from '../../data/heroData';

// ─── Environment palettes ─────────────────────────────────────────────────────
const ENV_PALETTES: Record<QuestEnvironment, {
  floor: number; alt: number; wall: number;
  ambient: number; fog: number; torchColor: number;
}> = {
  dungeon: { floor: 0x2a1f38, alt: 0x221830, wall: 0x1a1028, ambient: 0x220033, fog: 0x0a0810, torchColor: 0xff8833 },
  forest:  { floor: 0x1a3015, alt: 0x152a10, wall: 0x0a1a08, ambient: 0x102210, fog: 0x041208, torchColor: 0xffcc44 },
  cave:    { floor: 0x282018, alt: 0x201a12, wall: 0x151010, ambient: 0x221100, fog: 0x080808, torchColor: 0xff6622 },
  town:    { floor: 0x2a2a3a, alt: 0x222232, wall: 0x181828, ambient: 0x111133, fog: 0x080c18, torchColor: 0xffdd88 },
  quarry:  { floor: 0x2a2810, alt: 0x241f0e, wall: 0x1c1808, ambient: 0x221100, fog: 0x101008, torchColor: 0xff9933 },
  sewer:   { floor: 0x141c10, alt: 0x101808, wall: 0x0c1208, ambient: 0x112211, fog: 0x08100a, torchColor: 0x88cc44 },
  seaside: { floor: 0x0c1820, alt: 0x091420, wall: 0x070f1a, ambient: 0x112233, fog: 0x081018, torchColor: 0x44aaff },
};

// ─── Hero / enemy emoji maps ──────────────────────────────────────────────────
const ENEMY_EMOJI: Record<string, string> = {
  Dragon: '🐲', Goblin: '👺', Troll: '🧌', Skeleton: '💀',
  Slime: '🫧', Orc: '👹', Wolf: '🐺', Lich: '☠️',
  Golem: '🗿', Mage: '🧙', Bandit: '🦹', Rat: '🐀',
  Spider: '🕷️', Vampire: '🧛', Wight: '👻', Wyvern: '🦎',
};

function enemyEmoji(name: string): string {
  for (const [k, v] of Object.entries(ENEMY_EMOJI)) {
    if (name.includes(k)) return v;
  }
  return '👾';
}

// ─── Animation states ─────────────────────────────────────────────────────────
type AnimPhase = 'idle' | 'walk' | 'attack' | 'hit' | 'heal' | 'dying' | 'dead';

interface SpriteEntry {
  sprite: THREE.Sprite;
  id: string;
  combatantType: 'hero' | 'enemy';
  /** world-space resting position */
  basePos: THREE.Vector3;
  phase: AnimPhase;
  phaseTimer: number;
  /** whether this combatant is currently taking its turn */
  isActive: boolean;
  hp: number;
  maxHp: number;
}

// ─── Canvas texture helper ────────────────────────────────────────────────────
function makeEmojiTexture(
  emoji: string,
  size = 128,
  glowColor?: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = size * 0.25;
  }

  ctx.font     = `${Math.floor(size * 0.72)}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ─── HP bar billboard ─────────────────────────────────────────────────────────
function makeHpBarSprite(hp: number, maxHp: number, isEnemy = false): THREE.Sprite {
  const w = 96, h = 14;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, w, h);

  const pct = Math.max(0, Math.min(1, hp / maxHp));
  ctx.fillStyle = isEnemy
    ? `hsl(${Math.round(0)},80%,45%)`   // red for enemies
    : `hsl(${Math.round(pct * 120)},70%,40%)`; // green→red for heroes
  ctx.fillRect(2, 3, Math.round((w - 4) * pct), h - 6);

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 2, w - 2, h - 4);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.0, 0.15, 1);
  tex.needsUpdate = true;
  return sprite;
}

// ─── Main component ───────────────────────────────────────────────────────────
interface ThreeSceneProps {
  party: Party;
  /** px number OR any CSS length string, e.g. "clamp(300px,44dvh,400px)" */
  height?: number | string;
}

export default function ThreeScene(props: ThreeSceneProps): JSX.Element {
  let canvasRef!: HTMLCanvasElement;

  // Three.js objects kept as closed-over mutable refs
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.OrthographicCamera;
  let raf = 0;
  let lastTime = 0;

  // Scene object registries
  const spriteEntries: SpriteEntry[] = [];
  const hpBars: Map<string, THREE.Sprite> = new Map();
  const torchLights: (THREE.PointLight & { userData: { flickerSpeed: number } })[] = [];
  const floorTiles: THREE.Mesh[] = [];
  const decorSprites: THREE.Sprite[] = [];
  const texturesToDispose: THREE.CanvasTexture[] = [];
  const geoToDispose: THREE.BufferGeometry[] = [];
  const matToDispose: THREE.Material[] = [];

  // ─── Texture cache ──────────────────────────────────────────────────────────
  const texCache = new Map<string, THREE.CanvasTexture>();
  function getCachedTex(key: string, factory: () => THREE.CanvasTexture): THREE.CanvasTexture {
    if (!texCache.has(key)) {
      const t = factory();
      texCache.set(key, t);
      texturesToDispose.push(t);
    }
    return texCache.get(key)!;
  }

  // ─── Build floor ─────────────────────────────────────────────────────────────
  function buildFloor(env: QuestEnvironment) {
    const pal = ENV_PALETTES[env] ?? ENV_PALETTES.dungeon;

    for (let x = -7; x <= 7; x++) {
      for (let z = -4; z <= 4; z++) {
        const isAlt = (x + z) % 2 === 0;
        const geo = new THREE.PlaneGeometry(0.94, 0.94);
        const mat = new THREE.MeshLambertMaterial({ color: isAlt ? pal.floor : pal.alt });
        const tile = new THREE.Mesh(geo, mat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x, -0.01, z);
        tile.receiveShadow = true;
        scene.add(tile);
        floorTiles.push(tile);
        geoToDispose.push(geo);
        matToDispose.push(mat);
      }
    }

    // Back wall strip
    for (let x = -7; x <= 7; x++) {
      const geo = new THREE.BoxGeometry(0.94, 1.2, 0.15);
      const mat = new THREE.MeshLambertMaterial({ color: pal.wall });
      const wall = new THREE.Mesh(geo, mat);
      wall.position.set(x, 0.6, -4.5);
      scene.add(wall);
      floorTiles.push(wall);
      geoToDispose.push(geo);
      matToDispose.push(mat);
    }
  }

  // ─── Add torches ─────────────────────────────────────────────────────────────
  function addTorches(env: QuestEnvironment) {
    const pal = ENV_PALETTES[env] ?? ENV_PALETTES.dungeon;
    const positions = [[-5, -3], [0, -3], [5, -3]] as const;

    for (const [tx, tz] of positions) {
      const light = new THREE.PointLight(pal.torchColor, 1.2, 8) as THREE.PointLight & { userData: { flickerSpeed: number } };
      light.position.set(tx, 1.5, tz);
      light.castShadow = false;
      light.userData.flickerSpeed = 1.0 + Math.random() * 0.8;
      torchLights.push(light);
      scene.add(light);

      // Torch emoji sprite
      const tex = getCachedTex('torch', () => makeEmojiTexture('🕯️', 64));
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(tx, 1.5, tz);
      sprite.scale.set(0.6, 0.6, 1);
      scene.add(sprite);
      decorSprites.push(sprite);
      matToDispose.push(mat);
    }
  }

  // ─── Spawn / refresh character sprites ────────────────────────────────────────
  function rebuildSprites() {
    // Clear old sprites
    for (const e of spriteEntries) {
      scene.remove(e.sprite);
      e.sprite.material.dispose();
    }
    spriteEntries.length = 0;

    for (const [, bar] of hpBars) {
      scene.remove(bar);
      bar.material.dispose();
    }
    hpBars.clear();

    const party = props.party;
    if (!party) return;

    // Hero sprites ─────────────────────
    const heroIds = party.heroIds;
    heroIds.forEach((hid, idx) => {
      const hero = state.heroes.find((h) => h.id === hid);
      if (!hero) return;
      const def = CLASS_DEFS[hero.heroClass];
      const tex = getCachedTex(`hero-${hero.heroClass}`, () => makeEmojiTexture(def.icon, 128, def.color));
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      matToDispose.push(mat);
      const sprite = new THREE.Sprite(mat);
      const spacing = 1.6;
      const startZ = -((heroIds.length - 1) * spacing) / 2;
      const pos = new THREE.Vector3(-3, 0.9, startZ + idx * spacing);
      sprite.position.copy(pos);
      sprite.scale.set(1.4, 1.4, 1);
      scene.add(sprite);

      const entry: SpriteEntry = {
        sprite,
        id: hid,
        combatantType: 'hero',
        basePos: pos.clone(),
        phase: 'idle',
        phaseTimer: 0,
        isActive: false,
        hp: hero.hp,
        maxHp: hero.maxHp,
      };
      spriteEntries.push(entry);

      // HP bar
      const bar = makeHpBarSprite(hero.hp, hero.maxHp, false);
      bar.position.set(pos.x, pos.y + 1.0, pos.z);
      scene.add(bar);
      hpBars.set(hid, bar);
    });

    // Enemy sprites (combat) ────────────
    const combatants = party.combatState?.combatants ?? [];
    const enemies = combatants.filter((c) => c.type === 'enemy');
    enemies.forEach((enemy, idx) => {
      const emoji = enemyEmoji(enemy.name);
      const tex = getCachedTex(`enemy-${enemy.name}`, () => makeEmojiTexture(emoji, 128, '#ff3333'));
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      matToDispose.push(mat);
      const sprite = new THREE.Sprite(mat);
      const spacing = 1.6;
      const startZ = -((enemies.length - 1) * spacing) / 2;
      const pos = new THREE.Vector3(3, 0.9, startZ + idx * spacing);
      sprite.position.copy(pos);
      sprite.scale.set(1.4, 1.4, 1);
      // Flip enemies to face left
      sprite.scale.x = -1.4;
      scene.add(sprite);

      const entry: SpriteEntry = {
        sprite,
        id: enemy.id,
        combatantType: 'enemy',
        basePos: pos.clone(),
        phase: enemy.hp <= 0 ? 'dead' : 'idle',
        phaseTimer: 0,
        isActive: false,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
      };
      spriteEntries.push(entry);

      // HP bar
      const bar = makeHpBarSprite(enemy.hp, enemy.maxHp, true);
      bar.position.set(pos.x, pos.y + 1.0, pos.z);
      scene.add(bar);
      hpBars.set(enemy.id, bar);
    });

    // Refresh active combatant
    syncActiveMarker();
  }

  function syncActiveMarker() {
    const cs = props.party?.combatState;
    const activeId = cs?.combatants[cs.currentTurnIndex]?.id ?? null;
    for (const e of spriteEntries) {
      const wasActive = e.isActive;
      e.isActive = e.id === activeId;
      if (e.isActive && !wasActive && e.phase === 'idle') {
        e.phase = 'attack';
        e.phaseTimer = 0;
      }
    }
  }

  function triggerHit(targetId: string) {
    const e = spriteEntries.find((s) => s.id === targetId);
    if (e && e.phase !== 'dying' && e.phase !== 'dead') {
      e.phase = 'hit';
      e.phaseTimer = 0;
    }
  }

  function triggerHeal(targetId: string) {
    const e = spriteEntries.find((s) => s.id === targetId);
    if (e && e.phase !== 'dying' && e.phase !== 'dead') {
      e.phase = 'heal';
      e.phaseTimer = 0;
    }
  }

  function triggerDeath(targetId: string) {
    const e = spriteEntries.find((s) => s.id === targetId);
    if (e) {
      e.phase = 'dying';
      e.phaseTimer = 0;
    }
  }

  // ─── Update HP bars ──────────────────────────────────────────────────────────
  function refreshHpBars() {
    const cs = props.party?.combatState;
    if (!cs) return;
    for (const c of cs.combatants) {
      const bar = hpBars.get(c.id);
      if (!bar) continue;
      const newBar = makeHpBarSprite(c.hp, c.maxHp, c.type === 'enemy');
      bar.material = newBar.material;
      newBar.material.dispose(); // newBar itself not added to scene
    }
    // Hero HP from state
    for (const hero of state.heroes) {
      const bar = hpBars.get(hero.id);
      if (!bar) continue;
      const newBar = makeHpBarSprite(hero.hp, hero.maxHp, false);
      bar.material = newBar.material;
      newBar.material.dispose();
    }
  }

  // ─── Parse event log for animation triggers ──────────────────────────────────
  let lastLogLength = 0;

  function processNewLogEntries() {
    const log = props.party?.eventLog ?? [];
    if (log.length <= lastLogLength) { lastLogLength = log.length; return; }
    const newEntries = log.slice(lastLogLength);
    lastLogLength = log.length;

    for (const msg of newEntries) {
      // Detect "heals" / "recovers"
      if (/recovers|healed|heal/i.test(msg)) {
        // heal target — try to find a hero name match
        for (const e of spriteEntries) {
          const hero = state.heroes.find((h) => h.id === e.id);
          if (hero && msg.includes(hero.name)) triggerHeal(e.id);
        }
        continue;
      }

      // Detect "is slain" / "falls" / "defeated" / "dies"
      if (/slain|falls|defeated|dies|perishes/i.test(msg)) {
        for (const e of spriteEntries) {
          if (e.phase === 'dead') continue;
          const hero = state.heroes.find((h) => h.id === e.id);
          const combatant = props.party?.combatState?.combatants.find((c) => c.id === e.id);
          const name = hero?.name ?? combatant?.name ?? '';
          if (name && msg.includes(name)) triggerDeath(e.id);
        }
        continue;
      }

      // Detect hits / "takes X damage" / "strikes"
      if (/damage|strikes|attacks|hits|slashes|bashes|blasts|stabs/i.test(msg)) {
        for (const e of spriteEntries) {
          const hero = state.heroes.find((h) => h.id === e.id);
          const combatant = props.party?.combatState?.combatants.find((c) => c.id === e.id);
          const name = hero?.name ?? combatant?.name ?? '';
          // If their name appears after "damage" or "hits" context, they're the target
          if (name && msg.includes(name)) {
            // Heuristic: if the name appears later in the string it's probably the target
            const namePos  = msg.indexOf(name);
            const verbPos  = Math.max(
              msg.search(/damage|strikes|attacks|hits|slashes|bashes|blasts|stabs/i),
              0,
            );
            if (namePos > verbPos) triggerHit(e.id);
          }
        }
      }
    }
  }

  // ─── Per-frame animation update ───────────────────────────────────────────────
  const ATTACK_DUR  = 0.35;
  const HIT_DUR     = 0.30;
  const HEAL_DUR    = 0.50;
  const DYING_DUR   = 0.90;
  const WALK_CYCLE  = 2.5;

  function updateSprites(dt: number, time: number) {
    for (const e of spriteEntries) {
      e.phaseTimer += dt;
      const t = e.phaseTimer;
      const sp = e.sprite;

      switch (e.phase) {
        case 'idle':
          // Subtle hover bob
          sp.position.setY(e.basePos.y + Math.sin(time * 1.2 + e.basePos.z) * 0.04);
          // Active combatant glows brighter
          (sp.material as THREE.SpriteMaterial).opacity = e.isActive ? 1.0 : 0.92;
          break;

        case 'walk':
          // Treadmill bob
          sp.position.setY(e.basePos.y + Math.abs(Math.sin(time * 3.0)) * 0.12);
          if (t > WALK_CYCLE) { e.phase = 'idle'; e.phaseTimer = 0; }
          break;

        case 'attack': {
          // Lunge toward center then snap back
          const lungeDir = e.combatantType === 'hero' ? 1 : -1;
          const lunge = Math.sin((t / ATTACK_DUR) * Math.PI) * 0.6 * lungeDir;
          sp.position.set(e.basePos.x + lunge, e.basePos.y + Math.abs(lunge) * 0.2, e.basePos.z);
          (sp.material as THREE.SpriteMaterial).opacity = 1.0;
          if (t > ATTACK_DUR) { e.phase = 'idle'; e.phaseTimer = 0; }
          break;
        }

        case 'hit': {
          // Knock back and flash red-tinted
          const knockDir = e.combatantType === 'hero' ? -1 : 1;
          const knock = Math.sin((t / HIT_DUR) * Math.PI) * 0.35 * knockDir;
          sp.position.set(e.basePos.x + knock, e.basePos.y, e.basePos.z);
          // Flash: alternate near-1 and ~0.5 opacity quickly
          (sp.material as THREE.SpriteMaterial).opacity = 0.5 + Math.abs(Math.sin(t * 30)) * 0.5;
          if (t > HIT_DUR) { e.phase = 'idle'; e.phaseTimer = 0; }
          break;
        }

        case 'heal': {
          // Float upward with gentle glow
          sp.position.set(e.basePos.x, e.basePos.y + Math.sin((t / HEAL_DUR) * Math.PI) * 0.3, e.basePos.z);
          (sp.material as THREE.SpriteMaterial).opacity = 1.0;
          if (t > HEAL_DUR) { e.phase = 'idle'; e.phaseTimer = 0; }
          break;
        }

        case 'dying': {
          // Fall and fade
          const prog = Math.min(t / DYING_DUR, 1);
          sp.position.set(e.basePos.x, e.basePos.y - prog * 0.5, e.basePos.z);
          (sp.material as THREE.SpriteMaterial).opacity = 1 - prog;
          const s = 1.4 * (1 - prog * 0.4);
          sp.scale.set(e.combatantType === 'enemy' ? -s : s, s, 1);
          if (t > DYING_DUR) {
            e.phase = 'dead';
            (sp.material as THREE.SpriteMaterial).opacity = 0;
          }
          break;
        }

        case 'dead':
          (sp.material as THREE.SpriteMaterial).opacity = 0;
          break;
      }

      // Keep HP bar above sprite
      const bar = hpBars.get(e.id);
      if (bar) {
        bar.position.set(sp.position.x, sp.position.y + 1.05, sp.position.z);
        bar.visible = e.phase !== 'dead' && e.phase !== 'dying';
      }
    }
  }

  // ─── Exploration walking (no combat) ─────────────────────────────────────────
  function triggerWalkAnimation() {
    for (const e of spriteEntries) {
      if (e.combatantType === 'hero' && e.phase === 'idle') {
        e.phase = 'walk';
        e.phaseTimer = 0;
      }
    }
  }

  // ─── Main render loop ─────────────────────────────────────────────────────────
  function animate(time: number) {
    raf = requestAnimationFrame(animate);
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    // Torch flicker
    for (const light of torchLights) {
      light.intensity = 0.9 + Math.sin(time * 0.0025 * light.userData.flickerSpeed) * 0.4
                            + Math.sin(time * 0.0071 * light.userData.flickerSpeed) * 0.15;
    }

    updateSprites(dt, time * 0.001);

    renderer.render(scene, camera);
  }

  // ─── Mount / setup ────────────────────────────────────────────────────────────
  onMount(() => {
    const width  = canvasRef.clientWidth  || canvasRef.offsetWidth  || 600;
    const height = canvasRef.clientHeight || canvasRef.offsetHeight || 220;

    renderer = new THREE.WebGLRenderer({ canvas: canvasRef, antialias: true, alpha: true });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;

    scene = new THREE.Scene();

    // ── Camera (isometric ortho) ──
    const aspect = width / height;
    const d = 9;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 200);
    camera.position.set(d, d * 0.7, d);
    camera.lookAt(0, 0, 0);

    // ── Environment ──
    const env = (props.party?.quest?.environment ?? 'dungeon') as QuestEnvironment;
    const pal = ENV_PALETTES[env] ?? ENV_PALETTES.dungeon;

    scene.fog = new THREE.FogExp2(pal.fog, 0.045);
    scene.add(new THREE.AmbientLight(pal.ambient, 1.8));

    buildFloor(env);
    addTorches(env);
    rebuildSprites();

    // ── Resize observer ──
    const ro = new ResizeObserver(() => {
      const w = canvasRef.clientWidth;
      const h = canvasRef.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      const a = w / h;
      camera.left   = -d * a;
      camera.right  =  d * a;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvasRef);

    // exploration walk trigger every ~6s
    const walkTimer = setInterval(triggerWalkAnimation, 6000);

    lastTime = performance.now();
    raf = requestAnimationFrame(animate);

    onCleanup(() => {
      cancelAnimationFrame(raf);
      clearInterval(walkTimer);
      ro.disconnect();
      for (const t of texturesToDispose) t.dispose();
      for (const t of texCache.values()) t.dispose();
      for (const g of geoToDispose) g.dispose();
      for (const m of matToDispose) m.dispose();
      for (const e of spriteEntries) e.sprite.material.dispose();
      for (const [, bar] of hpBars) bar.material.dispose();
      renderer.dispose();
    });
  });

  // ─── Reactive: environment change (rarely, but possible) ────────────────────
  createEffect(on(
    () => props.party?.quest?.environment,
    () => {
      if (!scene) return;
      const env = (props.party?.quest?.environment ?? 'dungeon') as QuestEnvironment;
      const pal = ENV_PALETTES[env] ?? ENV_PALETTES.dungeon;
      scene.fog = new THREE.FogExp2(pal.fog, 0.045);
      // Remove old floor
      for (const t of floorTiles) scene.remove(t);
      floorTiles.length = 0;
      buildFloor(env);
    },
    { defer: true },
  ));

  // ─── Reactive: combat state changing (new enemies / turn changes) ────────────
  const combatantCount = createMemo(() => props.party?.combatState?.combatants.length ?? 0);
  createEffect(on(combatantCount, () => {
    if (!scene) return;
    rebuildSprites();
  }, { defer: true }));

  createEffect(on(
    () => props.party?.combatState?.currentTurnIndex,
    () => { if (scene) syncActiveMarker(); },
    { defer: true },
  ));

  // ─── Reactive: HP changes → refresh bars ─────────────────────────────────────
  createEffect(on(
    () => {
      const cs = props.party?.combatState;
      return cs?.combatants.map((c) => c.hp).join(',') ?? '';
    },
    () => { if (scene) refreshHpBars(); },
    { defer: true },
  ));

  // ─── Reactive: new log entries ────────────────────────────────────────────────
  createEffect(on(
    () => props.party?.eventLog?.length ?? 0,
    () => { if (scene) processNewLogEntries(); },
    { defer: true },
  ));

  // ─── Render ───────────────────────────────────────────────────────────────────
  const h = () => {
    const v = props.height ?? 220;
    return typeof v === 'string' ? v : `${v}px`;
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: `${h()}px`,
        'image-rendering': 'pixelated',
      }}
    />
  );
}



