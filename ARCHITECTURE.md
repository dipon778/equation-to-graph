# Architecture Document — Math Graphing Application

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Component Tree & Data Flow](#3-component-tree--data-flow)
4. [Function Call Hierarchy](#4-function-call-hierarchy)
5. [State Management](#5-state-management)
6. [Rendering Pipeline (Canvas)](#6-rendering-pipeline-canvas)
7. [Equation Parsing & Evaluation](#7-equation-parsing--evaluation)
8. [Pan & Zoom Mechanics](#8-pan--zoom-mechanics)
9. [Equation Lifecycle](#9-equation-lifecycle)
10. [Event Flow Diagrams](#10-event-flow-diagrams)

---

## 1. Project Overview

This is a **single-page React application** that renders mathematical equations on an HTML5 Canvas element. Users can:

- Type explicit equations like `y = sin(x)`
- Type implicit equations like `x^2 + y^2 = 9`
- Type parametric equations like `x = cos(t), y = sin(t)`
- Type polar equations like `r = 1 + cos(t)`
- Type inequalities like `x^2 + y^2 < 4` with region fill
- Plot multiple equations simultaneously with distinct colors
- Drag to pan the viewport (X and Y axes)
- Scroll to zoom in/out centered on cursor
- Inspect coordinates via crosshair tooltip
- Edit, delete, toggle visibility, and clear all equations
- Equations persist across page refreshes via localStorage

**Tech stack:** React 18.3, TypeScript 5.6, Vite 5.4, Vitest, HTML5 Canvas 2D API.

---

## 2. Directory Structure

```
src/
├── App.tsx                  # Root component — holds all state + localStorage
├── main.tsx                 # ReactDOM.createRoot entry
├── setupTests.ts            # Vitest global test setup
├── components/
│   ├── ControlPanel.tsx     # Sidebar: input + equation list + settings + quote
│   ├── EquationList.tsx     # Renders equation cards with controls + error display
│   ├── GraphCanvas.tsx      # Canvas wrapper: pan/zoom/crosshair/draw lifecycle
│   └── SettingsPanel.tsx    # X range inputs + Apply button
├── lib/
│   └── graph.ts             # Canvas 2D rendering engine (pure functions)
├── hooks/
│   └── useDebouncedPlot.ts  # Generic debounce hook using useEffect
├── styles/
│   └── index.css            # All application styles
└── types/
    └── index.ts             # TypeScript interfaces + constants
```

---

## 3. Component Tree & Data Flow

```
                         ┌──────────────────────┐
                         │       App.tsx         │
                         │  (State Owner)        │
                         │                       │
                         │  State:               │
                         │  ─ equations[]        │
                         │  ─ inputValue         │
                         │  ─ xMin, xMax         │
                         │                       │
                         │  Persistence:         │
                         │  ─ localStorage       │
                         │  ─ auto-save/load     │
                         └──────┬───────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
   ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
   │  ControlPanel   │  │                  │  │    GraphCanvas       │
   │  (props in)     │  │  Math quote      │  │  (props in)          │
   │                 │  │  (static)        │  │                      │
   │  Props:         │  └──────────────────┘  │  Props:              │
   │  ─ inputValue   │                        │  ─ equations[]       │
   │  ─ equations[]  │                        │  ─ xMin, xMax        │
   │  ─ xMin, xMax   │                        │  ─ onSettingsChange  │
   │  ─ callbacks*   │                        │                      │
   └────────┬────────┘                        │  Local refs:         │
            │                                 │  ─ xViewRef          │
       ┌────┼────┐                            │  ─ yCenterRef        │
       │    │    │                            │  ─ yRangeRef         │
       ▼    ▼    ▼                            └──────────┬───────────┘
  ┌────────┐┌──────┐┌──────────────┐                     │
  │Equation││Input ││  Settings    │                     ▼
  │ List   ││+Plot ││  Panel       │            ┌──────────────────┐
  │        ││Btn   ││              │            │  renderGraph()   │
  │ ─ Edit ││      ││ ─ X min/max │            │  (lib/graph.ts)  │
  │ ─ Vis  ││      ││ ─ Apply btn │            │                  │
  │ ─ Del  ││      ││              │            │  ─ drawGrid()    │
  │ ─ Err  ││      ││              │            │  ─ drawAxes()    │
  └────────┘└──────┘└──────────────┘            │  ─ plotEquation()│
   │                                             └──────────────────┘
   └── Clear All button
```

**Callbacks passed to ControlPanel:**
- `onInputChange(value)` — input field changed
- `onAddEquation(formula)` — user clicked Plot or pressed Enter (validates first)
- `onRemoveEquation(formula)` — user clicked Delete
- `onToggleVisibility(formula)` — user clicked visibility toggle
- `onEditEquation(oldFormula, newFormula)` — user edited an equation (re-validates)
- `onClearAll()` — user clicked Clear All
- `onSettingsChange(xMin, xMax)` — user applied new X range

---

## 4. Function Call Hierarchy

### 4.1. Adding an Equation

```
User types "x^2 + y^2 < 4"
  → Input onChange event
    → ControlPanel.handleInputChange()
      → App.handleInputChange("x^2 + y^2 < 4")
        → setInputValue("x^2 + y^2 < 4")

User presses Enter (or clicks Plot)
  → ControlPanel.handleKeyDown() / handleAddEquation()
    → App.addEquation("x^2 + y^2 < 4")
      → validateEquation("x^2 + y^2 < 4")  // returns null (valid)
      → setEquations(prev => [...prev, {formula, color, isVisible: true}])
      → setInputValue("")
      → localStorage.setItem(STORAGE_KEY, JSON.stringify(equations))
        → React re-renders
          → GraphCanvas.debouncedEquations updates
            → renderGraph()
              → plotEquation("x^2+y^2<4", ...)
                → detects inequality operator "<"
                → plotInequality(lhs, rhs, "<", ...)
```

### 4.2. Rendering an Implicit Equation

```
plotEquation("sin(x^2+y^2)=cos(x*y)+sin(x-y)")
  → normalizedEq contains "y" but doesn't start with "y="
  → split on "=" → lhs="sin(x^2+y^2)", rhs="cos(x*y)+sin(x-y)"
  → sanitizeForMath() on both sides
  → solveQuadraticForY() fails (has Math.sin/ functions)
  → plotImplicitScan(lhs, rhs, color, ...)

plotImplicitScan():
  1. Build fn = new Function('x','y', 'return (lhs) - (rhs)')
  2. Coarse grid (300x225): evaluate fn at each vertex
  3. Find cells with sign changes:
     - Count edge sign changes per cell
     - Skip cells with 3+ changes (frequency bailout)
     - Collect remaining cells for refinement
  4. Dynamic subdivision: if too many cells, reduce from 8x8 to smaller
  5. For each refinement cell:
     - Evaluate fn on 8x8 fine grid inside the cell
     - Run marching squares on fine grid
     - Draw line segments
```

### 4.3. Deleting an Equation

```
User clicks Delete
  → App.removeEquation(formula)
    → setEquations(prev => prev.filter(eq => eq.formula !== formula))
    → localStorage.setItem(...)  // persist
  → Canvas re-draws without the removed equation
```

### 4.4. Editing an Equation

```
User double-clicks equation text (or clicks Edit)
  → EquationList.startEditing(formula)
  → Inline input appears
  User types new formula + presses Enter
  → EquationList.saveEdit()
    → App.editEquation(oldFormula, newFormula)
      → validateEquation(newFormula)  // may set error
      → setEquations(prev => prev.map(...))
      → localStorage.setItem(...)
  → Canvas re-draws with updated formula
```

### 4.5. Panning (Drag)

```
Mouse down → isDragging = true, dragStart = coords
Mouse move → dx, dy → xPan = -(dx/width)*xRange, yPan = (dy/height)*yRange
            → update xViewRef, yCenterRef → draw() (no React re-render)
Mouse up   → isDragging = false → onSettingsChange (syncs SettingsPanel)
```

### 4.6. Zooming (Scroll)

```
Scroll → zoomFactor = 1.1 or 0.9
       → newXRange = xRange * zoomFactor
       → Anchor to cursor: centerX, centerY stay fixed in math coords
       → Update xViewRef, yCenterRef, yRangeRef → draw()
```

### 4.7. Crosshair

```
Mouse move → getCanvasCoords() → getMathCoords() → setMousePos()
           → React renders crosshair divs + tooltip at mouse position
Mouse leave → setMousePos(null) → crosshair hidden
```

---

## 5. State Management

**No external state library.** All state in `App.tsx` using React hooks.

| State Variable | Type | Purpose |
|---|---|---|
| `equations` | `EquationItem[]` | All equations with color, visibility, and optional error |
| `inputValue` | `string` | Current input text |
| `xMin` | `number` | Left edge of X viewport |
| `xMax` | `number` | Right edge of X viewport |

**EquationItem type:**
```ts
interface EquationItem {
  formula: string;
  color: string;
  isVisible: boolean;
  error?: string;  // validation error message, undefined if valid
}
```

**Local state/refs in components:**

| Component | State/Ref | Purpose |
|---|---|---|
| `GraphCanvas` | `useRef` (xViewRef, yCenterRef, yRangeRef) | Viewport tracking |
| `GraphCanvas` | `useRef` (isDragging, dragStart) | Mouse drag tracking |
| `GraphCanvas` | `useState` (mousePos) | Crosshair position |
| `EquationList` | `useState` (editingFormula, editValue) | Inline editing |

**Performance:**
- `useDebouncedPlot` delays canvas redraw by 200ms
- Pan/zoom uses refs (not state) — no React re-render during drag
- Canvas draw is a pure function call

**Persistence:**
- Equations auto-save to `localStorage` on every change
- Equations auto-load from `localStorage` on startup

---

## 6. Rendering Pipeline (Canvas)

### Entry Point: `renderGraph(canvas, equations, xMin, xMax, yMin, yMax)`

1. **High-DPI setup** — scale by `devicePixelRatio`
2. **Clear & fill** — `#F8F9FA` light background
3. **Draw grid** — faint dark lines at calculated step intervals
4. **Draw axes** — dark lines through origin with tick marks and labels
5. **Plot equations** — dispatch to appropriate plotter per equation type

### Equation Type Detection (in `plotEquation`)

| Order | Check | Result |
|---|---|---|
| 1 | Contains `,` and `t` with `x=` and `y=` | Parametric → `plotParametric()` |
| 2 | Starts with `r=` and has `t` | Polar → `plotPolar()` |
| 3 | Contains `>=`, `<=`, `>`, `<` | Inequality → `plotInequality()` |
| 4 | Starts with `y=` and RHS has no `y` | Explicit → `plotStandard()` |
| 5 | Contains `y` and has `=` | Implicit → solve or `plotImplicitScan()` |
| 6 | No `y` at all | Constant → `plotStandard()` |
| 7 | Fallback | `plotImplicitScan()` |

### Rendering Functions

| Function | Purpose |
|---|---|
| `renderGraph()` | Main entry — sets up canvas, calls sub-functions |
| `drawGrid()` | Draws faint grid lines |
| `drawAxes()` | Draws axes through origin with tick marks and labels |
| `plotEquation()` | Dispatches to the correct plotter |
| `plotStandard()` | Evaluates y = f(x) at sample points |
| `plotParametric()` | Iterates t, plots (x(t), y(t)) |
| `plotPolar()` | Iterates t, plots (r*cos(t), r*sin(t)) |
| `plotInequality()` | Fills cells where inequality is true + boundary line |
| `plotImplicitScan()` | Adaptive marching squares (two-pass) |
| `solveQuadraticForY()` | Algebraic quadratic solver for simple polynomials |
| `validateEquation()` | Syntax + evaluation check, returns error or null |

---

## 7. Equation Parsing & Evaluation

### Supported Functions

`sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `sqrt`, `cbrt`, `abs`, `log`, `log2`, `log10`, `exp`, `ceil`, `floor`, `round`

### sanitizeForMath() Transformations

```
Input:  "sin(x^2) + pi*e"
Step 1: replace ^ → **     → "sin(x**2) + pi*e"
Step 2: replace atan2( → Math.atan2(  (before sin/cos to avoid partial match)
Step 3: replace sin( → Math.sin(     → "Math.sin(x**2) + pi*e"
Step 4: replace pi (word boundary) → 3.14159...  → "Math.sin(x**2) + 3.14159...*e"
Step 5: replace e (word boundary) → 2.71828...  → "Math.sin(x**2) + 3.14159...*2.71828..."
```

### Implicit Equation: Adaptive Marching Squares

1. **Coarse grid** (~300x225): evaluate f(x,y) = lhs - rhs at each vertex
2. **Find crossings**: for each cell, compute case code from corner signs
3. **Frequency bailout**: count edge sign changes; skip cells with 3+ (too oscillatory)
4. **Budget cap**: if crossing cells * 64 > 500k, reduce subdivision factor
5. **Fine grid** (8x8 per cell): re-evaluate, run marching squares, draw segments

### Marching Squares Case Table (fixed)

| Case | Corners | Segments |
|---|---|---|
| 1/14 | TL | top → left |
| 2/13 | TR | top → right |
| 3/12 | TL+TR or BL+BR | left → right |
| 4/11 | BL | bottom → left |
| 7/8 | TL+TR+BL or BR | bottom → right |
| **5** | **TL+BL** (left col +) | **top → bottom** (fixed: was incorrectly drawing 2 segments) |
| 6 | TR+BL (saddle) | disambiguated with center value |
| 9 | TL+BR (saddle) | disambiguated with center value |
| **10** | **TR+BR** (right col +) | **top → bottom** (fixed: was incorrectly drawing 2 segments) |

---

## 8. Pan & Zoom Mechanics

### Viewport Model

```
xViewRef = { xMin: -10, xMax: 10 }
yCenterRef = 0
yRangeRef = (height/width) * xRange
```

### Pan
```
dx pixels right → xPan = -(dx/width) * xRange → xMin, xMax decrease
dy pixels down  → yPan = (dy/height) * yRange → yCenter increases
```

### Zoom (cursor-anchored)
```
zoomFactor = deltaY > 0 ? 1.1 : 0.9
centerX = xMin + mouseXRatio * xRange   // stays fixed
centerY = yMin + (1-mouseYRatio) * yRange
xMin' = centerX - mouseXRatio * newXRange
xMax' = centerX + (1-mouseXRatio) * newXRange
```

---

## 9. Key Design Decisions

| Decision | Rationale |
|---|---|
| **State in App.tsx** | App is small — no need for Redux/Zustand |
| **Canvas 2D** | Best balance of simplicity and performance for 2D plotting |
| **Refs for pan/zoom** | Avoids 60fps React re-renders during drag |
| **Pure rendering functions** | `lib/graph.ts` has zero React dependencies |
| **Two-pass adaptive marching squares** | Concentrates resolution near curves, skips empty regions |
| **Frequency bailout** | Prevents hangs on rapidly oscillating equations |
| **Budget cap (500k fine cells)** | Guarantees responsive UI regardless of equation complexity |
| **localStorage persistence** | Equations survive page refresh with zero backend |
| **Word-boundary regex for e/pi** | Prevents corrupting `atan2`, `Math.cos`, `exp`, etc. |
| **Validation on add/edit** | Catches errors early, shows clear feedback |
