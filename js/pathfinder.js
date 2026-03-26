/**
 * pathfinder.js  —  Waypoint-Graph A* Pathfinder
 * ═══════════════════════════════════════════════
 *
 * WHY NOT A PIXEL GRID?
 * The occupancy-grid approach failed because:
 *  1. At CELL=16px aisles are only 1-2 cells wide. A 1-cell margin around
 *     each stall completely blocks those aisles.
 *  2. array.sort() as a priority queue is O(n²) — hangs on long routes.
 *
 * THE RIGHT MODEL (how Google Maps works)
 * Walkable space is a structured lattice of named aisles intersecting at
 * known points. We model this as a WAYPOINT GRAPH:
 *   node  = aisle intersection  {id, x, y}
 *   edge  = aisle segment       weight = Euclidean distance
 *
 * A* on this graph:
 *   • Correct  — only traverses real aisles, never stall interiors
 *   • Fast     — ~200 nodes, binary-heap open set = O(log n) per step
 *   • Robust   — stall edits never change the aisle graph
 *
 * STALL CONNECTION
 * stallEntry() returns the point just outside the stall's facing side.
 * At query time we inject fromPt and entry as temporary virtual nodes
 * connected to their nearest graph node, run A*, then strip them.
 */

// ── Map geometry ──────────────────────────────────────────
const MAP_W    = 2600;
const MAP_H    = 1500;

// ══════════════════════════════════════════════════════════
//  AISLE WAYPOINT GRAPH
//  Derived from the official floor plan (1 m = 1 map unit approx)
//  Halls: H5(x60-560)  H4(x600-1100)  H3(x1140-1640)  H2(x1680-2200)
// ══════════════════════════════════════════════════════════

// Horizontal aisle rows  (y values)
const ROW_Y = {
  R0:    135,   // top perimeter walkway (inside hall, just inside north wall)
  R1:    230,   // 1st cross-aisle
  R2:    360,   // 2nd cross-aisle
  R3:    500,   // 3rd cross-aisle (centre)
  R4:    640,   // 4th cross-aisle
  R5:    770,   // 5th cross-aisle
  R6:    895,   // bottom perimeter walkway (just inside south wall)
  FOYER: 950,   // foyer strip (below hall south wall)
};

// Vertical aisle columns  (x values)
// Each hall has a west-perimeter, 4 internal verticals, east-perimeter
// Plus wide inter-hall corridors between halls
const COL_X = {
  // Hall 5
  H5_W:  72,    // west perimeter
  H5_1:  170,   // between stall cols A/B
  H5_2:  265,   // between stall cols B/C
  H5_3:  368,   // between stall cols C/D
  H5_4:  462,   // between stall cols D/E
  H5_E:  552,   // east perimeter
  // Inter-hall H5↔H4
  IH54A: 568,
  IH54B: 592,
  // Hall 4
  H4_W:  608,
  H4_1:  690,
  H4_2:  785,
  H4_3:  880,
  H4_4:  975,
  H4_E:  1088,
  // Inter-hall H4↔H3
  IH43A: 1105,
  IH43B: 1130,
  // Hall 3
  H3_W:  1148,
  H3_1:  1235,
  H3_2:  1325,
  H3_3:  1420,
  H3_4:  1515,
  H3_E:  1628,
  // Inter-hall H3↔H2
  IH32A: 1645,
  IH32B: 1668,
  // Hall 2
  H2_W:  1685,
  H2_1:  1775,
  H2_2:  1870,
  H2_3:  1965,
  H2_4:  2060,
  H2_E:  2185,
};

function buildAisleGraph() {
  const nodes = new Map();  // id → {id,x,y}
  const adj   = new Map();  // id → [{id,cost}]

  const rowEntries = Object.entries(ROW_Y);
  const colEntries = Object.entries(COL_X);

  function addNode(id, x, y) {
    nodes.set(id, { id, x, y });
    if (!adj.has(id)) adj.set(id, []);
  }

  function addEdge(a, b) {
    if (!nodes.has(a) || !nodes.has(b)) return;
    const na = nodes.get(a), nb = nodes.get(b);
    const cost = Math.hypot(na.x - nb.x, na.y - nb.y);
    adj.get(a).push({ id: b, cost });
    adj.get(b).push({ id: a, cost });
  }

  // Create all intersection nodes
  for (const [cn, cx] of colEntries) {
    for (const [rn, ry] of rowEntries) {
      addNode(`${cn}__${rn}`, cx, ry);
    }
  }

  // Connect horizontally along each row
  for (const [rn] of rowEntries) {
    const cols = colEntries.map(([cn]) => cn);
    for (let i = 0; i < cols.length - 1; i++) {
      addEdge(`${cols[i]}__${rn}`, `${cols[i+1]}__${rn}`);
    }
  }

  // Connect vertically along each column
  for (const [cn] of colEntries) {
    const rows = rowEntries.map(([rn]) => rn);
    for (let i = 0; i < rows.length - 1; i++) {
      addEdge(`${cn}__${rows[i]}`, `${cn}__${rows[i+1]}`);
    }
  }

  // Main entrance node (south of Hall 3/4 boundary, below foyer)
  addNode('ENTRANCE', 1320, 1300);
  addEdge('ENTRANCE', 'IH43A__FOYER');
  addEdge('ENTRANCE', 'IH43B__FOYER');
  addEdge('ENTRANCE', 'H3_W__FOYER');
  addEdge('ENTRANCE', 'H4_E__FOYER');

  return { nodes, adj };
}

const GRAPH = buildAisleGraph();

// ══════════════════════════════════════════════════════════
//  BINARY MIN-HEAP  — O(log n) push/pop
// ══════════════════════════════════════════════════════════
class MinHeap {
  constructor() { this.h = []; }
  push(item) { this.h.push(item); this._up(this.h.length - 1); }
  pop() {
    const top = this.h[0], last = this.h.pop();
    if (this.h.length) { this.h[0] = last; this._dn(0); }
    return top;
  }
  get size() { return this.h.length; }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.h[p].f <= this.h[i].f) break;
      [this.h[p], this.h[i]] = [this.h[i], this.h[p]]; i = p;
    }
  }
  _dn(i) {
    const n = this.h.length;
    for (;;) {
      let s = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this.h[l].f < this.h[s].f) s = l;
      if (r < n && this.h[r].f < this.h[s].f) s = r;
      if (s === i) break;
      [this.h[s], this.h[i]] = [this.h[i], this.h[s]]; i = s;
    }
  }
}

// ══════════════════════════════════════════════════════════
//  A*  on waypoint graph
// ══════════════════════════════════════════════════════════
function aStarWaypoint(nodes, adj, startId, endId) {
  const endNode = nodes.get(endId);
  if (!endNode) return [];

  const g = new Map(), came = new Map();
  g.set(startId, 0);

  const heap = new MinHeap();
  heap.push({ id: startId, f: _h(nodes.get(startId), endNode) });

  while (heap.size > 0) {
    const { id: cur } = heap.pop();
    if (cur === endId) {
      const path = [];
      let c = cur;
      while (c !== undefined) { path.unshift(nodes.get(c)); c = came.get(c); }
      return path;
    }
    const curG = g.get(cur) ?? Infinity;
    for (const { id: nb, cost } of (adj.get(cur) || [])) {
      const tg = curG + cost;
      if (tg < (g.get(nb) ?? Infinity)) {
        came.set(nb, cur); g.set(nb, tg);
        heap.push({ id: nb, f: tg + _h(nodes.get(nb), endNode) });
      }
    }
  }
  return [];
}

function _h(a, b) { return (!a || !b) ? 0 : Math.hypot(a.x - b.x, a.y - b.y); }

// ══════════════════════════════════════════════════════════
//  NEAREST GRAPH NODE  to any world point
// ══════════════════════════════════════════════════════════
function nearestNode(x, y) {
  let best = null, bestD = Infinity;
  for (const [id, n] of GRAPH.nodes) {
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}

// ══════════════════════════════════════════════════════════
//  PUBLIC UTILITIES
// ══════════════════════════════════════════════════════════
export function d2(a, b) {
  return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
}
export function pLen(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += d2(pts[i-1], pts[i]);
  return l;
}
export function stallC(s) { return { x: s.x + s.w/2, y: s.y + s.h/2 }; }
export function dedupe(pts) { return pts.filter((p,i) => i===0 || d2(p,pts[i-1])>1); }

export function stallEntry(s) {
  const cx = s.x + s.w/2, cy = s.y + s.h/2, G = 28;
  switch (s.facing) {
    case 'N': return { x: cx,         y: s.y - G         };
    case 'S': return { x: cx,         y: s.y + s.h + G   };
    case 'E': return { x: s.x+s.w+G,  y: cy              };
    case 'W': return { x: s.x - G,    y: cy              };
    default:  return { x: cx,         y: s.y - G         };
  }
}

// ══════════════════════════════════════════════════════════
//  computePath(fromPt, toStall)  — main public API
// ══════════════════════════════════════════════════════════
export function computePath(fromPt, toStall) {
  const entry = stallEntry(toStall);

  const startId = nearestNode(fromPt.x, fromPt.y);
  const endId   = nearestNode(entry.x,  entry.y);

  if (!startId || !endId) return [fromPt, entry];

  // Inject two temporary virtual nodes so A* can start/end at exact coords
  const TS = '__TS__', TE = '__TE__';

  // Build temporary augmented copies (shallow clone of adj lists)
  const tmpNodes = new Map(GRAPH.nodes);
  const tmpAdj   = new Map();
  for (const [id, nbrs] of GRAPH.adj) tmpAdj.set(id, [...nbrs]);

  const sCost = d2(fromPt, GRAPH.nodes.get(startId));
  const eCost = d2(entry,  GRAPH.nodes.get(endId));

  tmpNodes.set(TS, { id: TS, x: fromPt.x, y: fromPt.y });
  tmpAdj.set(TS, [{ id: startId, cost: sCost }]);
  tmpAdj.get(startId).push({ id: TS, cost: sCost });

  tmpNodes.set(TE, { id: TE, x: entry.x, y: entry.y });
  tmpAdj.set(TE, [{ id: endId, cost: eCost }]);
  tmpAdj.get(endId).push({ id: TE, cost: eCost });

  const graphPath = aStarWaypoint(tmpNodes, tmpAdj, TS, TE);

  // Remove temp connections we injected (keep GRAPH.adj clean for next call)
  const sn = tmpAdj.get(startId); const si = sn?.findIndex(n=>n.id===TS); if(si!==-1 && si!=null) sn.splice(si,1);
  const en = tmpAdj.get(endId);   const ei = en?.findIndex(n=>n.id===TE); if(ei!==-1 && ei!=null) en.splice(ei,1);

  if (!graphPath.length) return [fromPt, entry];

  const pts = graphPath.map(n => ({ x: n.x, y: n.y }));
  pts[0] = { ...fromPt };
  pts[pts.length - 1] = { ...entry };

  return dedupe(rdp(pts, 3));
}

// ══════════════════════════════════════════════════════════
//  RAMER-DOUGLAS-PEUCKER  path simplification
// ══════════════════════════════════════════════════════════
function rdp(pts, eps) {
  if (pts.length <= 2) return pts;
  let maxD = 0, idx = 0;
  const s = pts[0], e = pts[pts.length-1];
  for (let i = 1; i < pts.length-1; i++) {
    const d = ptSegDist(pts[i], s, e);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    return [...rdp(pts.slice(0, idx+1), eps).slice(0,-1), ...rdp(pts.slice(idx), eps)];
  }
  return [s, e];
}

function ptSegDist(p, a, b) {
  const dx = b.x-a.x, dy = b.y-a.y;
  if (!dx && !dy) return d2(p, a);
  const t = Math.max(0, Math.min(1, ((p.x-a.x)*dx + (p.y-a.y)*dy) / (dx*dx+dy*dy)));
  return d2(p, { x: a.x+t*dx, y: a.y+t*dy });
}
