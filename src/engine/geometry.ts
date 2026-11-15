/**
 * Piece geometry: how the picture is cut.
 *
 * The board is `cols × rows` cells of size `cw × ch` in board units. Every
 * interior edge is generated once and shared by the two pieces on either side,
 * so neighbours always fit exactly. A piece outline is returned as a compact,
 * serialisable list of path commands so it can be sent to a worker, drawn on
 * any 2D context, and tested without a browser.
 */
import { mulberry32, type Rng } from './rng';

export type Pt = [number, number];
export type PieceStyle = 'classic' | 'organic' | 'square';

/** Path commands: 0 = moveTo(x,y), 1 = lineTo(x,y), 2 = bezierCurveTo(6 numbers), 3 = close. */
export type PathCmds = number[];

export interface Cut {
  cols: number;
  rows: number;
  cw: number;
  ch: number;
  /** The smaller cell side; tab sizes scale with this. */
  s: number;
  style: PieceStyle;
  /** h[r][c]: the edge on top of row r (1..rows-1), running left to right. 10 points. */
  h: Pt[][][];
  /** v[r][c]: the edge on the left of column c (1..cols-1), running top to bottom. 10 points. */
  v: Pt[][][];
}

/** How far outside its cell a piece can reach, as a fraction of `s`. */
export const TAB_REACH = 0.34;

/**
 * One edge in normalised coordinates: u runs 0→1 along the edge, v is the
 * perpendicular bulge. Three cubic curves give a neck and a round knob.
 */
function edgeShape(rnd: Rng, style: PieceStyle): { pts: Pt[]; sign: number } {
  const sign = rnd() < 0.5 ? 1 : -1;
  if (style === 'square') {
    return { sign, pts: [[0, 0], [1 / 3, 0], [2 / 3, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]] };
  }
  const k = style === 'organic' ? 1.9 : 1;
  const J = (m: number) => (rnd() * 2 - 1) * m * k;
  const t = (style === 'organic' ? 0.095 : 0.088) + rnd() * 0.022; // knob size
  const a = J(0.035), b = J(0.045), c = J(0.022), d = J(0.025), e = J(0.035);
  const w = style === 'organic' ? 2.25 : 2; // knob width relative to neck
  return {
    sign,
    pts: [
      [0, 0],
      [0.22, a],
      [0.5 + b + d, -t + c],
      [0.5 - t + b, t + c],
      [0.5 - w * t + b - d, 3 * t + c],
      [0.5 + w * t + b - d, 3 * t + c],
      [0.5 + t + b, t + c],
      [0.5 + b + d, -t + c],
      [0.78, e],
      [1, 0],
    ],
  };
}

export function cutPuzzle(cols: number, rows: number, cw: number, ch: number, seed: number, style: PieceStyle = 'classic'): Cut {
  const rnd = mulberry32(seed);
  const s = Math.min(cw, ch);
  const h: Pt[][][] = [];
  const v: Pt[][][] = [];
  for (let r = 1; r < rows; r++) {
    h[r] = [];
    for (let c = 0; c < cols; c++) {
      const e = edgeShape(rnd, style);
      h[r][c] = e.pts.map(([u, w]) => [c * cw + u * cw, r * ch + w * s * e.sign] as Pt);
    }
  }
  for (let r = 0; r < rows; r++) {
    v[r] = [];
    for (let c = 1; c < cols; c++) {
      const e = edgeShape(rnd, style);
      v[r][c] = e.pts.map(([u, w]) => [c * cw + w * s * e.sign, r * ch + u * ch] as Pt);
    }
  }
  return { cols, rows, cw, ch, s, style, h, v };
}

function pushEdge(out: PathCmds, pts: Pt[], reverse: boolean, ox: number, oy: number) {
  const P = reverse ? pts.slice().reverse() : pts;
  for (let i = 1; i < 10; i += 3) {
    out.push(2, P[i][0] - ox, P[i][1] - oy, P[i + 1][0] - ox, P[i + 1][1] - oy, P[i + 2][0] - ox, P[i + 2][1] - oy);
  }
}

/** Outline of piece (c, r) in coordinates local to its cell's top-left corner. */
export function piecePath(cut: Cut, c: number, r: number): PathCmds {
  const { cols, rows, cw, ch } = cut;
  const ox = c * cw, oy = r * ch;
  const out: PathCmds = [0, 0, 0];
  if (r === 0) out.push(1, cw, 0); else pushEdge(out, cut.h[r][c], false, ox, oy);
  if (c === cols - 1) out.push(1, cw, ch); else pushEdge(out, cut.v[r][c + 1], false, ox, oy);
  if (r === rows - 1) out.push(1, 0, ch); else pushEdge(out, cut.h[r + 1][c], true, ox, oy);
  if (c !== 0) pushEdge(out, cut.v[r][c], true, ox, oy);
  out.push(3);
  return out;
}

/** Minimal interface shared by CanvasRenderingContext2D, OffscreenCanvas contexts and Path2D. */
export interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(a: number, b: number, c: number, d: number, e: number, f: number): void;
  closePath(): void;
}

export function tracePath(sink: PathSink, cmds: PathCmds) {
  for (let i = 0; i < cmds.length; ) {
    const op = cmds[i++];
    if (op === 0) { sink.moveTo(cmds[i], cmds[i + 1]); i += 2; }
    else if (op === 1) { sink.lineTo(cmds[i], cmds[i + 1]); i += 2; }
    else if (op === 2) { sink.bezierCurveTo(cmds[i], cmds[i + 1], cmds[i + 2], cmds[i + 3], cmds[i + 4], cmds[i + 5]); i += 6; }
    else sink.closePath();
  }
}

/** Sample the outline as a polygon (for point-in-piece tests without a canvas). */
export function flattenPath(cmds: PathCmds, steps = 8): Pt[] {
  const poly: Pt[] = [];
  let x = 0, y = 0;
  for (let i = 0; i < cmds.length; ) {
    const op = cmds[i++];
    if (op === 0 || op === 1) { x = cmds[i]; y = cmds[i + 1]; i += 2; poly.push([x, y]); }
    else if (op === 2) {
      const [x1, y1, x2, y2, x3, y3] = cmds.slice(i, i + 6); i += 6;
      for (let k = 1; k <= steps; k++) {
        const t = k / steps, u = 1 - t;
        poly.push([
          u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
      x = x3; y = y3;
    }
  }
  return poly;
}

export function pointInPolygon(poly: Pt[], px: number, py: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Choose columns × rows close to `target` pieces with near-square cells. */
export function chooseGrid(target: number, aspect: number): { cols: number; rows: number } {
  let best = { cols: 2, rows: 2, score: Infinity };
  for (let cols = 2; cols <= 60; cols++) {
    for (const rows of [Math.floor(cols / aspect) - 1, Math.floor(cols / aspect), Math.ceil(cols / aspect), Math.ceil(cols / aspect) + 1]) {
      if (rows < 2) continue;
      const cell = aspect / cols / (1 / rows);
      const score = Math.abs(cols * rows - target) / target + Math.abs(Math.log(cell)) * 0.6;
      if (score < best.score) best = { cols, rows, score };
    }
  }
  return { cols: best.cols, rows: best.rows };
}

/** Piece counts offered to players. */
export const PIECE_COUNTS = [12, 24, 48, 80, 120, 200, 300, 500, 750, 1000] as const;
