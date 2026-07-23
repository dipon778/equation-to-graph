# Core Logic — Canvas Rendering Engine

This document explains how the mathematical graphing engine works internally — how equations are parsed, evaluated, and drawn onto the HTML5 Canvas. All code lives in `src/lib/graph.ts`.

---

## 1. Architecture Overview

The rendering engine is a set of **pure functions** with zero React dependencies. It takes a canvas element, an array of equations, and viewport bounds, and draws everything in a single pass.

```
renderGraph(canvas, equations, xMin, xMax, yMin, yMax)
  │
  ├── drawGrid()        ← faint grid lines (dark on light background)
  ├── drawAxes()        ← X/Y axes with tick marks
  └── for each equation:
       └── plotEquation()
            ├── Parametric  → x=f(t),y=g(t) → plotParametric()
            ├── Polar       → r=f(t)        → plotPolar()
            ├── Inequality  → lhs > rhs      → plotInequality()
            ├── Explicit    → y = f(x)       → plotStandard()
            ├── Implicit    → f(x,y) = g(x,y) → solveQuadraticForY() or plotImplicitScan()
            └── Fallback    → plotImplicitScan()
```

---

## 2. Coordinate System

Canvas uses top-left origin, Y increases downward. Math uses center origin, Y increases upward.

```
canvasX = ((mathX - xMin) / xRange) * width
canvasY = height - ((mathY - yMin) / yRange) * height
```

---

## 3. Equation Parsing — Six Paths

### Path A: Parametric (`x=cos(t),y=sin(t)`)

Detected when equation contains `,` and `t` with `x=` and `y=` parts.

```
Input:  "x=cos(3*t)-cos(2*t),y=sin(3*t)-sin(2*t)"
Split:  xPart = "cos(3*t)-cos(2*t)", yPart = "sin(3*t)-sin(2*t)"
Sanitize both → build two JS functions with variable 't'
Plot: iterate t from -2π to 2π at 2000 sample points
      evaluate xFn(t), yFn(t) → convert to canvas coords → draw segments
```

### Path B: Polar (`r=1+cos(t)`)

Detected when equation starts with `r=` and has `t` but no `x`/`y`.

```
Input:  "r=1+cos(t)"
Sanitize → "1+Math.cos(t)"
Build function with variable 't'
Plot: iterate t from 0 to 2π at 2000 sample points
      r = fn(t), x = r*cos(t), y = r*sin(t)
      Convert to canvas coords → draw segments
```

### Path C: Inequality (`x^2+y^2<4`)

Detected when equation contains `>=`, `<=`, `>`, or `<`.

```
Input:  "x^2+y^2<4"
Split on "<" → lhs="x^2+y^2", rhs="4"
Sanitize both sides

plotInequality():
  1. Build fn = new Function('x','y', 'return (lhs) - (rhs)')
  2. For each cell in grid (400x300):
     - Evaluate fn at cell center
     - If v >= 0 (for >) or v <= 0 (for <): fill cell with semi-transparent color
  3. Draw boundary line using plotImplicitScan()
```

### Path D: Explicit (`y = f(x)`)

Detected when equation starts with `y=` and RHS has no `y`.

```
Input:  "y = 3*sin(2*x) + cos(x)"
Step 1: Extract RHS → "3*sin(2*x) + cos(x)"
Step 2: Sanitize → "3*Math.sin(2*x) + Math.cos(x)"
Step 3: Build function → new Function('x', 'return ...')
Step 4: Evaluate at ~width*2 sample points → draw connected segments
```

### Path E: Implicit Algebraic (`x^2 + y^2 = 9`)

Detected when equation contains `y` and has `=`.

```
Split on "=" → lhs, rhs
Sanitize both → solveQuadraticForY(lhs, rhs)

If quadratic solver succeeds:
  → Generates two branch expressions (e.g., "sqrt(9 - x**2)" and "-sqrt(9 - x**2)")
  → Each plotted via drawEquation()

If solver fails (complex expressions):
  → Falls through to plotImplicitScan()
```

### Path F: Adaptive Marching Squares (`plotImplicitScan`)

For any implicit equation that can't be algebraically solved.

**Two-pass approach:**

```
Pass 1: Coarse Grid (~300x225)
  ─ Evaluate f(x,y) = lhs - rhs at each vertex
  ─ For each cell, compute case code from 4 corner signs
  ─ Count edge sign changes per cell
  ─ Skip cells with 3+ changes (frequency bailout — oscillation too fast)
  ─ Collect remaining cells for refinement

Pass 2: Fine Grid (8x8 per cell)
  ─ Budget check: if cells * 64 > 500,000 → reduce subdivision
  ─ Re-evaluate f(x,y) on fine grid inside each cell
  ─ Run marching squares on fine grid → draw segments
```

**Frequency Bailout:**

When a cell has sign changes on 3 or 4 edges, the function oscillates faster than the cell can resolve. Subdividing would produce a massive number of tiny segments with no visual benefit. These cells are skipped.

**Budget Cap:**

If the number of crossing cells * 64 (8×8) exceeds 500,000, the subdivision factor scales down:
```
subdivision = floor(sqrt(500000 / crossingCells))
clamped to minimum of 2
```

This guarantees the engine never evaluates more than ~500k fine cells, preventing UI hangs on equations like `sin(x^2+y^2) = cos(x*y)`.

---

## 4. Marching Squares Algorithm

### Cell Classification

Each cell has 4 corners, each either positive (≥0) or negative (<0). The case code is a 4-bit integer:

```
bit 0 (1): top-left     (v00)
bit 1 (2): top-right    (v10)
bit 2 (4): bottom-left  (v01)
bit 3 (8): bottom-right (v11)
```

### Edge Crossing Interpolation

For an edge between v0 and v1 with opposite signs:
```
lerp(v0, v1) = v0 / (v0 - v1)    // fraction along edge where f = 0
```

### Case Table

| Case | Pattern | Segments | Notes |
|---|---|---|---|
| 0, 15 | all same sign | none | no curve in cell |
| 1 | TL only | top → left | |
| 2 | TR only | top → right | |
| 3 | TL+TR | left → right | top row positive |
| 4 | BL only | bottom → left | |
| 5 | TL+BL | top → bottom | left column positive (**fixed**) |
| 6 | TR+BL | saddle: 2 segments | disambiguated with center |
| 7 | TL+TR+BL | bottom → right | |
| 8 | BR only | bottom → right | |
| 9 | TL+BR | saddle: 2 segments | disambiguated with center |
| 10 | TR+BR | top → bottom | right column positive (**fixed**) |
| 11 | TL+TR+BR | bottom → left | |
| 12 | BL+BR | left → right | bottom row positive |
| 13 | TR+BL+BR | top → right | |
| 14 | TL+BL+BR | top → left | |

**Critical fix (cases 5 and 10):** These are NOT saddle cases despite having 4 corners with mixed signs. They have only 2 valid edge crossings (top and bottom). The original code incorrectly drew segments to left/right edges where no sign change existed, creating phantom straight lines through curves like the heart shape.

**Saddle disambiguation (cases 6 and 9):** These have 4 valid edge crossings. The center value (average of 4 corners) determines which pair of segments to draw.

---

## 5. The sanitizeForMath() Pipeline

Transforms user input into valid JavaScript:

```
1. ^ → **              (exponentiation)
2. atan2( → Math.atan2( (longest names first to avoid partial matches)
3. asin( → Math.asin(
4. acos( → Math.acos(
5. atan( → Math.atan(
6. sinh( → Math.sinh(
7. cosh( → Math.cosh(
8. tanh( → Math.tanh(
9. sin( → Math.sin(
10. cos( → Math.cos(
11. tan( → Math.tan(
12. sqrt( → Math.sqrt(
13. cbrt( → Math.cbrt(
14. abs( → Math.abs(
15. ceil( → Math.ceil(
16. floor( → Math.floor(
17. round( → Math.round(
18. exp( → Math.exp(
19. log10( → Math.log10(
20. log2( → Math.log2(
21. log( → Math.log(
22. pi (word boundary) → 3.14159...
23. e (word boundary) → 2.71828...
```

**Why word boundaries matter for step 22-23:**

Without `\b`, the regex `/e/g` would corrupt:
- `atan2` → `atanMath.E2` (broken)
- `Math.cos` → `MatMath.Eh.cos` (broken)
- `exp(` → `Math.Eexp(` (broken)

With `\be\b`, only standalone `e` is replaced — function names and `Math.*` are untouched.

---

## 6. Inequality Region Fill

```
plotInequality(lhs, rhs, operator, color, width, height, xMin, xMax, yMin, yMax)

1. Build fn = new Function('x','y', 'return (lhs) - (rhs)')
2. Grid: 400 x 300 cells
3. For each cell center (x, y):
   - v = fn(x, y)
   - satisfies = isGreater ? (v >= 0) : (v <= 0)
   - if satisfies: ctx.fillRect() with semi-transparent color
4. Draw boundary via plotImplicitScan()
```

---

## 7. High-DPI (Retina) Support

```js
const dpr = window.devicePixelRatio || 1;
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
ctx.scale(dpr, dpr);
```

---

## 8. Validation

`validateEquation()` checks syntax before adding/editing:

1. Try to build a JS function from the expression
2. Call it once with test values to verify it evaluates
3. Return `null` if valid, or error message string if invalid

Error messages: "Empty equation", "Invalid parametric expression", "Invalid polar expression", "Invalid expression", "Invalid implicit expression", "Invalid inequality expression", "Too many = signs", "Parametric format: x=f(t),y=g(t)"

Invalid equations display with a red border and error text on the equation card.

---

## 9. Equation Type Summary

| Type | Syntax | Range | Plotter |
|---|---|---|---|
| Explicit | `y = f(x)` | xMin to xMax | `plotStandard()` |
| Parametric | `x=f(t), y=g(t)` | t: -2π to 2π | `plotParametric()` |
| Polar | `r=f(t)` | t: 0 to 2π | `plotPolar()` |
| Inequality | `lhs > rhs` | viewport | `plotInequality()` |
| Implicit (simple) | `x^2+y^2=9` | viewport | `solveQuadraticForY()` |
| Implicit (complex) | `sin(x^2+y^2)=cos(x*y)` | viewport | `plotImplicitScan()` |
