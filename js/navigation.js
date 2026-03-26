/**
 * navigation.js
 * Walking simulation and turn-by-turn navigation logic.
 *
 * Exports:
 *   startNavTo(stall)    — navigate from player's current position to a stall
 *   startABNav()         — navigate from navFrom stall to navTo stall (A→B mode)
 *   startWalk()          — begin animating the player along the computed path
 *   stopNav()            — cancel navigation and clear route
 *   updNavStats()        — refresh distance / time / progress bar in the UI
 */

import { CAT } from './constants.js';
import { stallC, computePath, stallEntry, pLen, d2 } from './pathfinder.js';
import { drawRoute, drawPins, clearRoute } from './renderer.js';
import { renderStalls } from './renderer.js';
import { renderList, setNavStatus } from './ui.js';
import { getState, setState, scrollBetween } from './main.js';

const WALK_SPD = 240; // world-units per second
const TICK_MS  = 50;  // animation tick interval

let walkTimer = null;

// ── Public: start navigation to a stall ──────────────────

export function startNavTo(stall) {
  const { player } = getState();
  setState({ navFrom: null, navTo: stall });
  runNav({ ...player }, stall, stall.name);
}

export function startABNav() {
  const { navFrom, navTo } = getState();
  if (!navFrom || !navTo) return;

  const fp = stallC(navFrom);
  setState({ player: { x: fp.x, y: fp.y } });
  document.getElementById('player').style.left = fp.x + 'px';
  document.getElementById('player').style.top  = fp.y + 'px';

  runNav(fp, navTo, `${navFrom.name} → ${navTo.name}`);
}

// ── Internal: compute + display route ────────────────────

function runNav(fromPt, toStall, label) {
  clearInterval(walkTimer);
  setState({ walking: false, walkedLen: 0 });

  const walkPath = computePath(fromPt, toStall);
  const totalLen = pLen(walkPath);
  setState({ walkPath, totalLen });

  const { navFrom, navTo } = getState();
  const fc = navFrom ? CAT[navFrom.cat]?.color : '#059669';
  const tc = navTo   ? CAT[navTo.cat]?.color   : '#dc2626';

  drawRoute(walkPath, fc, tc);
  drawPins(fromPt, stallEntry(toStall), fc, tc);
  renderStalls();
  renderList();

  setNavStatus({ visible: true, label, walking: false });
  updNavStats();
  scrollBetween(fromPt, stallEntry(toStall));
  showToast(`Route to ${toStall.name} ready!`);
}

// ── Walking simulation ────────────────────────────────────

export function startWalk() {
  const { walking, walkPath } = getState();
  if (walking || walkPath.length < 2) return;
  setState({ walking: true });
  setNavStatus({ walking: true });

  const { navTo } = getState();
  showToast(`Walking to ${navTo?.name || 'destination'}…`);

  let si = 0, st = 0;

  walkTimer = setInterval(() => {
    const { walkPath } = getState();
    if (si >= walkPath.length - 1) {
      clearInterval(walkTimer);
      onArrived();
      return;
    }

    const from = walkPath[si], to = walkPath[si + 1];
    const segD = d2(from, to);
    if (segD < 0.5) { si++; return; }

    st += (WALK_SPD * TICK_MS) / 1000;
    const frac = Math.min(st / segD, 1);

    const px = from.x + (to.x - from.x) * frac;
    const py = from.y + (to.y - from.y) * frac;
    setState({ player: { x: px, y: py } });

    const playerEl = document.getElementById('player');
    playerEl.style.left = px + 'px';
    playerEl.style.top  = py + 'px';

    const { totalLen } = getState();
    const walked = pLen(walkPath.slice(0, si)) + st;
    setState({ walkedLen: walked });

    updNavStats();
    smoothCenter();

    if (frac >= 1) { st = 0; si++; }
  }, TICK_MS);
}

function onArrived() {
  const { navTo } = getState();
  showToast(`Arrived at ${navTo?.name || 'destination'}!`);
  setTimeout(stopNav, 3000);
}

export function stopNav() {
  clearInterval(walkTimer);
  setState({ walking: false, walkPath: [], walkedLen: 0, totalLen: 0, navFrom: null, navTo: null });
  clearRoute();
  setNavStatus({ visible: false });
  // Reset A→B panel names
  ['ab-from-name', 'ab-to-name'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = 'Click to pick…';
    el.style.color = 'var(--text3)';
  });
  document.getElementById('ab-from-clr').style.display = 'none';
  document.getElementById('ab-to-clr').style.display   = 'none';
  document.getElementById('ab-go').disabled = true;
  renderStalls();
  renderList();
}

// ── Stats update ──────────────────────────────────────────

export function updNavStats() {
  const { navTo, player, walkedLen, totalLen } = getState();
  if (!navTo) return;

  const dest = stallEntry(navTo);
  const rem  = Math.max(0, Math.round(d2(player, dest)));
  const mins = Math.max(0, Math.ceil(rem / 80));
  const pct  = Math.round(Math.min(100, (walkedLen / Math.max(1, totalLen)) * 100));

  document.getElementById('ns-dist').textContent = rem;
  document.getElementById('ns-time').textContent = mins || '<1';
  document.getElementById('ns-pct').textContent  = pct;
  document.getElementById('ns-bar').style.width  = pct + '%';
  document.getElementById('hud-txt').textContent = rem < 20 ? (navTo.name || 'Dest') : `${rem}m to ${navTo.name}`;
}

// ── Helpers ───────────────────────────────────────────────

function smoothCenter() {
  const { player, scale, pan } = getState();
  const vp = document.getElementById('map-vp');
  const r  = vp.getBoundingClientRect();
  const newPan = {
    x: pan.x + (r.width  / 2 - player.x * scale - pan.x) * 0.07,
    y: pan.y + (r.height / 2 - player.y * scale - pan.y) * 0.07,
  };
  setState({ pan: newPan });
  document.getElementById('map-world').style.transform = `translate(${newPan.x}px,${newPan.y}px) scale(${scale})`;
}

let toastT;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 3000);
}
