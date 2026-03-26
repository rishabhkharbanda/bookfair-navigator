/**
 * main.js
 * Application entry point.
 *
 * Responsibilities:
 *   - Centralised state object (single source of truth)
 *   - getState() / setState() accessors (simple reactive store)
 *   - DOM initialisation (set canvas size, draw static elements, player)
 *   - Boot sequence
 *
 * All other modules import getState/setState from here.
 * This prevents circular imports: main.js only imports from modules
 * that don't import from main.js themselves (constants, data, pathfinder).
 */

import { MAP_W, MAP_H } from './constants.js';
import { drawStaticElements, renderStalls, setRendererRefs, drawMinimap } from './renderer.js';
import { renderList, initUI } from './ui.js';
import { initViewport, applyTransform, centerOn } from './viewport.js';

// ── Centralised state ─────────────────────────────────────

const _state = {
  // Viewport
  scale:   0.42,
  pan:     { x: 40, y: 40 },
  isDrag:  false,
  dragLast: { x: 0, y: 0 },

  // Player
  player: { x: 1320, y: 1300 },

  // Navigation
  navFrom:    null,   // stall object | null
  navTo:      null,   // stall object | null
  walkPath:   [],
  totalLen:   0,
  walkedLen:  0,
  walking:    false,

  // UI
  appMode:    'browse',   // 'browse' | 'route' | 'edit'
  selStall:   null,
  pickTarget: null,       // 'from' | 'to' | null
  filter:     'all',
  searchQ:    '',
};

export function getState() { return _state; }

export function setState(partial) {
  Object.assign(_state, partial);
}

// Re-exported viewport helper (used by navigation.js to avoid importing viewport.js directly)
export { scrollBetween } from './viewport.js';

// ── DOM initialisation ────────────────────────────────────

function initWorld() {
  const mapWorld   = document.getElementById('map-world');
  const mapSvg     = document.getElementById('map-svg');
  const stallsLayer = document.getElementById('stalls-layer');
  const staticLayer = document.getElementById('static-layer');
  const pinsLayer  = document.getElementById('pins-layer');
  const vpEl       = document.getElementById('map-vp');
  const playerEl   = document.getElementById('player');

  // Pass DOM refs to renderer so it doesn't have to query repeatedly
  setRendererRefs({ mapWorld, mapSvg, stallsLayer, staticLayer, pinsLayer, vpEl });

  // Size map world
  mapWorld.style.width  = MAP_W + 'px';
  mapWorld.style.height = MAP_H + 'px';
  mapSvg.setAttribute('width',   MAP_W);
  mapSvg.setAttribute('height',  MAP_H);
  mapSvg.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);

  // Player dot
  playerEl.innerHTML = `
    <div class="pl-outer" style="width:28px;height:28px"></div>
    <div class="pl-mid"></div>
    <div class="pl-core"></div>`;
  playerEl.style.left = _state.player.x + 'px';
  playerEl.style.top  = _state.player.y + 'px';
}

// ── Boot ──────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  initWorld();
  drawStaticElements();
  initViewport();
  initUI();
  renderStalls();
  renderList();
  centerOn({ x: MAP_W / 2, y: MAP_H / 2 });
  applyTransform();

  setTimeout(() => {
    const t = document.getElementById('toast');
    t.textContent = 'Welcome to World Book Fair 2026 — tap any stall to navigate!';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }, 700);
});
