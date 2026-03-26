# New Delhi World Book Fair 2026 — Navigator

Interactive indoor navigation for the World Book Fair 2026 at Bharat Mandapam, New Delhi.

## Features
- **Floor plan** faithful to the official PDF — Halls 2–5, service roads, foyers, toilets, amphitheaters
- **Occupancy-grid A\*** pathfinding — every empty space is walkable; routes navigate around any stall
- **Stall facing** — every stall has a configurable entry side (N/S/E/W); paths arrive at the front door
- **A→B routing** — pick any two stalls as origin and destination
- **Walking simulation** — animated player dot follows the computed path
- **Edit mode** — drag stalls, resize corners, change facing direction, add / remove stalls
- **Minimap** — live overview with route and viewport indicator
- **Search & filter** by name, description, or category

## Running locally

This project uses **ES modules** — it must be served over HTTP, not opened as `file://`.

```bash
# Python (no install needed)
python3 -m http.server 8080

# Node / npx
npx serve .

# VS Code
# Install the "Live Server" extension and click "Go Live"
```

Then open **http://localhost:8080** in your browser.

## File structure

```
bookfair-navigator/
├── index.html              Shell HTML — no inline JS or CSS
├── css/
│   ├── tokens.css          CSS variables, reset, keyframe animations
│   ├── sidebar.css         Sidebar, panels, search, list, modals
│   └── map.css             Map canvas, stall markers, controls, minimap
└── js/
    ├── constants.js        Map geometry, category metadata, SVG icons
    ├── data.js             STALLS array + makeStall() + all stall definitions
    ├── pathfinder.js       Occupancy-grid A*, path smoothing, entry points
    ├── renderer.js         DOM/SVG drawing: static elements, stalls, route, minimap
    ├── navigation.js       Walking simulation, nav status updates
    ├── editor.js           Drag/resize stalls, add/delete stall modal, facing
    ├── ui.js               Sidebar list, selected panel, search/filter, mode bar
    ├── viewport.js         Pan, zoom, mouse/touch, coordinate transforms
    └── main.js             Centralised state (getState/setState), boot sequence
```

## Module dependency graph

```
index.html
└── js/main.js
    ├── js/constants.js     (no dependencies)
    ├── js/data.js          → constants
    ├── js/pathfinder.js    → constants, data
    ├── js/renderer.js      → constants, data, pathfinder, main, editor
    ├── js/navigation.js    → constants, pathfinder, renderer, ui, main
    ├── js/editor.js        → constants, data, main, renderer, ui, navigation
    ├── js/ui.js            → constants, data, pathfinder, main, navigation, editor
    └── js/viewport.js      → main, editor, renderer
```

## Extending the map

**Add a stall in code** — edit `js/data.js`:
```js
makeStall('MY-01', 'My Publisher', 'publisher', 400, 300, 80, 60, 'Description here', true, 'S');
//         id       name            category      x    y   w   h   description         open  facing
```

**Add a category** — edit `CAT` in `js/constants.js` and add a chip in `index.html`.

**Change grid resolution** — edit `CELL` in `js/constants.js` (smaller = more precise, slower).
