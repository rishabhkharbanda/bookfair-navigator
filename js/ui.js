/**
 * ui.js
 * Sidebar UI: stall list, selected-stall panel, search/filter,
 * mode bar, A→B panel wiring, nav-status card.
 *
 * Exports:
 *   initUI()             — wire all sidebar event listeners
 *   renderList()         — rebuild stall list
 *   showSelPanel(stall)  — populate + show selected-stall panel
 *   hideSelPanel()       — clear + hide selected-stall panel
 *   setNavStatus(opts)   — update nav-status card visibility/content
 */

import { CAT } from './constants.js';
import { STALLS } from './data.js';
import { stallC, stallEntry, d2 } from './pathfinder.js';
import { mkIcon } from './constants.js';
import { getState, setState } from './main.js';
import { renderStalls } from './renderer.js';
import { startNavTo, startABNav, stopNav, updNavStats, startWalk } from './navigation.js';
import { deleteSelStall, initFacingButtons, initAddStallModal } from './editor.js';

// ── Init ──────────────────────────────────────────────────

export function initUI() {
  initSearch();
  initCategoryFilter();
  initModeBar();
  initABPanel();
  initNavStatusCard();
  initSelPanel();
  initFacingButtons();
  initAddStallModal();
}

// ── Search ────────────────────────────────────────────────

function initSearch() {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('search-clear');

  input.addEventListener('input', e => {
    setState({ searchQ: e.target.value });
    clear.style.display = getState().searchQ ? 'flex' : 'none';
    renderStalls();
    renderList();
  });

  clear.addEventListener('click', () => {
    setState({ searchQ: '' });
    input.value = '';
    clear.style.display = 'none';
    renderStalls();
    renderList();
  });
}

// ── Category filter ───────────────────────────────────────

function initCategoryFilter() {
  document.getElementById('cats').addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    setState({ filter: c.dataset.cat });
    document.querySelectorAll('.chip').forEach(ch => ch.classList.toggle('active', ch.dataset.cat === c.dataset.cat));
    renderStalls();
    renderList();
  });
}

// ── Mode bar ──────────────────────────────────────────────

export function setMode(m) {
  setState({ appMode: m });
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  document.getElementById('ab-panel').style.display    = m === 'route' ? 'block' : 'none';
  document.getElementById('edit-badge').style.display  = m === 'edit'  ? 'flex'  : 'none';
  document.getElementById('pick-overlay').style.display = 'none';
  setState({ pickTarget: null });
  if (m !== 'route') {
    stopNav(); // clears navFrom/navTo and hides nav-status
  }
  renderStalls();
  renderList();
}

function initModeBar() {
  document.getElementById('mode-bar').addEventListener('click', e => {
    const b = e.target.closest('.mode-btn');
    if (b) setMode(b.dataset.mode);
  });
}

// ── A→B Panel ─────────────────────────────────────────────

function initABPanel() {
  // Click on FROM row → enter pick mode
  document.getElementById('ab-from-row').addEventListener('click', e => {
    if (e.target.closest('.ab-clr')) return;
    setState({ pickTarget: 'from' });
    document.getElementById('pick-overlay').style.display = 'block';
    document.getElementById('pick-lbl').textContent = 'Click a stall to set FROM';
  });

  // Click on TO row → enter pick mode
  document.getElementById('ab-to-row').addEventListener('click', e => {
    if (e.target.closest('.ab-clr')) return;
    setState({ pickTarget: 'to' });
    document.getElementById('pick-overlay').style.display = 'block';
    document.getElementById('pick-lbl').textContent = 'Click a stall to set TO';
  });

  // Clear FROM
  document.getElementById('ab-from-clr').onclick = () => {
    setState({ navFrom: null });
    document.getElementById('ab-from-name').textContent = 'Click to pick…';
    document.getElementById('ab-from-name').style.color = 'var(--text3)';
    document.getElementById('ab-from-clr').style.display = 'none';
    document.getElementById('ab-go').disabled = true;
    renderStalls();
    renderList();
  };

  // Clear TO
  document.getElementById('ab-to-clr').onclick = () => {
    setState({ navTo: null });
    document.getElementById('ab-to-name').textContent = 'Click to pick…';
    document.getElementById('ab-to-name').style.color = 'var(--text3)';
    document.getElementById('ab-to-clr').style.display = 'none';
    document.getElementById('ab-go').disabled = true;
    renderStalls();
    renderList();
  };

  document.getElementById('ab-go').onclick  = startABNav;
  document.getElementById('ab-rst').onclick = stopNav;
}

// ── Nav status card ───────────────────────────────────────

function initNavStatusCard() {
  document.getElementById('ns-walk').onclick = startWalk;
}

/**
 * @param {{ visible: boolean, label?: string, walking?: boolean }} opts
 */
export function setNavStatus({ visible, label, walking }) {
  document.getElementById('nav-status').style.display = visible ? 'block' : 'none';
  if (!visible) return;
  if (label !== undefined) document.getElementById('ns-dest').textContent = label;
  const walkBtn = document.getElementById('ns-walk');
  if (walking !== undefined) {
    walkBtn.disabled = walking;
    walkBtn.innerHTML = walking
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="11" height="11"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg> Walking…`
      : `<svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Walking`;
  }
}

// ── Selected stall panel ──────────────────────────────────

function initSelPanel() {
  document.getElementById('sp-close').onclick = hideSelPanel;
  document.getElementById('sp-nav').onclick   = () => { const { selStall } = getState(); if (selStall) { startNavTo(selStall); hideSelPanel(); } };
  document.getElementById('sp-from').onclick  = () => {
    const { selStall } = getState();
    if (!selStall) return;
    setState({ navFrom: selStall });
    setMode('route');
    document.getElementById('ab-from-name').textContent = selStall.name;
    document.getElementById('ab-from-name').style.color = 'var(--text)';
    document.getElementById('ab-from-clr').style.display = 'flex';
    document.getElementById('ab-go').disabled = !(getState().navFrom && getState().navTo);
    hideSelPanel();
  };
  document.getElementById('sp-del').onclick = deleteSelStall;
}

export function showSelPanel(s) {
  const { appMode, player } = getState();
  const meta = CAT[s.cat] || CAT.publisher;

  document.getElementById('sel-panel').style.display = 'block';

  const si = document.getElementById('sp-ico');
  si.style.cssText = `width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:${meta.bg};border:1px solid ${meta.border};`;
  si.innerHTML = mkIcon(s.icon, meta.color);

  document.getElementById('sp-name').textContent = s.name;
  document.getElementById('sp-desc').textContent = s.desc;

  const facingLabel = { N: 'Entry: North', S: 'Entry: South', E: 'Entry: East', W: 'Entry: West' };
  document.getElementById('sp-tags').innerHTML = `
    <span class="sp-tag" style="background:${meta.bg};color:${meta.text};border-color:${meta.border}">${s.cat.toUpperCase()}</span>
    <span class="sp-tag" style="${s.open ? 'background:#d1fae5;color:#059669;border-color:#6ee7b7' : 'background:#fee2e2;color:#dc2626;border-color:#fca5a5'}">${s.open ? 'OPEN' : 'CLOSED'}</span>
    <span class="sp-tag" style="background:#f0fdf4;color:#15803d;border-color:#bbf7d0">⬛ ${facingLabel[s.facing] || 'Entry: S'}</span>
    <span class="sp-tag" style="background:#f0f4ff;color:var(--text3);border-color:var(--border)">~${Math.round(d2(player, stallC(s)))}m</span>`;

  document.getElementById('sp-dims').innerHTML = `<strong>Pos:</strong> ${Math.round(s.x)},${Math.round(s.y)} &nbsp;·&nbsp; <strong>Size:</strong> ${Math.round(s.w)}×${Math.round(s.h)}`;
  document.getElementById('sp-del').style.display = appMode === 'edit' ? 'block' : 'none';

  const facingRow = document.getElementById('facing-row');
  facingRow.style.display = appMode === 'edit' ? 'block' : 'none';
  if (appMode === 'edit') {
    document.querySelectorAll('#facing-btns .facing-btn').forEach(b => b.classList.toggle('active', b.dataset.f === s.facing));
  }
}

export function hideSelPanel() {
  setState({ selStall: null });
  document.getElementById('sel-panel').style.display = 'none';
  renderStalls();
}

// ── Stall list ────────────────────────────────────────────

export function renderList() {
  const { filter, searchQ, selStall, navFrom, navTo, player } = getState();
  const q = searchQ.toLowerCase();
  const fromPt = navFrom ? stallC(navFrom) : player;

  let items = STALLS
    .filter(s => {
      const mc = filter === 'all' || s.cat === filter;
      const mq = !q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
      return mc && mq;
    })
    .sort((a, b) => d2(fromPt, stallC(a)) - d2(fromPt, stallC(b)));

  document.getElementById('list-lbl').textContent = filter === 'all' ? 'ALL STALLS' : filter.toUpperCase() + ' STALLS';
  document.getElementById('list-ct').textContent  = items.length;

  const list = document.getElementById('stall-list');
  if (!items.length) {
    list.innerHTML = '<div class="no-res">No stalls found</div>';
    return;
  }

  list.innerHTML = items.map(s => {
    const meta = CAT[s.cat] || CAT.publisher;
    const dist = Math.round(d2(fromPt, stallC(s)));
    const mins = Math.max(1, Math.ceil(dist / 80));
    const isFr = navFrom?.id === s.id;
    const isTo = navTo?.id   === s.id;
    return `<div class="stall-row${selStall?.id === s.id ? ' active' : ''}" data-id="${s.id}">
      <div class="s-ico" style="background:${meta.bg};border:1px solid ${meta.border}">${mkIcon(s.icon, meta.color)}</div>
      <div class="s-body">
        <div class="s-name">${s.name}
          ${isFr ? `<span style="font-family:var(--mono);font-size:7px;color:#059669;background:#d1fae5;padding:1px 4px;border-radius:3px;margin-left:3px">FROM</span>` : ''}
          ${isTo ? `<span style="font-family:var(--mono);font-size:7px;color:${meta.text};background:${meta.bg};padding:1px 4px;border-radius:3px;margin-left:3px">TO</span>`   : ''}
        </div>
        <div class="s-meta">${s.desc}</div>
      </div>
      <div class="s-right">
        <span class="s-badge" style="${s.open ? 'background:#d1fae5;color:#059669' : 'background:#fee2e2;color:#dc2626'}">${s.open ? 'OPEN' : 'CLSD'}</span>
        <span class="s-dist">${dist}m · ~${mins}min</span>
      </div>
      <button class="s-nav" data-id="${s.id}" title="Navigate here">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
      </button>
    </div>`;
  }).join('');

  list.querySelectorAll('.stall-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.s-nav')) return;
      const s = STALLS.find(x => x.id === row.dataset.id);
      if (!s) return;
      // Import dynamically to avoid circular dep at module load
      import('./editor.js').then(({ onStallClick }) => { onStallClick(s); scrollToStall(s); });
    });
  });

  list.querySelectorAll('.s-nav').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const s = STALLS.find(x => x.id === btn.dataset.id);
      if (s) startNavTo(s);
    });
  });
}

function scrollToStall(s) {
  const { scale } = getState();
  const vp = document.getElementById('map-vp');
  const r  = vp.getBoundingClientRect();
  const c  = stallC(s);
  const newPan = { x: r.width / 2 - c.x * scale, y: r.height / 2 - c.y * scale };
  setState({ pan: newPan });
  document.getElementById('map-world').style.transform = `translate(${newPan.x}px,${newPan.y}px) scale(${scale})`;
}
