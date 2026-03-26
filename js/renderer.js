/**
 * renderer.js
 * All DOM/SVG drawing:
 *   - drawStaticElements()  → hall walls, corridors, foyers, toilets, amphitheaters
 *   - renderStalls()        → stall marker divs on the map
 *   - drawRoute()           → animated SVG route line
 *   - drawPins()            → FROM / TO destination pins
 *   - clearRoute()          → remove route SVG + pins
 *   - drawMinimap()         → overview canvas
 */

import { HALLS, HALL_TOP, HALL_BOTTOM, HALL_H, H_CORR, V_CORR_BETWEEN, PW_H, MAP_W, CAT, mkIcon } from './constants.js';
import { STALLS } from './data.js';
import { stallC } from './pathfinder.js';
import { getState } from './main.js';
import { onStallMousedown, onStallClick } from './editor.js';

// ── DOM refs (set once by main.js after DOM ready) ────────
let mapWorld, mapSvg, stallsLayer, staticLayer, pinsLayer, vpEl;

export function setRendererRefs(refs) {
  ({ mapWorld, mapSvg, stallsLayer, staticLayer, pinsLayer, vpEl } = refs);
}

// ── Tiny DOM helpers ──────────────────────────────────────

export function el(tag, css, attrs = {}, parent = null) {
  const e = document.createElement(tag);
  e.style.cssText = css;
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  if (parent) parent.appendChild(e);
  return e;
}

export function txt(content, css, parent = null) {
  const e = document.createElement('div');
  e.style.cssText = css;
  e.textContent = content;
  if (parent) parent.appendChild(e);
  return e;
}

// ── Static floor plan elements ────────────────────────────

export function drawStaticElements() {
  staticLayer.innerHTML = '';

  // Service road
  el('div', `position:absolute;left:0;top:55px;width:${MAP_W}px;height:50px;background:rgba(180,180,180,0.2);border-bottom:1px solid rgba(150,150,150,0.3)`, {}, staticLayer);
  txt('SERVICE ROAD', `position:absolute;left:${MAP_W/2 - 50}px;top:65px;font-family:var(--mono);font-size:8px;letter-spacing:0.12em;color:#777`, staticLayer);

  // Hall bounding boxes + labels
  HALLS.forEach(h => {
    el('div', `position:absolute;left:${h.x}px;top:${HALL_TOP}px;width:${h.w}px;height:${HALL_H}px;border:2px solid #dc2626;background:${h.color};border-radius:2px`, {}, staticLayer);
    txt(h.label,      `position:absolute;left:${h.x+h.w/2}px;top:${HALL_BOTTOM+70}px;transform:translateX(-50%);font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:0.12em;color:#dc2626;text-align:center;white-space:nowrap`, staticLayer);
    txt('GROUND FLOOR',`position:absolute;left:${h.x+h.w/2}px;top:${HALL_BOTTOM+86}px;transform:translateX(-50%);font-family:var(--mono);font-size:8px;letter-spacing:0.08em;color:#999;white-space:nowrap`, staticLayer);
  });

  // Inter-hall vertical corridors
  V_CORR_BETWEEN.forEach(vx => {
    el('div', `position:absolute;left:${vx}px;top:${HALL_TOP}px;width:40px;height:${HALL_H}px;background:rgba(100,0,200,0.07);border-left:2px solid rgba(100,0,200,0.25);border-right:2px solid rgba(100,0,200,0.25)`, {}, staticLayer);
  });

  // Horizontal aisle strips
  H_CORR.forEach(hy => {
    HALLS.forEach(h => {
      el('div', `position:absolute;left:${h.x}px;top:${hy - PW_H/2}px;width:${h.w}px;height:${PW_H}px;background:rgba(190,205,240,0.3);border-top:1px dashed rgba(100,120,200,0.15);border-bottom:1px dashed rgba(100,120,200,0.15)`, {}, staticLayer);
    });
  });

  // Foyer + circulation + entrance arrows
  HALLS.forEach(h => {
    el('div', `position:absolute;left:${h.x}px;top:${HALL_BOTTOM}px;width:${h.w}px;height:70px;background:rgba(240,235,255,0.8);border:1.5px solid rgba(100,0,200,0.2);border-top:none`, {}, staticLayer);
    txt('FOYER', `position:absolute;left:${h.x+h.w/2}px;top:${HALL_BOTTOM+5}px;transform:translateX(-50%);font-family:var(--mono);font-size:7px;font-weight:600;letter-spacing:0.1em;color:#6d28d9`, staticLayer);
    txt('CIRCULATION AREA', `position:absolute;left:${h.x+h.w/2}px;top:${HALL_BOTTOM+18}px;transform:translateX(-50%);font-family:var(--mono);font-size:6px;letter-spacing:0.08em;color:#9370db;white-space:nowrap`, staticLayer);

    const arrX = h.x + h.w / 2, arrY = HALL_BOTTOM + 72;
    el('div', `position:absolute;left:${arrX-20}px;top:${arrY}px;width:40px;height:40px;display:flex;flex-direction:column;align-items:center;gap:2px`, {}, staticLayer).innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="#1a4fa8" stroke-width="2.5" stroke-linecap="round" width="18" height="18"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
       <div style="font-family:var(--mono);font-size:7px;font-weight:700;color:#1a4fa8;letter-spacing:0.08em">ENTRY</div>`;
  });

  // Toilet blocks at each hall corner
  HALLS.forEach(h => {
    [
      { x: h.x + 2,        y: HALL_TOP + 2          },
      { x: h.x + h.w - 42, y: HALL_TOP + 2          },
      { x: h.x + 2,        y: HALL_BOTTOM - 52       },
      { x: h.x + h.w - 42, y: HALL_BOTTOM - 52       },
    ].forEach(pos => {
      el('div', `position:absolute;left:${pos.x}px;top:${pos.y}px;width:38px;height:46px;background:rgba(8,145,178,0.12);border:1.5px solid rgba(8,145,178,0.35);border-radius:3px;display:flex;align-items:center;justify-content:center`, {}, staticLayer).innerHTML =
        `<div style="font-family:var(--mono);font-size:6px;font-weight:700;color:#0891b2;text-align:center;line-height:1.3">TOILET<br>FACILITY</div>`;
    });
  });

  // Amphitheaters
  [{ cx: 310, label: 'AMPHITHEATER - 1' }, { cx: 1390, label: 'AMPHITHEATER - 2' }].forEach(a => {
    const W = 240;
    el('div', `position:absolute;left:${a.cx - W/2}px;top:${HALL_BOTTOM+130}px;width:${W}px;height:160px;background:rgba(219,234,254,0.7);border:2px solid #93c5fd;border-radius:${W/2}px ${W/2}px 0 0;display:flex;align-items:center;justify-content:center`, {}, staticLayer).innerHTML =
      `<div style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:0.08em;color:#1e40af;text-align:center">${a.label}</div>`;
    el('div', `position:absolute;left:${a.cx-60}px;top:${HALL_BOTTOM+290}px;width:0;height:0;border-left:60px solid transparent;border-right:60px solid transparent;border-top:60px solid rgba(147,197,253,0.5)`, {}, staticLayer);
  });

  // Structural column dots
  HALLS.forEach(h => {
    for (let cx = h.x + 80; cx < h.x + h.w - 40; cx += 100)
      for (let cy = HALL_TOP + 80; cy < HALL_BOTTOM - 40; cy += 130)
        el('div', `position:absolute;left:${cx}px;top:${cy}px;width:7px;height:7px;border-radius:50%;background:#aaa;transform:translate(-50%,-50%);z-index:6`, {}, staticLayer);
  });

  // Side gate labels
  txt('FROM GATE 1–2 →', `position:absolute;left:8px;top:${HALL_TOP + HALL_H/2}px;font-family:var(--mono);font-size:8px;font-weight:600;color:#555;writing-mode:vertical-rl;transform:rotate(180deg);letter-spacing:0.08em`, staticLayer);
  txt('← FROM GATE 4–5', `position:absolute;right:8px;top:${HALL_TOP + HALL_H/2}px;font-family:var(--mono);font-size:8px;font-weight:600;color:#555;writing-mode:vertical-rl;letter-spacing:0.08em`, staticLayer);

  // Title block
  el('div', `position:absolute;right:20px;top:10px;background:white;border:2px solid #dc2626;padding:10px 16px;border-radius:4px;text-align:center`, {}, staticLayer).innerHTML =
    `<div style="font-family:var(--mono);font-size:14px;font-weight:700;color:#dc2626;letter-spacing:0.05em">NEW DELHI</div>
     <div style="font-family:var(--mono);font-size:11px;font-weight:700;color:#dc2626;letter-spacing:0.05em">WORLD BOOK FAIR 2026</div>
     <div style="font-family:var(--mono);font-size:9px;color:#1a4fa8;font-weight:600;margin-top:2px">January 10–18, 2026</div>
     <div style="font-family:var(--mono);font-size:8px;color:#6d28d9;font-weight:600;margin-top:1px">HALLS 2, 3, 4 &amp; 5 (GROUND FLOOR)</div>`;

  // North arrow
  el('div', `position:absolute;right:30px;bottom:${MAP_W - HALL_BOTTOM - 200}px;display:flex;flex-direction:column;align-items:center;gap:2px`, {}, staticLayer).innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="2" stroke-linecap="round" width="20" height="20"><path d="M12 2v20M5 9l7-7 7 7"/></svg>
     <div style="font-family:var(--mono);font-size:9px;font-weight:700;color:#444">N</div>`;
}

// ── Stall markers ─────────────────────────────────────────

export function renderStalls() {
  stallsLayer.innerHTML = '';
  const { filter, searchQ, appMode, selStall, navFrom, navTo } = getState();
  const q = searchQ.toLowerCase();

  STALLS.forEach(s => {
    const mc = filter === 'all' || s.cat === filter;
    const mq = !q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
    if (!mc || !mq) return;

    const meta = CAT[s.cat] || CAT.publisher;
    const isSel   = selStall?.id === s.id;
    const isFr    = navFrom?.id  === s.id;
    const isTo    = navTo?.id    === s.id;
    const z       = isSel ? 50 : isTo ? 45 : isFr ? 44 : 10;
    const showEH  = appMode === 'edit' && isSel;

    const e = el('div', `
      position:absolute;left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px;z-index:${z};
      border-radius:3px;
      background:${isSel||isTo||isFr ? meta.bg : '#fff'};
      border:${isSel ? `2px solid ${meta.color}` : isTo ? `2px solid ${meta.color}` : isFr ? '2px solid #059669' : `1px solid ${meta.border}`};
      ${isSel ? `box-shadow:0 0 0 3px ${meta.color}25,0 4px 16px rgba(0,0,0,0.1);` : ''}
      ${!s.open ? 'opacity:0.45;' : ''}
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:3px 2px;
      cursor:${appMode === 'edit' ? 'move' : 'pointer'};user-select:none;overflow:hidden;
    `, {}, stallsLayer);
    e.dataset.id = s.id;
    e.className = 'ms' + (isSel ? ' sel' : '') + (isTo ? ' nav-dest' : '') + (isFr ? ' nav-from' : '');

    // Facing stripe (green bar on entry side)
    const fStyle = { N: 'top:0;left:0;right:0;height:3px;', S: 'bottom:0;left:0;right:0;height:3px;', E: 'top:0;right:0;bottom:0;width:3px;', W: 'top:0;left:0;bottom:0;width:3px;' };
    const arrowChar = { N: '▲', S: '▼', E: '▶', W: '◀' };
    const arrowPos  = { N: 'bottom:1px;left:50%;transform:translateX(-50%);', S: 'top:1px;left:50%;transform:translateX(-50%);', E: 'top:50%;left:1px;transform:translateY(-50%);', W: 'top:50%;right:1px;transform:translateY(-50%);' };

    const numMatch = s.id.match(/(\d+)$/);
    const stallNum = numMatch ? numMatch[1] : '';

    e.innerHTML = `
      <div style="position:absolute;${fStyle[s.facing]||fStyle.S}background:#22c55e;border-radius:2px;opacity:0.85"></div>
      <div style="position:absolute;${arrowPos[s.facing]||arrowPos.S}font-size:5px;color:#16a34a;line-height:1;opacity:0.7">${arrowChar[s.facing]||'▼'}</div>
      ${s.w > 50 ? `<div class="ms-lbl" style="color:${isSel||isTo||isFr ? meta.text : '#3b4d72'}">${s.name.length > 14 ? s.name.substring(0,12) + '…' : s.name}</div>` : ''}
      ${s.w > 40 && stallNum ? `<div class="ms-num">${stallNum}</div>` : ''}
      ${!s.open ? '<div class="ms-closed-tag">CLOSED</div>' : ''}
      ${isFr ? `<div style="position:absolute;top:1px;left:2px;font-family:var(--mono);font-size:5px;color:#059669;font-weight:700">FROM</div>` : ''}
      ${isTo ? `<div style="position:absolute;top:1px;left:2px;font-family:var(--mono);font-size:5px;color:${meta.color};font-weight:700">TO</div>` : ''}
      <div class="ms-resize" style="display:${showEH ? 'flex' : 'none'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" width="6" height="6"><path d="M21 15l-9 9M21 9l-12 12"/></svg>
      </div>
      ${showEH ? `<div style="position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:7px;color:var(--blue);background:#dbeafe;padding:1px 5px;border-radius:3px;white-space:nowrap;pointer-events:none;z-index:99">${Math.round(s.w)}×${Math.round(s.h)}</div>` : ''}
    `;

    e.addEventListener('mousedown', onStallMousedown);
    e.addEventListener('click', ev => { if (!window.__didDragStall) onStallClick(s); });

    e.querySelector('.ms-resize')?.addEventListener('mousedown', ev => {
      if (appMode !== 'edit') return;
      ev.stopPropagation();
      ev.preventDefault();
      window.__resizeStall = s;
      window.__resizeOrigin = { mx: ev.clientX, my: ev.clientY, ow: s.w, oh: s.h };
    });
  });
}

// ── SVG route drawing ─────────────────────────────────────

function svgPath(d, stroke, sw, op) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  p.setAttribute('stroke', stroke);
  p.setAttribute('stroke-width', sw);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  p.setAttribute('opacity', op);
  return p;
}

export function drawRoute(pts, fromColor = '#059669', toColor = '#dc2626') {
  mapSvg.innerHTML = '';
  if (pts.length < 2) return;

  const d   = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
  const len = pts.reduce((acc, p, i) => i === 0 ? 0 : acc + Math.hypot(p.x - pts[i-1].x, p.y - pts[i-1].y), 0) + 800;

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `<linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${fromColor}"/><stop offset="100%" stop-color="${toColor}"/></linearGradient>`;
  mapSvg.appendChild(defs);

  const glow  = svgPath(d, 'url(#rg)', 16, 0.2);
  glow.style.filter = 'blur(8px)';
  glow.classList.add('route-anim');
  glow.setAttribute('stroke-dasharray', len);
  glow.setAttribute('stroke-dashoffset', len);
  mapSvg.appendChild(glow);

  const track = svgPath(d, 'rgba(13,26,58,0.06)', 5, 1);
  track.setAttribute('stroke-dasharray', 'none');
  mapSvg.appendChild(track);

  const line = svgPath(d, 'url(#rg)', 3, 1);
  line.setAttribute('stroke-dasharray', '14 7');
  mapSvg.appendChild(line);

  const scan = svgPath(d, '#fff', 2, 0.8);
  scan.setAttribute('stroke-dasharray', `28 ${len}`);
  scan.setAttribute('stroke-dashoffset', '28');
  scan.style.animation = 'pathDraw 3s linear infinite';
  mapSvg.appendChild(scan);

  pts.slice(1, -1).forEach(p => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', '4');
    c.setAttribute('fill', 'rgba(26,79,168,0.25)');
    mapSvg.appendChild(c);
  });
}

export function clearRoute() {
  mapSvg.innerHTML = '';
  pinsLayer.innerHTML = '';
}

// ── Destination pins ──────────────────────────────────────

export function drawPins(fromPt, toPt, fromColor, toColor) {
  pinsLayer.innerHTML = '';
  [{ pos: fromPt, color: fromColor, lbl: 'FROM' }, { pos: toPt, color: toColor, lbl: 'TO' }].forEach(({ pos, color, lbl }) => {
    const p = el('div', `position:absolute;left:${pos.x}px;top:${pos.y}px;transform:translate(-50%,-100%);z-index:70;pointer-events:none`, {}, pinsLayer);
    p.innerHTML = `
      <div style="width:26px;height:32px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;margin:0 auto;box-shadow:0 4px 10px rgba(0,0,0,0.2)">
        <div style="transform:rotate(45deg);font-size:10px">${mkIcon('MapPin', '#fff')}</div>
      </div>
      <div style="text-align:center;font-family:var(--mono);font-size:8px;font-weight:600;color:${color};margin-top:1px">${lbl}</div>`;
  });
}

// ── Minimap ───────────────────────────────────────────────

export function drawMinimap(pan, scale, walkPath, player) {
  const canvas = document.getElementById('mm-canvas');
  const ctx    = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  const sx = cw / MAP_W, sy = ch / MAP_H;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#e4e8f2';
  ctx.fillRect(0, 0, cw, ch);

  // Halls
  HALLS.forEach(h => {
    ctx.fillStyle = 'rgba(220,230,255,0.9)';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 0.8;
    ctx.fillRect(h.x * sx, HALL_TOP * sy, h.w * sx, HALL_H * sy);
    ctx.strokeRect(h.x * sx, HALL_TOP * sy, h.w * sx, HALL_H * sy);
  });

  // Stall footprints
  STALLS.forEach(s => {
    const m = CAT[s.cat] || CAT.publisher;
    ctx.fillStyle = m.bg;
    ctx.fillRect(s.x * sx, s.y * sy, Math.max(s.w * sx, 1.5), Math.max(s.h * sy, 1.5));
  });

  // Route line
  if (walkPath.length > 1) {
    ctx.strokeStyle = '#1a4fa8';
    ctx.lineWidth   = 1.2;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    walkPath.forEach((p, i) => i === 0 ? ctx.moveTo(p.x * sx, p.y * sy) : ctx.lineTo(p.x * sx, p.y * sy));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Viewport rectangle
  const r = vpEl.getBoundingClientRect();
  ctx.strokeStyle = 'rgba(13,26,58,0.25)';
  ctx.lineWidth   = 0.8;
  ctx.strokeRect((-pan.x / scale) * sx, (-pan.y / scale) * sy, (r.width / scale) * sx, (r.height / scale) * sy);

  // Player dot
  ctx.fillStyle   = '#1a4fa8';
  ctx.beginPath();
  ctx.arc(player.x * sx, player.y * sy, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1;
  ctx.stroke();
}
