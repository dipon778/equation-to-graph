import type { EquationItem } from '../types';

export function validateEquation(equation: string): string | null {
  const normalizedEq = equation.replace(/\s/g, '').toLowerCase();
  if (!normalizedEq) return 'Empty equation';

  // Parametric: x=...,y=...
  if (normalizedEq.includes(',') && normalizedEq.includes('t')) {
    const parts = normalizedEq.split(',');
    const xPart = parts.find(p => p.startsWith('x='));
    const yPart = parts.find(p => p.startsWith('y='));
    if (!xPart || !yPart) return 'Parametric format: x=f(t),y=g(t)';
    try {
      const xFn = buildMathFunction(sanitizeForMath(xPart.slice(2)), 't');
      const yFn = buildMathFunction(sanitizeForMath(yPart.slice(2)), 't');
      if (!xFn || !yFn) return 'Invalid parametric expression';
      xFn(0); yFn(0);
    } catch { return 'Invalid parametric expression'; }
    return null;
  }

  // Polar: r=f(t)
  if (normalizedEq.startsWith('r=') && normalizedEq.includes('t') && !normalizedEq.includes('x') && !normalizedEq.includes('y')) {
    try {
      const rFn = buildMathFunction(sanitizeForMath(normalizedEq.slice(2)), 't');
      if (!rFn) return 'Invalid polar expression';
      rFn(0);
    } catch { return 'Invalid polar expression'; }
    return null;
  }

  // y = f(x)
  if (normalizedEq.startsWith('y=') && !normalizedEq.slice(2).includes('y')) {
    try {
      const fn = buildMathFunction(sanitizeForMath(normalizedEq.slice(2)), 'x');
      if (!fn) return 'Invalid expression';
      fn(0);
    } catch { return 'Invalid expression'; }
    return null;
  }

  // Inequality: lhs > rhs, lhs < rhs, lhs >= rhs, lhs <= rhs
  for (const op of ['>=', '<=', '>', '<']) {
    if (normalizedEq.includes(op)) {
      const parts = normalizedEq.split(op);
      if (parts.length === 2) {
        const lhs = sanitizeForMath(parts[0]);
        const rhs = sanitizeForMath(parts[1]);
        try {
          const fn = new Function('x', 'y', `"use strict"; return (${lhs}) - (${rhs});`);
          fn(0, 0);
        } catch { return 'Invalid inequality expression'; }
        return null;
      }
    }
  }

  // Implicit: contains '='
  if (normalizedEq.includes('=')) {
    const sides = normalizedEq.split('=');
    if (sides.length !== 2) return 'Too many = signs';
    const lhs = sanitizeForMath(sides[0]);
    const rhs = sanitizeForMath(sides[1]);
    try {
      const fn = new Function('x', 'y', `"use strict"; return (${lhs}) - (${rhs});`);
      fn(0, 0);
    } catch { return 'Invalid implicit expression'; }
    return null;
  }

  // Constant
  try {
    const fn = buildMathFunction(sanitizeForMath(normalizedEq), 'x');
    if (!fn) return 'Invalid expression';
    fn(0);
  } catch { return 'Invalid expression'; }
  return null;
}

export function renderGraph(
  canvas: HTMLCanvasElement,
  equations: EquationItem[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  ctx.fillStyle = '#F8F9FA';
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, width, height, xMin, xMax, yMin, yMax);
  drawAxes(ctx, width, height, xMin, xMax, yMin, yMax);

  equations.forEach(({ formula, color }) => {
    plotEquation(ctx, formula, color, width, height, xMin, xMax, yMin, yMax);
  });
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const step = calculateStep(xRange);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1;

  const xStart = Math.floor(xMin / step) * step;
  for (let x = xStart; x <= xMax; x += step) {
    if (Math.abs(x) < step / 1000) continue;
    const canvasX = ((x - xMin) / xRange) * width;
    ctx.beginPath();
    ctx.moveTo(canvasX, 0);
    ctx.lineTo(canvasX, height);
    ctx.stroke();
  }

  const yStep = calculateStep(yRange);
  const yStart = Math.floor(yMin / yStep) * yStep;
  for (let y = yStart; y <= yMax; y += yStep) {
    if (Math.abs(y) < yStep / 1000) continue;
    const canvasY = height - ((y - yMin) / yRange) * height;
    ctx.beginPath();
    ctx.moveTo(0, canvasY);
    ctx.lineTo(width, canvasY);
    ctx.stroke();
  }
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  const originX = ((0 - xMin) / xRange) * width;
  const originY = height - ((0 - yMin) / yRange) * height;

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1.5;

  if (originY >= 0 && originY <= height) {
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();
  }

  if (originX >= 0 && originX <= width) {
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();
  }

  const step = calculateStep(xRange);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.font = '10px "Courier New", monospace';

  if (originY >= 0 && originY <= height) {
    const xStart = Math.floor(xMin / step) * step;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = xStart; x <= xMax; x += step) {
      if (Math.abs(x) < step / 1000) continue;
      const canvasX = ((x - xMin) / xRange) * width;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvasX, originY - 4);
      ctx.lineTo(canvasX, originY + 4);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillText(formatNumber(x), canvasX, originY + 6);
    }
  }

  if (originX >= 0 && originX <= width) {
    const yStep = calculateStep(yRange);
    const yStart = Math.floor(yMin / yStep) * yStep;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = yStart; y <= yMax; y += yStep) {
      if (Math.abs(y) < yStep / 1000) continue;
      const canvasY = height - ((y - yMin) / yRange) * height;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(originX - 4, canvasY);
      ctx.lineTo(originX + 4, canvasY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillText(formatNumber(y), originX - 8, canvasY);
    }
  }
}

// ─── Equation Plotting ──────────────────────────────────────────────

function plotEquation(
  ctx: CanvasRenderingContext2D,
  equation: string,
  color: string,
  width: number,
  height: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const normalizedEq = equation.replace(/\s/g, '').toLowerCase();

  // Parametric: "x=cos(t),y=sin(t)" or "x=t^2,y=sin(t)"
  if (normalizedEq.includes(',') && normalizedEq.includes('t')) {
    const parts = normalizedEq.split(',');
    const xPart = parts.find(p => p.startsWith('x='));
    const yPart = parts.find(p => p.startsWith('y='));
    if (xPart && yPart) {
      const xExpr = sanitizeForMath(xPart.slice(2));
      const yExpr = sanitizeForMath(yPart.slice(2));
      plotParametric(ctx, xExpr, yExpr, color, width, height, xMin, xMax, yMin, yMax);
      return;
    }
  }

  // Polar: "r=1+cos(t)" or "r=cos(3*t)"
  if (normalizedEq.startsWith('r=') && normalizedEq.includes('t') && !normalizedEq.includes('x') && !normalizedEq.includes('y')) {
    const rExpr = sanitizeForMath(normalizedEq.slice(2));
    plotPolar(ctx, rExpr, color, width, height, xMin, xMax, yMin, yMax);
    return;
  }

  // Inequality: contains >=, <=, >, <
  for (const op of ['>=', '<=', '>', '<']) {
    const parts = normalizedEq.split(op);
    if (parts.length === 2) {
      const lhs = sanitizeForMath(parts[0]);
      const rhs = sanitizeForMath(parts[1]);
      plotInequality(ctx, lhs, rhs, op, color, width, height, xMin, xMax, yMin, yMax);
      return;
    }
  }

  // Case 1: Simple y = f(x) — no y on RHS, just plot directly
  if (normalizedEq.startsWith('y=') && !normalizedEq.slice(2).includes('y')) {
    plotStandard(ctx, normalizedEq.slice(2), color, width, height, xMin, xMax, yMin, yMax);
    return;
  }

  // Case 2: Contains 'y' somewhere (implicit) — use universal solver
  const sides = normalizedEq.split('=');
  if (sides.length === 2 && normalizedEq.includes('y')) {
    const lhs = sanitizeForMath(sides[0]);
    const rhs = sanitizeForMath(sides[1]);

    try {
      const solved = solveQuadraticForY(lhs, rhs);
      if (solved) {
        for (const yExpr of solved) {
          drawEquation(ctx, yExpr, color, width, height, xMin, xMax, yMin, yMax);
        }
        return;
      }
    } catch {
      // fall through to pixel scan
    }

    // Fallback: evaluate f(x,y) = 0 by scanning pixels
    plotImplicitScan(ctx, lhs, rhs, color, width, height, xMin, xMax, yMin, yMax);
    return;
  }

  // Case 3: No 'y' at all — treat as y = constant
  if (!normalizedEq.includes('y')) {
    plotStandard(ctx, normalizedEq, color, width, height, xMin, xMax, yMin, yMax);
    return;
  }

  // Final fallback
  plotImplicitScan(ctx, sides[0] || '', sides[1] || '0', color, width, height, xMin, xMax, yMin, yMax);
}

// ─── Algebraic Solver for y ─────────────────────────────────────────

/** Check if an expression is a simple polynomial (no function calls, no grouping parens) */
function isSimplePolynomialExpr(expr: string): boolean {
  if (/Math\.\w+\(/.test(expr)) return false;
  if (expr.includes('(') || expr.includes(')')) return false;
  return true;
}

interface Term {
  coeff: number;
  xPow: number;
  yPow: number;
}

/** Parse an expression like "x**2+y**2-9" into individual terms */
function parseExpressionToTerms(expr: string): Term[] {
  const terms: Term[] = [];
  let normalized = expr.replace(/\s/g, '');
  // Convert subtraction to addition of negatives
  normalized = normalized.replace(/-/g, '+-');
  if (normalized.startsWith('+-')) normalized = '-' + normalized.slice(2);

  const parts = normalized.split('+');

  for (let part of parts) {
    if (!part) continue;

    // Strip outer parentheses (e.g., from pi/e constant replacements)
    if (part.startsWith('(') && part.endsWith(')')) {
      part = part.slice(1, -1);
    }

    let coeff = 1;
    let rest = part;

    // Match optional leading number with asterisk: "3*x"
    const numMatch = rest.match(/^(-?\d*\.?\d+)\*/);
    if (numMatch) {
      coeff = parseFloat(numMatch[1]);
      rest = rest.slice(numMatch[0].length);
    } else if (rest.startsWith('-')) {
      coeff = -1;
      rest = rest.slice(1);
    } else if (rest.startsWith('+')) {
      rest = rest.slice(1);
    }

    // Pure constant (no x or y)
    if (!rest.includes('x') && !rest.includes('y')) {
      const n = parseFloat(rest);
      if (!isNaN(n)) {
        terms.push({ coeff: coeff * n, xPow: 0, yPow: 0 });
        continue;
      }
    }

    // Parse x and y powers
    let xPow = 0, yPow = 0;

    if (rest.includes('x')) {
      const xMatch = rest.match(/x(?:\*\*(\d+))?/);
      xPow = xMatch && xMatch[1] ? parseInt(xMatch[1]) : 1;
    }
    if (rest.includes('y')) {
      const yMatch = rest.match(/y(?:\*\*(\d+))?/);
      yPow = yMatch && yMatch[1] ? parseInt(yMatch[1]) : 1;
    }

    // If neither x nor y found and no constant extraction, try as bare number
    if (xPow === 0 && yPow === 0) {
      const n = parseFloat(rest);
      if (!isNaN(n)) {
        terms.push({ coeff: coeff * n, xPow: 0, yPow: 0 });
        continue;
      }
    }

    terms.push({ coeff, xPow, yPow });
  }

  return terms;
}

/** Given lhs and rhs of lhs = rhs, try to solve for y using quadratic formula */
function solveQuadraticForY(lhs: string, rhs: string): string[] | null {
  try {
    // Bail if expression has function calls (sin, cos, sqrt, etc.) or
    // grouping parentheses (e.g. (x**2+y**2-1)**3) — the polynomial
    // term parser can't handle these; fall through to implicit scan.
    if (!isSimplePolynomialExpr(lhs) || !isSimplePolynomialExpr(rhs)) return null;

    const lhsTerms = parseExpressionToTerms(lhs);
    const rhsTerms = parseExpressionToTerms(rhs);

    // Combine: lhs - rhs = 0 → negate all rhs terms
    const allTerms = [
      ...lhsTerms,
      ...rhsTerms.map(t => ({ ...t, coeff: -t.coeff })),
    ];

    let y2Coeff = 0, yCoeff = 0;
    let x2Coeff = 0, xCoeff = 0;
    let xyCoeff = 0, constTerm = 0;

    for (const t of allTerms) {
      if (t.xPow === 2 && t.yPow === 0) x2Coeff += t.coeff;
      else if (t.xPow === 1 && t.yPow === 0) xCoeff += t.coeff;
      else if (t.xPow === 0 && t.yPow === 2) y2Coeff += t.coeff;
      else if (t.xPow === 0 && t.yPow === 1) yCoeff += t.coeff;
      else if (t.xPow === 1 && t.yPow === 1) xyCoeff += t.coeff;
      else if (t.xPow === 0 && t.yPow === 0) constTerm += t.coeff;
    }

    if (y2Coeff === 0 && yCoeff === 0) return null;
    if (xyCoeff !== 0) return null;

    if (y2Coeff !== 0) {
      // a*y^2 + b*y + c(x) = 0
      const a = y2Coeff;
      const b = yCoeff;
      const cExpr = `${x2Coeff}*x**2 + ${xCoeff}*x + ${constTerm}`;

      // discriminant = b^2 - 4*a*c
      const discriminant = `${b * b} - 4*${a}*(${cExpr})`;
      const denom = 2 * a;
      return [
        `(-${b} + sqrt(${discriminant})) / ${denom}`,
        `(-${b} - sqrt(${discriminant})) / ${denom}`,
      ];
    } else {
      // Linear in y: b*y + c(x) = 0 → y = -c(x)/b
      const b = yCoeff;
      const cExpr = `${x2Coeff}*x**2 + ${xCoeff}*x + ${constTerm}`;
      return [`-(${cExpr}) / ${b}`];
    }
  } catch {
    return null;
  }
}

// ─── Draw an Equation from String Expression ────────────────────────

function drawEquation(
  ctx: CanvasRenderingContext2D,
  yExpr: string,
  color: string,
  width: number,
  height: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  // Evaluate the y expression string for each x
  const fn = buildMathFunction(yExpr, 'x');
  if (!fn) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();

  const steps = Math.min(width * 2, 2000);
  let firstPoint = true;

  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * xRange;
    let y;
    try { y = fn(x); } catch { firstPoint = true; continue; }
    if (!isFinite(y)) { firstPoint = true; continue; }

    const canvasX = (i / steps) * width;
    const canvasY = height - ((y - yMin) / yRange) * height;
    if (firstPoint) { ctx.moveTo(canvasX, canvasY); firstPoint = false; }
    else { ctx.lineTo(canvasX, canvasY); }
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ─── Implicit Curve via Marching Squares ────────────────────────────

function plotImplicitScan(
  ctx: CanvasRenderingContext2D,
  lhs: string,
  rhs: string,
  color: string,
  width: number,
  height: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  try {
    const fnBody = `"use strict"; return (${lhs}) - (${rhs});`;
    const fn = new Function('x', 'y', fnBody);

    // Coarse grid — fast scan to find where curves exist
    const coarseW = Math.min(Math.ceil(width / 3), 300);
    const coarseH = Math.min(Math.ceil(height / 3), 225);
    const coarseCellW = xRange / coarseW;
    const coarseCellH = yRange / coarseH;

    const coarseVals: Float64Array = new Float64Array((coarseW + 1) * (coarseH + 1));
    for (let gy = 0; gy <= coarseH; gy++) {
      const y = yMax - gy * coarseCellH;
      for (let gx = 0; gx <= coarseW; gx++) {
        const x = xMin + gx * coarseCellW;
        try {
          const v = fn(x, y);
          coarseVals[gy * (coarseW + 1) + gx] = isFinite(v) ? v : NaN;
        } catch {
          coarseVals[gy * (coarseW + 1) + gx] = NaN;
        }
      }
    }

    // Find cells with sign changes (curve passes through)
    const refineCells: { gx: number; gy: number }[] = [];
    let totalEdgeChanges = 0;
    for (let gy = 0; gy < coarseH; gy++) {
      for (let gx = 0; gx < coarseW; gx++) {
        const v00 = coarseVals[gy * (coarseW + 1) + gx];
        const v10 = coarseVals[gy * (coarseW + 1) + gx + 1];
        const v01 = coarseVals[(gy + 1) * (coarseW + 1) + gx];
        const v11 = coarseVals[(gy + 1) * (coarseW + 1) + gx + 1];
        if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) continue;
        const c = (v00 >= 0 ? 1 : 0) | (v10 >= 0 ? 2 : 0)
                | (v01 >= 0 ? 4 : 0) | (v11 >= 0 ? 8 : 0);
        if (c !== 0 && c !== 15) {
          // Count edge sign changes — skip cells where function oscillates
          // faster than we can meaningfully render (sign changes on all 4 edges)
          const edgeChanges = ((v00 >= 0) !== (v10 >= 0) ? 1 : 0)
                            + ((v00 >= 0) !== (v01 >= 0) ? 1 : 0)
                            + ((v10 >= 0) !== (v11 >= 0) ? 1 : 0)
                            + ((v01 >= 0) !== (v11 >= 0) ? 1 : 0);
          totalEdgeChanges += edgeChanges;
          // If sign changes on 3 or 4 edges, the function oscillates too fast
          // within this coarse cell — draw it at coarse resolution only
          if (edgeChanges < 3) {
            refineCells.push({ gx, gy });
          }
        }
      }
    }

    // Dynamic subdivision: cap total fine cells at 500k to prevent hangs
    const MAX_FINE_CELLS = 500000;
    const baseSub = 8;
    let subW = baseSub;
    let subH = baseSub;
    if (refineCells.length * baseSub * baseSub > MAX_FINE_CELLS) {
      const ratio = Math.sqrt(MAX_FINE_CELLS / refineCells.length);
      subW = Math.max(2, Math.floor(ratio));
      subH = Math.max(2, Math.floor(ratio));
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();

    function lerp(v0: number, v1: number): number {
      const d = v0 - v1;
      if (d === 0) return 0.5;
      return v0 / d;
    }

    for (const { gx: cgx, gy: cgy } of refineCells) {
      // Cell bounds in math coords
      const cellXMin = xMin + cgx * coarseCellW;
      const cellYMax = yMax - cgy * coarseCellH;
      const cellXMax = cellXMin + coarseCellW;
      const cellYMin = cellYMax - coarseCellH;

      // Evaluate fine grid inside this cell
      const fineW = subW;
      const fineH = subH;
      const fineCellW = coarseCellW / fineW;
      const fineCellH = coarseCellH / fineH;
      const fineVals: Float64Array = new Float64Array((fineW + 1) * (fineH + 1));

      for (let fy = 0; fy <= fineH; fy++) {
        const y = cellYMax - fy * fineCellH;
        for (let fx = 0; fx <= fineW; fx++) {
          const x = cellXMin + fx * fineCellW;
          try {
            const v = fn(x, y);
            fineVals[fy * (fineW + 1) + fx] = isFinite(v) ? v : NaN;
          } catch {
            fineVals[fy * (fineW + 1) + fx] = NaN;
          }
        }
      }

      // Marching squares on the fine sub-grid
      for (let fy = 0; fy < fineH; fy++) {
        for (let fx = 0; fx < fineW; fx++) {
          const i00 = fy * (fineW + 1) + fx;
          const i10 = fy * (fineW + 1) + fx + 1;
          const i01 = (fy + 1) * (fineW + 1) + fx;
          const i11 = (fy + 1) * (fineW + 1) + fx + 1;

          const v00 = fineVals[i00], v10 = fineVals[i10];
          const v01 = fineVals[i01], v11 = fineVals[i11];
          if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) continue;

          const c = (v00 >= 0 ? 1 : 0) | (v10 >= 0 ? 2 : 0)
                  | (v01 >= 0 ? 4 : 0) | (v11 >= 0 ? 8 : 0);
          if (c === 0 || c === 15) continue;

          // Edge crossing points in math coords
          const topX = cellXMin + (fx + lerp(v00, v10)) * fineCellW;
          const botX = cellXMin + (fx + lerp(v01, v11)) * fineCellW;
          const leftY = cellYMax - (fy + lerp(v00, v01)) * fineCellH;
          const rightY = cellYMax - (fy + lerp(v10, v11)) * fineCellH;

          // Convert to canvas coords
          const tx = ((topX - xMin) / xRange) * width;
          const bx = ((botX - xMin) / xRange) * width;
          const ly = height - ((leftY - yMin) / yRange) * height;
          const ry = height - ((rightY - yMin) / yRange) * height;
          const ty = height - ((cellYMax - fy * fineCellH - yMin) / yRange) * height;
          const bby = height - ((cellYMax - (fy + 1) * fineCellH - yMin) / yRange) * height;
          const lx = ((cellXMin + fx * fineCellW - xMin) / xRange) * width;
          const rx = ((cellXMin + (fx + 1) * fineCellW - xMin) / xRange) * width;

          switch (c) {
            case 1: case 14:
              ctx.moveTo(tx, ty); ctx.lineTo(lx, ly); break;
            case 2: case 13:
              ctx.moveTo(tx, ty); ctx.lineTo(rx, ry); break;
            case 3: case 12:
              ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); break;
            case 4: case 11:
              ctx.moveTo(bx, bby); ctx.lineTo(lx, ly); break;
            case 7: case 8:
              ctx.moveTo(bx, bby); ctx.lineTo(rx, ry); break;
            case 5:
              ctx.moveTo(tx, ty); ctx.lineTo(bx, bby); break;
            case 6: {
              const center = (v00 + v10 + v01 + v11) / 4;
              if (center >= 0) {
                ctx.moveTo(tx, ty); ctx.lineTo(rx, ry);
                ctx.moveTo(bx, bby); ctx.lineTo(lx, ly);
              } else {
                ctx.moveTo(tx, ty); ctx.lineTo(lx, ly);
                ctx.moveTo(bx, bby); ctx.lineTo(rx, ry);
              }
              break;
            }
            case 9: {
              const center = (v00 + v10 + v01 + v11) / 4;
              if (center >= 0) {
                ctx.moveTo(tx, ty); ctx.lineTo(lx, ly);
                ctx.moveTo(bx, bby); ctx.lineTo(rx, ry);
              } else {
                ctx.moveTo(tx, ty); ctx.lineTo(rx, ry);
                ctx.moveTo(bx, bby); ctx.lineTo(lx, ly);
              }
              break;
            }
            case 10:
              ctx.moveTo(tx, ty); ctx.lineTo(bx, bby); break;
          }
        }
      }
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  } catch {
    // silent fallback
  }
}

// ─── Standard y = f(x) Plot ─────────────────────────────────────────

function plotStandard(
  ctx: CanvasRenderingContext2D,
  expr: string,
  color: string,
  width: number,
  height: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  const fn = buildMathFunction(expr, 'x');
  if (!fn) return;

  const steps = Math.min(width * 2, 2000);
  let firstPoint = true;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();

  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * xRange;
    let y;
    try { y = fn(x); } catch { firstPoint = true; continue; }
    if (!isFinite(y)) { firstPoint = true; continue; }
    const canvasX = (i / steps) * width;
    const canvasY = height - ((y - yMin) / yRange) * height;
    if (firstPoint) { ctx.moveTo(canvasX, canvasY); firstPoint = false; }
    else { ctx.lineTo(canvasX, canvasY); }
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ─── Parametric Plot (x(t), y(t)) ──────────────────────────────────

function plotParametric(
  ctx: CanvasRenderingContext2D,
  xExpr: string,
  yExpr: string,
  color: string,
  width: number,
  height: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  const xFn = buildMathFunction(xExpr, 't');
  const yFn = buildMathFunction(yExpr, 't');
  if (!xFn || !yFn) return;

  const tMin = -2 * Math.PI;
  const tMax = 2 * Math.PI;
  const steps = 2000;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();

  let firstPoint = true;

  for (let i = 0; i <= steps; i++) {
    const t = tMin + (i / steps) * (tMax - tMin);
    let x, y;
    try { x = xFn(t); y = yFn(t); } catch { firstPoint = true; continue; }
    if (!isFinite(x) || !isFinite(y)) { firstPoint = true; continue; }

    const canvasX = ((x - xMin) / xRange) * width;
    const canvasY = height - ((y - yMin) / yRange) * height;
    if (firstPoint) { ctx.moveTo(canvasX, canvasY); firstPoint = false; }
    else { ctx.lineTo(canvasX, canvasY); }
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ─── Polar Plot (r = f(θ)) ─────────────────────────────────────────

function plotPolar(
  ctx: CanvasRenderingContext2D,
  rExpr: string,
  color: string,
  width: number,
  height: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  const rFn = buildMathFunction(rExpr, 't');
  if (!rFn) return;

  const tMin = 0;
  const tMax = 2 * Math.PI;
  const steps = 2000;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();

  let firstPoint = true;

  for (let i = 0; i <= steps; i++) {
    const t = tMin + (i / steps) * (tMax - tMin);
    let r;
    try { r = rFn(t); } catch { firstPoint = true; continue; }
    if (!isFinite(r)) { firstPoint = true; continue; }

    const x = r * Math.cos(t);
    const y = r * Math.sin(t);

    const canvasX = ((x - xMin) / xRange) * width;
    const canvasY = height - ((y - yMin) / yRange) * height;
    if (firstPoint) { ctx.moveTo(canvasX, canvasY); firstPoint = false; }
    else { ctx.lineTo(canvasX, canvasY); }
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ─── Inequality Fill (lhs > rhs or lhs < rhs) ─────────────────────

function plotInequality(
  ctx: CanvasRenderingContext2D,
  lhs: string,
  rhs: string,
  operator: string,
  color: string,
  width: number,
  height: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): void {
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  try {
    const fnBody = `"use strict"; return (${lhs}) - (${rhs});`;
    const fn = new Function('x', 'y', fnBody);

    const gridW = Math.min(Math.ceil(width / 2), 400);
    const gridH = Math.min(Math.ceil(height / 2), 300);
    const cellW = xRange / gridW;
    const cellH = yRange / gridH;

    const isGreater = operator === '>' || operator === '>=';

    ctx.fillStyle = color + '25'; // 15% opacity fill
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // Fill cells where inequality is true
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const x = xMin + (gx + 0.5) * cellW;
        const y = yMax - (gy + 0.5) * cellH;
        try {
          const v = fn(x, y);
          if (!isFinite(v)) continue;
          const satisfies = isGreater ? v >= 0 : v <= 0;
          if (satisfies) {
            const cx = (gx / gridW) * width;
            const cy = (gy / gridH) * height;
            ctx.fillRect(cx, cy, width / gridW + 1, height / gridH + 1);
          }
        } catch { continue; }
      }
    }

    // Draw boundary line using implicit scan
    plotImplicitScan(ctx, lhs, rhs, color, width, height, xMin, xMax, yMin, yMax);
  } catch {
    // silent fallback
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function sanitizeForMath(s: string): string {
  return s
    .replace(/\^/g, '**')
    .replace(/atan2\(/g, 'Math.atan2(')
    .replace(/asin\(/g, 'Math.asin(')
    .replace(/acos\(/g, 'Math.acos(')
    .replace(/atan\(/g, 'Math.atan(')
    .replace(/sinh\(/g, 'Math.sinh(')
    .replace(/cosh\(/g, 'Math.cosh(')
    .replace(/tanh\(/g, 'Math.tanh(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/cbrt\(/g, 'Math.cbrt(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/ceil\(/g, 'Math.ceil(')
    .replace(/floor\(/g, 'Math.floor(')
    .replace(/round\(/g, 'Math.round(')
    .replace(/exp\(/g, 'Math.exp(')
    .replace(/log10\(/g, 'Math.log10(')
    .replace(/log2\(/g, 'Math.log2(')
    .replace(/log\(/g, 'Math.log(')
    .replace(/\bpi\b/g, `${Math.PI}`)
    .replace(/\be\b/g, `${Math.E}`);
}

function buildMathFunction(expr: string, variable: string): ((v: number) => number) | null {
  try {
    const sanitized = sanitizeForMath(expr);
    const fn = new Function(variable, `"use strict"; return (${sanitized});`);
    return fn as (v: number) => number;
  } catch {
    return null;
  }
}

function calculateStep(range: number): number {
  if (range === 0) return 1;
  const roughStep = range / 8;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  if (normalized < 1.5) return magnitude;
  if (normalized < 3.5) return 2 * magnitude;
  if (normalized < 7.5) return 5 * magnitude;
  return 10 * magnitude;
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000) return n.toExponential(0);
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(4)).toString();
}