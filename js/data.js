/**
 * data.js
 * Stall definitions for the World Book Fair 2026 floor plan.
 * Exports the mutable STALLS array and the makeStall factory.
 *
 * Facing directions:
 *   'N' = entry from top    (visitor approaches from above)
 *   'S' = entry from bottom
 *   'E' = entry from right
 *   'W' = entry from left
 */

import { CAT, HALL_TOP, HALL_BOTTOM } from './constants.js';

export const STALLS = [];

/**
 * Create and register a stall.
 * If `facing` is omitted it is auto-detected from the stall's y-position:
 *   - Near top wall  → faces South (into hall)
 *   - Near bottom wall → faces North (into hall)
 *   - Interior block → faces whichever of N/S is closer to the hall centre
 */
export function makeStall(id, name, cat, x, y, w, h, desc, open = true, facing = null) {
  if (!facing) {
    const cy = y + h / 2;
    if      (cy < HALL_TOP    + 80) facing = 'S';
    else if (cy > HALL_BOTTOM - 80) facing = 'N';
    else facing = (cy - HALL_TOP < HALL_BOTTOM - cy) ? 'N' : 'S';
  }
  STALLS.push({
    id, name, cat, x, y, w, h, desc, open, facing,
    icon: CAT[cat]?.icon || 'BookOpen',
  });
}

// ─────────────────────────────────────────────────────────
// HALL 5  (x: 60–560)
// ─────────────────────────────────────────────────────────
const H5X = 80;
for (let i = 0; i < 13; i++)
  makeStall(`H5-T${i+1}`, `Hall 5 Stall A-${i+1}`, 'publisher', H5X + i*34, HALL_TOP + 8,          30, 26, `Publisher booth A-${i+1}`);
for (let i = 0; i < 13; i++)
  makeStall(`H5-B${i+1}`, `Hall 5 Stall B-${i+1}`, 'publisher', H5X + i*34, HALL_TOP + (HALL_BOTTOM-HALL_TOP) - 34, 30, 26, `Publisher booth B-${i+1}`);

const H5G = [
  {x:90,y:180},{x:90,y:280},{x:90,y:380},{x:90,y:480},{x:90,y:580},
  {x:200,y:180},{x:200,y:280},{x:200,y:380},{x:200,y:480},{x:200,y:580},
  {x:310,y:180},{x:310,y:280},{x:310,y:380},{x:310,y:480},{x:310,y:580},
  {x:420,y:180},{x:420,y:280},{x:420,y:380},{x:420,y:480},{x:420,y:580},
];
H5G.forEach((g, i) =>
  makeStall(`H5-G${i+1}`, `Hall 5 Block ${Math.floor(i/5)+1}-${(i%5)+1}`, 'publisher', g.x, g.y, 80, 72, 'Book publisher block'));

makeStall('H5-AUTH',  "Author's Corner", 'special', 82,  HALL_TOP + 40, 120, 80, 'Meet the authors — signings & readings');
makeStall('H5-THEME', 'Theme Pavilion',  'special', 240, HALL_TOP + 40, 180, 80, 'NDWBF 2026 Theme Exhibition');

// ─────────────────────────────────────────────────────────
// HALL 4  (x: 600–1100)
// ─────────────────────────────────────────────────────────
const H4X = 620;
for (let i = 0; i < 13; i++)
  makeStall(`H4-T${i+1}`, `Hall 4 Stall A-${i+1}`, 'publisher', H4X + i*34, HALL_TOP + 8, 30, 26, `Publisher booth A-${i+1}`);
for (let i = 0; i < 13; i++)
  makeStall(`H4-B${i+1}`, `Hall 4 Stall B-${i+1}`, 'publisher', H4X + i*34, HALL_TOP + (HALL_BOTTOM-HALL_TOP) - 34, 30, 26, `Publisher booth B-${i+1}`);

const H4G = [
  {x:630,y:180},{x:630,y:280},{x:630,y:380},{x:630,y:480},{x:630,y:580},
  {x:740,y:180},{x:740,y:280},{x:740,y:380},{x:740,y:480},{x:740,y:580},
  {x:850,y:180},{x:850,y:280},{x:850,y:380},{x:850,y:480},{x:850,y:580},
  {x:960,y:180},{x:960,y:280},{x:960,y:380},{x:960,y:480},{x:960,y:580},
];
H4G.forEach((g, i) =>
  makeStall(`H4-G${i+1}`, `Hall 4 Block ${Math.floor(i/5)+1}-${(i%5)+1}`, 'publisher', g.x, g.y, 80, 72, 'Book publisher block'));

makeStall('H4-BIZ',   'Business Lounge', 'special', 740, 360, 180, 140, 'Business & networking lounge — publishers meet');
makeStall('H4-FOOD1', 'Café 4',          'food',    860, 500,  80,  60, 'Tea, coffee & snacks');

// ─────────────────────────────────────────────────────────
// HALL 3  (x: 1140–1640)
// ─────────────────────────────────────────────────────────
const H3X = 1160;
for (let i = 0; i < 13; i++)
  makeStall(`H3-T${i+1}`, `Hall 3 Stall A-${i+1}`, 'publisher', H3X + i*34, HALL_TOP + 8, 30, 26, `Publisher booth A-${i+1}`);
for (let i = 0; i < 13; i++)
  makeStall(`H3-B${i+1}`, `Hall 3 Stall B-${i+1}`, 'publisher', H3X + i*34, HALL_TOP + (HALL_BOTTOM-HALL_TOP) - 34, 30, 26, `Publisher booth B-${i+1}`);

const H3G = [
  {x:1170,y:180},{x:1170,y:280},{x:1170,y:380},{x:1170,y:480},{x:1170,y:580},
  {x:1280,y:180},{x:1280,y:280},{x:1280,y:380},{x:1280,y:480},{x:1280,y:580},
  {x:1390,y:180},{x:1390,y:280},{x:1390,y:380},{x:1390,y:480},{x:1390,y:580},
  {x:1500,y:180},{x:1500,y:280},{x:1500,y:380},{x:1500,y:480},{x:1500,y:580},
];
H3G.forEach((g, i) =>
  makeStall(`H3-G${i+1}`, `Hall 3 Block ${Math.floor(i/5)+1}-${(i%5)+1}`, 'publisher', g.x, g.y, 80, 72, 'Book publisher block'));

makeStall('H3-FOOD1', 'Refreshment Kiosk', 'food',    1390, 480, 80,  60,  'Snacks & cold beverages');
makeStall('H3-NBT',   'NBT India',          'special', 1280, 360, 120, 100, 'National Book Trust — India publisher');

// ─────────────────────────────────────────────────────────
// HALL 2  (x: 1680–2200)  — rightmost, international zone
// ─────────────────────────────────────────────────────────
const H2X = 1700;
for (let i = 0; i < 13; i++)
  makeStall(`H2-T${i+1}`, `Hall 2 Stall A-${i+1}`, 'publisher', H2X + i*34, HALL_TOP + 8, 30, 26, `Publisher booth A-${i+1}`);
for (let i = 0; i < 13; i++)
  makeStall(`H2-B${i+1}`, `Hall 2 Stall B-${i+1}`, 'publisher', H2X + i*34, HALL_TOP + (HALL_BOTTOM-HALL_TOP) - 34, 30, 26, `Publisher booth B-${i+1}`);

const H2G = [
  {x:1710,y:180},{x:1710,y:280},{x:1710,y:380},{x:1710,y:480},{x:1710,y:580},
  {x:1820,y:180},{x:1820,y:280},{x:1820,y:380},{x:1820,y:480},{x:1820,y:580},
  {x:1930,y:180},{x:1930,y:280},{x:1930,y:380},{x:1930,y:480},{x:1930,y:580},
  {x:2040,y:180},{x:2040,y:280},{x:2040,y:380},{x:2040,y:480},{x:2040,y:580},
];
H2G.forEach((g, i) =>
  makeStall(`H2-G${i+1}`, `Hall 2 Block ${Math.floor(i/5)+1}-${(i%5)+1}`, 'publisher', g.x, g.y, 80, 72, 'Book publisher block'));

makeStall('H2-INTL1', 'International Publishers', 'special', 2080, 180, 160, 150, 'International publishers zone');
makeStall('H2-INTL2', 'Foreign Publishers',        'special', 2080, 360, 160, 140, 'Foreign language & import books');
makeStall('H2-FOOD1', 'Food Court',                'food',    1820, 480, 200, 100, 'Central food court — Hall 2');

// ─────────────────────────────────────────────────────────
// FOYER STALLS (bottom perimeter of each hall)
// ─────────────────────────────────────────────────────────
[
  { hall: 'H5', cx: 310  },
  { hall: 'H4', cx: 850  },
  { hall: 'H3', cx: 1390 },
  { hall: 'H2', cx: 1930 },
].forEach(({ hall, cx }) => {
  for (let i = -3; i <= 3; i++)
    makeStall(`${hall}-FY${i+4}`, `${hall} Foyer ${i+4}`, 'publisher', cx + i*46, HALL_BOTTOM + 20, 38, 30, 'Foyer stall');
});

// ─────────────────────────────────────────────────────────
// SERVICES & INFO
// ─────────────────────────────────────────────────────────
makeStall('INFO1', 'Information Desk H5', 'info', 80,   HALL_TOP + 340, 70, 50, 'Maps, guides, lost & found');
makeStall('INFO2', 'Information Desk H2', 'info', 2180, HALL_TOP + 340, 70, 50, 'Maps, guides, lost & found');
makeStall('AID1',  'First Aid Centre',    'info', 1100, HALL_TOP + 40,  70, 50, 'Medical assistance');
makeStall('CARGO', 'Cargo Entry',         'info', 320,  60,             100, 36, 'Cargo from cars — Gate 3');
