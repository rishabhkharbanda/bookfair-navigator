/**
 * editor.js
 * Edit-mode interactions: drag stalls, resize stalls, add stall modal, facing direction.
 *
 * Exports:
 *   initEditor()         — wire all edit-mode event listeners
 *   onStallMousedown(e)  — called by renderer per-stall mousedown
 *   onStallClick(s)      — called by renderer per-stall click (after drag check)
 */

import { CAT, HALL_TOP, HALL_BOTTOM, MAP_W } from './constants.js';
import { STALLS, makeStall } from './data.js';
import { getState, setState } from './main.js';
import { renderStalls, drawStaticElements } from './renderer.js';
import { renderList, showSelPanel, hideSelPanel } from './ui.js';
import { startNavTo } from './navigation.js';

// ── Stall drag ────────────────────────────────────────────

// Flag shared with renderer to suppress click after a drag
window.__didDragStall   = false;
window.__dragStall      = null;
window.__dragOffset     = { x: 0, y: 0 };
window.__resizeStall    = null;
window.__resizeOrigin   = null;

export function onStallMousedown(e) {
  const { appMode, scale, pan } = getState();
  if (appMode !== 'edit') return;
  if (e.target.closest('.ms-resize')) return;
  e.stopPropagation();

  const s = STALLS.find(x => x.id === e.currentTarget.dataset.id);
  if (!s) return;

  window.__dragStall = s;
  window.__didDragStall = false;

  const vp   = document.getElementById('map-vp');
  const rect = vp.getBoundingClientRect();
  const wx   = (e.clientX - rect.left - pan.x) / scale;
  const wy   = (e.clientY - rect.top  - pan.y) / scale;
  window.__dragOffset = { x: wx - s.x, y: wy - s.y };
}

// Called from viewport.js mousemove
export function handleDragMove(e) {
  const ds = window.__dragStall;
  const rs = window.__resizeStall;
  if (!ds && !rs) return false;

  const { scale, pan } = getState();
  const vp   = document.getElementById('map-vp');
  const rect = vp.getBoundingClientRect();

  if (ds) {
    window.__didDragStall = true;
    const wx = (e.clientX - rect.left - pan.x) / scale;
    const wy = (e.clientY - rect.top  - pan.y) / scale;
    ds.x = snap(Math.max(60, Math.min(wx - window.__dragOffset.x, MAP_W - 60 - ds.w)));
    ds.y = snap(Math.max(HALL_TOP, Math.min(wy - window.__dragOffset.y, HALL_BOTTOM - ds.h)));
    renderStalls();
    renderList();
    const { selStall } = getState();
    if (selStall?.id === ds.id) showSelPanel(ds);
    return true;
  }

  if (rs) {
    const dx = (e.clientX - window.__resizeOrigin.mx) / scale;
    const dy = (e.clientY - window.__resizeOrigin.my) / scale;
    rs.w = snap(Math.max(28, window.__resizeOrigin.ow + dx));
    rs.h = snap(Math.max(22, window.__resizeOrigin.oh + dy));
    renderStalls();
    renderList();
    const { selStall } = getState();
    if (selStall?.id === rs.id) showSelPanel(rs);
    return true;
  }

  return false;
}

export function handleDragEnd() {
  window.__dragStall   = null;
  window.__resizeStall = null;
}

// ── Stall click routing ───────────────────────────────────

export function onStallClick(s) {
  const { pickTarget, appMode, navFrom, navTo } = getState();

  // A→B pick mode
  if (pickTarget) {
    if (pickTarget === 'from') {
      setState({ navFrom: s });
      document.getElementById('ab-from-name').textContent = s.name;
      document.getElementById('ab-from-name').style.color = 'var(--text)';
      document.getElementById('ab-from-clr').style.display = 'flex';
    } else {
      setState({ navTo: s });
      document.getElementById('ab-to-name').textContent = s.name;
      document.getElementById('ab-to-name').style.color = 'var(--text)';
      document.getElementById('ab-to-clr').style.display = 'flex';
    }
    setState({ pickTarget: null });
    document.getElementById('pick-overlay').style.display = 'none';
    document.getElementById('ab-go').disabled = !(getState().navFrom && getState().navTo);
    renderStalls();
    renderList();
    return;
  }

  // Route mode tap → set as TO
  if (appMode === 'route') {
    setState({ navTo: s });
    document.getElementById('ab-to-name').textContent = s.name;
    document.getElementById('ab-to-name').style.color = 'var(--text)';
    document.getElementById('ab-to-clr').style.display = 'flex';
    document.getElementById('ab-go').disabled = !(getState().navFrom && s);
    renderStalls();
    renderList();
    return;
  }

  // Default: select stall
  setState({ selStall: s });
  renderStalls();
  showSelPanel(s);
}

// ── Facing direction buttons ──────────────────────────────

export function initFacingButtons() {
  document.getElementById('facing-btns').addEventListener('click', e => {
    const btn = e.target.closest('.facing-btn');
    if (!btn) return;
    const { selStall } = getState();
    if (!selStall) return;
    selStall.facing = btn.dataset.f;
    document.querySelectorAll('#facing-btns .facing-btn').forEach(b => b.classList.toggle('active', b.dataset.f === selStall.facing));
    renderStalls();
    showSelPanel(selStall);
    showToast(`Entry side set to ${btn.dataset.f} — green stripe shows entry`);
  });
}

// ── Add Stall Modal ───────────────────────────────────────

let addCatSel    = 'publisher';
let addFacingSel = 'S';

export function initAddStallModal() {
  document.getElementById('add-stall-btn').onclick  = openAdd;
  document.getElementById('add-modal-x').onclick    = closeAdd;
  document.getElementById('add-cancel').onclick     = closeAdd;
  document.getElementById('add-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('add-modal')) closeAdd();
  });

  document.getElementById('add-cat-row').addEventListener('click', e => {
    const b = e.target.closest('.cat-opt');
    if (!b) return;
    addCatSel = b.dataset.cat;
    updateAddCatUI();
  });

  document.getElementById('add-facing-row').addEventListener('click', e => {
    const b = e.target.closest('.facing-btn');
    if (!b) return;
    addFacingSel = b.dataset.f;
    document.querySelectorAll('#add-facing-row .facing-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.f === addFacingSel));
  });

  document.getElementById('add-confirm').onclick = confirmAdd;
}

function openAdd() {
  document.getElementById('add-modal').style.display = 'flex';
  addCatSel = 'publisher';
  addFacingSel = 'S';
  updateAddCatUI();
  document.querySelectorAll('#add-facing-row .facing-btn').forEach(b => b.classList.toggle('active', b.dataset.f === addFacingSel));
  document.getElementById('add-name').value = '';
  document.getElementById('add-desc').value = '';
  document.getElementById('add-name').focus();
}

function closeAdd() {
  document.getElementById('add-modal').style.display = 'none';
}

function updateAddCatUI() {
  document.querySelectorAll('.cat-opt').forEach(b => {
    const m = CAT[b.dataset.cat];
    const isSel = b.dataset.cat === addCatSel;
    b.style.background   = isSel ? m.bg        : 'var(--bg)';
    b.style.borderColor  = isSel ? m.color      : 'var(--border)';
    b.style.color        = isSel ? m.text       : 'var(--text2)';
  });
}

function confirmAdd() {
  const name = document.getElementById('add-name').value.trim();
  if (!name) { document.getElementById('add-name').style.borderColor = '#dc2626'; return; }

  const ns = {
    id:     'custom_' + Date.now(),
    name,
    cat:    addCatSel,
    icon:   CAT[addCatSel]?.icon || 'BookOpen',
    x:      Math.max(60,        parseInt(document.getElementById('add-x').value)    || 600),
    y:      Math.max(HALL_TOP,  parseInt(document.getElementById('add-y').value)    || 400),
    w:      Math.max(30,        parseInt(document.getElementById('add-w').value)    || 36),
    h:      Math.max(24,        parseInt(document.getElementById('add-h').value)    || 30),
    desc:   document.getElementById('add-desc').value.trim() || 'Custom stall',
    open:   document.getElementById('add-open').checked,
    facing: addFacingSel,
  };

  STALLS.push(ns);
  closeAdd();
  renderStalls();
  renderList();
  setState({ selStall: ns });
  showSelPanel(ns);

  // Scroll map to new stall
  const { scale, pan } = getState();
  const vp = document.getElementById('map-vp');
  const r  = vp.getBoundingClientRect();
  setState({ pan: { x: r.width / 2 - (ns.x + ns.w/2) * scale, y: r.height / 2 - (ns.y + ns.h/2) * scale } });
  document.getElementById('map-world').style.transform = `translate(${getState().pan.x}px,${getState().pan.y}px) scale(${scale})`;

  showToast(`"${name}" added to floor plan!`);
}

// ── Delete stall ──────────────────────────────────────────

export function deleteSelStall() {
  const { selStall } = getState();
  if (!selStall) return;
  const idx = STALLS.findIndex(s => s.id === selStall.id);
  if (idx !== -1) STALLS.splice(idx, 1);
  hideSelPanel();
  renderStalls();
  renderList();
  drawStaticElements(); // re-render in case it was a foyer stall affecting layout
  showToast('Stall removed from map');
}

// ── Helpers ───────────────────────────────────────────────

function snap(v) { return Math.round(v / 5) * 5; }

let toastT;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 3000);
}
