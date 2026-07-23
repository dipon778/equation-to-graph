# Math Graphing Application

An interactive, real-time mathematical equation grapher built with React, TypeScript, and HTML5 Canvas. Plot explicit, implicit, parametric, and polar equations. Fill inequality regions. Pan, zoom, and inspect coordinates with a crosshair cursor.

![Tech Stack](https://img.shields.io/badge/React-18.3-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6) ![Vite](https://img.shields.io/badge/Vite-5.4-646CFF)

---

## Features

- **Multiple equation types** — explicit (`y = sin(x)`), implicit (`x^2 + y^2 = 9`), parametric (`x = cos(t), y = sin(t)`), and polar (`r = 1 + cos(t)`)
- **Inequality fill** — shade regions with `x^2 + y^2 < 4` or `y > sin(x)`
- **Adaptive grid resolution** — two-pass marching squares: coarse scan finds curves, 8x8 subdivision refines them
- **Frequency-aware bailout** — automatically skips cells where oscillations are too fast to render, preventing hangs on complex equations
- **Interactive viewport** — drag to pan, scroll to zoom centered on cursor
- **Coordinate crosshair** — hover shows crosshair lines and `(x, y)` tooltip
- **Equation persistence** — equations saved to `localStorage`, survive page refresh
- **Error feedback** — invalid equations show red border and error message
- **Multi-equation support** — plot multiple equations simultaneously, each with a distinct color
- **Equation management** — add, edit (double-click), delete, and toggle visibility
- **Light theme** — clean whitish canvas with dark grid and axes

---

## Quick Start

```bash
cd math-graphing-app
npm install
npm run dev
```

Open **http://localhost:3000** (or the port shown in terminal).

---

## Equation Syntax

### Explicit
```
y = sin(x)
y = x^2
y = 3*sin(2*x) + cos(x)
```

### Implicit (any equation with x and y)
```
x^2 + y^2 = 9
(x^2+y^2-1)^3 = x^2*y^3
sin(x^2+y^2) = cos(x*y)
```

### Parametric (t ranges from -2pi to 2pi)
```
x=cos(3*t)-cos(2*t), y=sin(3*t)-sin(2*t)
x=t^2, y=sin(t)
```

### Polar (t ranges from 0 to 2pi)
```
r=1+cos(t)
r=cos(5*t)
```

### Inequalities (fills the region)
```
x^2+y^2<4
y>sin(x)
x^2/4+y^2/9<=1
```

---

## Supported Functions

| Functions | Constants |
|-----------|-----------|
| `sin`, `cos`, `tan` | `pi` (3.14159...) |
| `asin`, `acos`, `atan`, `atan2` | `e` (2.71828...) |
| `sinh`, `cosh`, `tanh` | |
| `sqrt`, `cbrt`, `abs` | |
| `log`, `log2`, `log10` | |
| `exp`, `ceil`, `floor`, `round` | |

Use `^` for exponentiation (auto-converts to `**`).

---

## Project Structure

```
src/
├── App.tsx                  # Root component — state + localStorage persistence
├── main.tsx                 # ReactDOM entry point
├── setupTests.ts            # Test setup (vitest globals)
├── components/
│   ├── ControlPanel.tsx     # Sidebar UI — input, equation list, settings, quote
│   ├── EquationList.tsx     # Equation cards with edit/delete/visibility/error display
│   ├── GraphCanvas.tsx      # Canvas wrapper — pan/zoom/crosshair/draw lifecycle
│   └── SettingsPanel.tsx    # Viewport range inputs (X min/max)
├── lib/
│   └── graph.ts             # Canvas rendering engine — all plotting logic
├── hooks/
│   └── useDebouncedPlot.ts  # Generic debounce hook (avoids rapid re-renders)
├── styles/
│   └── index.css            # All application styles
└── types/
    └── index.ts             # TypeScript types + GRAPH_COLORS palette
```

---

## Architecture (Data Flow)

```
 App (state owner: equations[], xMin, xMax, inputValue)
  │  └── localStorage persistence (auto-save/load)
  ├── ControlPanel (props in)
  │   ├── Input + Plot button → calls onAddEquation (validates first)
  │   ├── EquationList
  │   │   ├── Visibility toggle
  │   │   ├── Inline edit (re-validates on save)
  │   │   ├── Error display (red border + message)
  │   │   └── Delete
  │   ├── Clear All button
  │   ├── SettingsPanel → calls onSettingsChange
  │   └── Quote section (static)
  └── GraphCanvas (receives visibleEquations, xMin, xMax)
       ├── Mouse drag → pan viewport (refs, no re-render)
       ├── Scroll → zoom viewport (cursor-anchored)
       ├── Crosshair → tracks mouse position, shows (x,y) tooltip
       └── renderGraph(canvas, equations, xMin, xMax, yMin, yMax)
```

---

## Rendering Pipeline

The rendering engine (`lib/graph.ts`) handles five equation types:

1. **Explicit** `y = f(x)` — evaluates at ~width*2 sample points, draws connected segments
2. **Implicit** `f(x,y) = g(x,y)` — algebraic quadratic solver if possible, otherwise adaptive marching squares
3. **Parametric** `x=f(t), y=g(t)` — iterates t from -2pi to 2pi, plots (x(t), y(t))
4. **Polar** `r=f(t)` — iterates t from 0 to 2pi, converts to Cartesian
5. **Inequality** `f(x,y) > g(x,y)` — fills cells where condition is true, draws boundary

### Adaptive Marching Squares

For implicit equations, the engine uses a two-pass approach:

1. **Coarse scan** (~300x225 grid) — finds cells where the curve passes through
2. **Fine refinement** (8x8 subdivision) — only subdivides cells with sign changes
3. **Frequency bailout** — skips cells with 3+ edge sign changes (too fast to resolve)
4. **Budget cap** — limits total fine cells to 500k to prevent hangs

---

## Testing

```bash
npm run test:run
```

Tests use **Vitest** with React Testing Library.

---

## License

MIT
