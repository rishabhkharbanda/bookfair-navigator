/**
 * pathfinder.js
 * Occupancy-grid A* pathfinder.
 *
 * Every cell of the grid is walkable by default.
 * Stall footprints (+ a 1-cell margin) are marked blocked.
 * Routes terminate at a stall's ENTRY POINT — just outside its facing side —
 * rather than its geometric centre, so paths always arrive at the front door.
 *
 * Public API:
 *   computePath(fromPt, toStall)  → [{x,y}, …]
 *   stallEntry(stall)             → {x, y}   (entry point in world coords)
 */

import { MAP_W, MAP_H, CELL } from './constants.js';
import { STALLS } from './data.js';

const GW = Math.ceil(MAP_W / CELL);
const GH = Math.ceil(MAP_H / CELL);

// ── Coordinate helpers ────────────────────────────────────

/** World coords → nearest grid cell */
function w2g(wx, wy) {
  return { gx: Math.round(wx / CELL), gy: Math.round(wy / CELL) };
}

/** Grid cell → world centre */
function g2w(gx, gy) {
  return { x: gx * CELL + CELL / 2, y: gy * CELL + CELL / 2 };
}

// ── Occupancy grid ────────────────────────────────────────

/**
 * Build a fresh Uint8Array grid from current stall positions.
 * 0 = walkable, 1 = blocked.
 * Called fresh on each navigation request so moved/resized stalls
 * are always reflected.
 */
function buildGrid() {
  const grid = new Uint8Array(GW * GH); // all walkable by default

  // Block map border (1-px outer ring)
  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      const wx = gx * CELL, wy = gy * CELL;
      if (wx < 4 || wy < 4 || wx > MAP_W - 4 || wy > MAP_H - 4)
        grid[gy * GW + gx] = 1;
    }
  }

  // Block each stall footprint + 1-cell clearance margin (the aisle gap)
  const MARGIN = 1;
  STALLS.forEach(s => {
    const x0 = Math.floor(s.x / CELL) - MARGIN;
    const y0 = Math.floor(s.y / CELL) - MARGIN;
    const x1 = Math.ceil((s.x + s.w) / CELL) + MARGIN;
    const y1 = Math.ceil((s.y + s.h) / CELL) + MARGIN;
    for (let gy = Math.max(0, y0); gy < Math.min(GH, y1); gy++)
      for (let gx = Math.max(0, x0); gx < Math.min(GW, x1); gx++)
        grid[gy * GW + gx] = 1;
  });

  return grid;
}

// ── Entry point ───────────────────────────────────────────

/**
 * Return the world-coord point just outside the stall's facing (entry) side.
 * Paths terminate here instead of the stall centre.
 */
export function stallEntry(s) {
  const cx  = s.x + s.w / 2;
  const cy  = s.y + s.h / 2;
  const GAP = CELL * 1.5;
  switch (s.facing) {
    case 'N': return { x: cx,             y: s.y - GAP         };
    case 'S': return { x: cx,             y: s.y + s.h + GAP   };
    case 'E': return { x: s.x + s.w + GAP, y: cy               };
    case 'W': return { x: s.x - GAP,      y: cy                };
    default:  return { x: cx,             y: s.y - GAP         };
  }
}

// ── A* on occupancy grid ──────────────────────────────────

/**
 * 8-directional A* on the given grid.
 * Returns array of world-coord points or [] if no path found.
 */
function aStarGrid(grid, sx, sy, ex, ey) {
  sx = Math.max(0, Math.min(GW - 1, sx));
  sy = Math.max(0, Math.min(GH - 1, sy));
  ex = Math.max(0, Math.min(GW - 1, ex));
  ey = Math.max(0, Math.min(GH - 1, ey));

  // If start/end cell is blocked, nudge outward to nearest walkable cell
  const nudge = (gx, gy) => {
    if (!grid[gy * GW + gx]) return { gx, gy };
    for (let r = 1; r < 8; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const nx = gx + dx, ny = gy + dy;
          if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && !grid[ny * GW + nx])
            return { gx: nx, gy: ny };
        }
    return { gx, gy };
  };

  ({ gx: sx, gy: sy } = nudge(sx, sy));
  ({ gx: ex, gy: ey } = nudge(ex, ey));

  const key  = (gx, gy) => gy * GW + gx;
  const heur = (gx, gy) => Math.hypot(gx - ex, gy - ey);

  const gScore = new Float32Array(GW * GH).fill(Infinity);
  const fScore = new Float32Array(GW * GH).fill(Infinity);
  const came   = new Int32Array(GW * GH).fill(-1);

  const sk = key(sx, sy);
  gScore[sk] = 0;
  fScore[sk] = heur(sx, sy);

  // Open set as a simple sorted array — fine for our grid size (~162 × 94 cells)
  const open = [{ k: sk, f: fScore[sk] }];

  const DIRS = [
    [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
    [-1,-1, 1.414], [1,-1, 1.414], [-1, 1, 1.414], [1, 1, 1.414],
  ];

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const { k: ck } = open.shift();
    const cgx = ck % GW, cgy = Math.floor(ck / GW);

    if (cgx === ex && cgy === ey) {
      const path = [];
      let cur = ck;
      while (cur !== -1) {
        path.unshift(g2w(cur % GW, Math.floor(cur / GW)));
        cur = came[cur];
      }
      return path;
    }

    for (const [dx, dy, cost] of DIRS) {
      const nx = cgx + dx, ny = cgy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      if (grid[ny * GW + nx]) continue;

      // Prevent diagonal corner-cutting through blocked cells
      if (dx !== 0 && dy !== 0) {
        if (grid[cgy * GW + (cgx + dx)]) continue;
        if (grid[(cgy + dy) * GW + cgx])  continue;
      }

      const nk = key(nx, ny);
      const tg = gScore[ck] + cost;
      if (tg < gScore[nk]) {
        came[nk]   = ck;
        gScore[nk] = tg;
        fScore[nk] = tg + heur(nx, ny);
        open.push({ k: nk, f: fScore[nk] });
      }
    }
  }
  return [];
}

// ── Path smoothing (string-pulling via line-of-sight) ─────

/** Bresenham line-of-sight check on the occupancy grid */
function hasLoS(grid, a, b) {
  let { gx: x0, gy: y0 } = w2g(a.x, a.y);
  let { gx: x1, gy: y1 } = w2g(b.x, b.y);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (x0 < 0 || y0 < 0 || x0 >= GW || y0 >= GH) return false;
    if (grid[y0 * GW + x0]) return false;
    if (x0 === x1 && y0 === y1) return true;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 <  dx) { err += dx; y0 += sy; }
  }
}

/**
 * Remove redundant intermediate waypoints using line-of-sight smoothing.
 * Result is a shorter, visually cleaner path.
 */
function smoothPath(grid, rawPath) {
  if (rawPath.length <= 2) return rawPath;
  const result = [rawPath[0]];
  let anchor = 0;
  for (let i = 2; i < rawPath.length; i++) {
    if (!hasLoS(grid, rawPath[anchor], rawPath[i])) {
      result.push(rawPath[i - 1]);
      anchor = i - 1;
    }
  }
  result.push(rawPath[rawPath.length - 1]);
  return result;
}

// ── Path utilities ────────────────────────────────────────

export function dedupe(pts) {
  return pts.filter((p, i) => i === 0 || d2(p, pts[i - 1]) > 0.5);
}

export function pLen(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += d2(pts[i-1], pts[i]);
  return l;
}

export function d2(a, b) {
  return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
}

export function stallC(s) {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

// ── Public: compute path from world point → stall ─────────

/**
 * Route from `fromPt` to `toStall`, arriving at the stall's facing entry side.
 * Rebuilds the occupancy grid fresh so stall edits are always reflected.
 */
export function computePath(fromPt, toStall) {
  const grid    = buildGrid();
  const toEntry = stallEntry(toStall);

  const { gx: sx, gy: sy } = w2g(fromPt.x, fromPt.y);
  const { gx: ex, gy: ey } = w2g(toEntry.x, toEntry.y);

  const rawPath = aStarGrid(grid, sx, sy, ex, ey);
  if (!rawPath.length) return [fromPt, toEntry];

  const smooth = smoothPath(grid, rawPath);
  if (smooth.length) smooth[smooth.length - 1] = toEntry;
  smooth.unshift(fromPt);

  return dedupe(smooth);
}
