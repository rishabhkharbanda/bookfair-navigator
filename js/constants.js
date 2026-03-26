/**
 * constants.js
 * Floor plan geometry, category metadata, and SVG icon library.
 * Nothing in here changes at runtime — pure read-only config.
 */

// ── Map dimensions ────────────────────────────────────────
export const MAP_W     = 2600;
export const MAP_H     = 1500;
export const HALL_TOP  = 120;
export const HALL_BOTTOM = 920;
export const HALL_H    = HALL_BOTTOM - HALL_TOP; // 800

// ── Hall definitions (left → right: H5, H4, H3, H2) ──────
export const HALLS = [
  { id: 'H5', label: 'EXHIBITION HALL - 5', x: 60,   w: 500, color: 'rgba(230,235,255,0.8)' },
  { id: 'H4', label: 'EXHIBITION HALL - 4', x: 600,  w: 500, color: 'rgba(235,245,255,0.8)' },
  { id: 'H3', label: 'EXHIBITION HALL - 3', x: 1140, w: 500, color: 'rgba(240,255,240,0.8)' },
  { id: 'H2', label: 'EXHIBITION HALL - 2', x: 1680, w: 500, color: 'rgba(255,240,240,0.8)' },
];

// ── Corridor layout (visual overlays + used by old graph; kept for rendering) ──
export const H_CORR         = [220, 360, 500, 640, 780]; // horizontal aisle y-values
export const V_CORR_BETWEEN = [560, 1100, 1640];          // inter-hall vertical corridors
export const PW_H = 40; // pathway strip height (px)
export const PW_V = 40; // pathway strip width  (px)

// ── Occupancy-grid A* cell size ───────────────────────────
export const CELL = 16; // map units per grid cell

// ── Category metadata ─────────────────────────────────────
export const CAT = {
  publisher: { color: '#1e40af', bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a', icon: 'BookOpen'  },
  food:      { color: '#b45309', bg: '#fef3c7', border: '#fcd34d', text: '#78350f', icon: 'Coffee'    },
  info:      { color: '#0e7490', bg: '#cffafe', border: '#67e8f9', text: '#164e63', icon: 'Info'       },
  special:   { color: '#6d28d9', bg: '#ede9fe', border: '#c4b5fd', text: '#4c1d95', icon: 'Star'       },
};

// ── Inline SVG icon library (Lucide-style) ────────────────
export const ICONS = {
  BookOpen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  Coffee:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
  Info:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  Star:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  MapPin:   `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
};

/**
 * Returns an SVG string with currentColor replaced by the given colour.
 * @param {string} name - Icon name key
 * @param {string} color - CSS colour value
 */
export function mkIcon(name, color) {
  return (ICONS[name] || ICONS.Info)
    .replace(/stroke="currentColor"/g, `stroke="${color || 'currentColor'}"`)
    .replace(/fill="currentColor"/g,   `fill="${color || 'currentColor'}"`);
}
