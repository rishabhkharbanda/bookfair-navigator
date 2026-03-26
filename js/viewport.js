/**
 * viewport.js
 * Map pan, zoom, mouse/touch interaction and coordinate helpers.
 *
 * Exports:
 *   initViewport()    — wire all pan/zoom event listeners
 *   applyTransform()  — apply current scale/pan to #map-world
 *   centerOn(pt)      — instantly centre the viewport on a world point
 *   scrollBetween(a,b)— centre between two world points
 *   clientToWorld(cx,cy) → {x,y}  — screen → world coords
 */

import { getState, setState } from './main.js';
import { handleDragMove, handleDragEnd } from './editor.js';
import { drawMinimap } from './renderer.js';

let vpEl, mapWorldEl;

export function initViewport() {
  vpEl       = document.getElementById('map-vp');
  mapWorldEl = document.getElementById('map-world');

  // Map pan (mouse)
  vpEl.addEventListener('mousedown', e => {
    if (e.target.closest('.ms')) return;
    setState({ isDrag: true, dragLast: { x: e.clientX, y: e.clientY } });
  });

  window.addEventListener('mousemove', e => {
    // Let editor handle stall drag/resize first
    if (handleDragMove(e)) return;

    const { isDrag, pan } = getState();
    if (!isDrag) return;
    const { dragLast } = getState();
    const newPan = { x: pan.x + e.clientX - dragLast.x, y: pan.y + e.clientY - dragLast.y };
    setState({ pan: newPan, dragLast: { x: e.clientX, y: e.clientY } });
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    setState({ isDrag: false });
    handleDragEnd();
  });

  // Map pan (touch)
  let tc0 = null;
  vpEl.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      const { pan } = getState();
      tc0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: pan.x, py: pan.y };
    }
  }, { passive: true });

  vpEl.addEventListener('touchmove', e => {
    if (!tc0 || e.touches.length !== 1) return;
    setState({ pan: { x: tc0.px + e.touches[0].clientX - tc0.x, y: tc0.py + e.touches[0].clientY - tc0.y } });
    applyTransform();
  }, { passive: true });

  // Zoom (wheel)
  vpEl.addEventListener('wheel', e => {
    e.preventDefault();
    const { scale, pan } = getState();
    const f    = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = vpEl.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const wx = (mx - pan.x) / scale, wy = (my - pan.y) / scale;
    const newScale = Math.max(0.2, Math.min(3, scale * f));
    setState({ scale: newScale, pan: { x: mx - wx * newScale, y: my - wy * newScale } });
    applyTransform();
  }, { passive: false });

  // Control buttons
  document.getElementById('zi').onclick  = () => { const { scale } = getState(); setState({ scale: Math.min(3, scale * 1.2) }); applyTransform(); };
  document.getElementById('zo').onclick  = () => { const { scale } = getState(); setState({ scale: Math.max(0.2, scale / 1.2) }); applyTransform(); };
  document.getElementById('zr').onclick  = () => { setState({ scale: 0.42 }); centerOn(getState().player); };
  document.getElementById('ctr').onclick = () => centerOn(getState().player);
}

// ── Transform application ─────────────────────────────────

export function applyTransform() {
  const { scale, pan } = getState();
  mapWorldEl.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${scale})`;
  document.getElementById('zoom-pct').textContent = Math.round(scale * 100) + '%';
  drawMinimap(pan, scale, getState().walkPath, getState().player);
}

// ── Viewport helpers ──────────────────────────────────────

export function centerOn(pt) {
  const { scale } = getState();
  const r = vpEl.getBoundingClientRect();
  setState({ pan: { x: r.width / 2 - pt.x * scale, y: r.height / 2 - pt.y * scale } });
  applyTransform();
}

export function scrollBetween(a, b) {
  const { scale } = getState();
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
  const r  = vpEl.getBoundingClientRect();
  setState({ pan: { x: r.width / 2 - cx * scale, y: r.height / 2 - cy * scale } });
  applyTransform();
}

export function clientToWorld(cx, cy) {
  const { scale, pan } = getState();
  const r = vpEl.getBoundingClientRect();
  return { x: (cx - r.left - pan.x) / scale, y: (cy - r.top - pan.y) / scale };
}
