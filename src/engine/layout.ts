/** Table size and arrangements of loose pieces around the board. */
import type { Group, Puzzle } from './puzzle';
import { shuffle, type Rng } from './rng';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Slot { cx: number; cy: number; d: number }

/** Spacing between loose pieces, centre to centre. */
function pitch(p: Puzzle) {
  const big = p.spec.rotation ? Math.max(p.cw, p.ch) : 0;
  return {
    sx: (big || p.cw) + 0.5 * p.s,
    sy: (big || p.ch) + 0.5 * p.s,
  };
}

/**
 * A table around the board with room for every piece that is not in the tray,
 * shaped like the screen so it fills it.
 */
export function tableFor(p: Puzzle, viewAspect: number, piecesOnTable = p.N): Rect {
  const { sx, sy } = pitch(p);
  const board = p.BW * p.BH;
  const area = board * 1.25 + piecesOnTable * sx * sy * 1.45;
  let h = Math.sqrt(area / viewAspect), w = h * viewAspect;
  const minW = p.BW + 1.6 * p.s, minH = p.BH + 1.6 * p.s;
  if (w < minW) { w = minW; h = Math.max(minH, area / w); }
  if (h < minH) { h = minH; w = Math.max(minW, area / h); }
  return { x: -(w - p.BW) / 2, y: -(h - p.BH) / 2, w, h };
}

/** Grid of free spots for single pieces around (never on) the board, nearest first. */
export function slots(p: Puzzle, table: Rect): Slot[] {
  const { sx, sy } = pitch(p);
  const m = sx / 2;
  const x0 = table.x + m, y0 = table.y + sy / 2, x1 = table.x + table.w - m, y1 = table.y + table.h - sy / 2;
  const nx = Math.max(1, Math.floor((x1 - x0) / sx) + 1), ny = Math.max(1, Math.floor((y1 - y0) / sy) + 1);
  const gx = nx > 1 ? (x1 - x0) / (nx - 1) : 0, gy = ny > 1 ? (y1 - y0) / (ny - 1) : 0;
  const out: Slot[] = [];
  const clear = 0.45 * p.s;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const cx = x0 + i * gx, cy = y0 + j * gy;
      const hx = sx / 2 - 0.1 * p.s, hy = sy / 2 - 0.1 * p.s;
      if (cx + hx > -clear && cx - hx < p.BW + clear && cy + hy > -clear && cy - hy < p.BH + clear) continue;
      const dx = Math.max(-cx, 0, cx - p.BW), dy = Math.max(-cy, 0, cy - p.BH);
      out.push({ cx, cy, d: Math.hypot(dx, dy) });
    }
  }
  return out.sort((a, b) => a.d - b.d);
}

export type ArrangeMode = 'scatter' | 'tidy' | 'colour';

/**
 * Where each loose single piece on the table should go. Returns target
 * centres; groups of two or more pieces are left where the player put them.
 *  - scatter: random spots, slightly jittered
 *  - tidy: edge pieces nearest the board, the rest further out
 *  - colour: similar colours next to each other (needs a hue per piece)
 */
export function arrange(p: Puzzle, table: Rect, mode: ArrangeMode, rnd: Rng, hue?: Float32Array): { g: Group; cx: number; cy: number }[] {
  const singles = p.order.map((id) => p.groups.get(id)!).filter((g) => g.pieces.length === 1);
  let free = slots(p, table);
  // Keep away from groups the player has built on the table.
  const built = p.order.map((id) => p.groups.get(id)!).filter((g) => g.pieces.length > 1);
  if (built.length) {
    const boxes = built.map((g) => groupBox(p, g, 0.4 * p.s));
    free = free.filter((s) => !boxes.some((b) => s.cx > b.x && s.cx < b.x + b.w && s.cy > b.y && s.cy < b.y + b.h));
  }
  if (mode === 'scatter') {
    shuffle(free, rnd);
    shuffle(singles, rnd);
  } else if (mode === 'tidy') {
    singles.sort((a, b) => p.isEdge[b.pieces[0]] - p.isEdge[a.pieces[0]] || a.pieces[0] - b.pieces[0]);
  } else {
    const h = (g: Group) => (hue ? hue[g.pieces[0]] : 0);
    singles.sort((a, b) => h(a) - h(b));
    // Fill slots in reading order so colours form bands rather than rings.
    free = free.slice(0, singles.length).sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  }
  const jitter = mode === 'scatter' ? 0.12 * p.s : 0;
  return singles.map((g, k) => {
    const s = free[k];
    if (s) return { g, cx: s.cx + (rnd() - 0.5) * jitter, cy: s.cy + (rnd() - 0.5) * jitter };
    // More pieces than spots: pile the rest anywhere off the board.
    for (let t = 0; t < 60; t++) {
      const cx = table.x + rnd() * table.w, cy = table.y + rnd() * table.h;
      if (cx < -p.s || cx > p.BW + p.s || cy < -p.s || cy > p.BH + p.s) return { g, cx, cy };
    }
    return { g, cx: table.x + rnd() * table.w, cy: table.y + p.s };
  });
}

/** World-space bounding box of a group (cells only, plus a margin). */
export function groupBox(p: Puzzle, g: Group, margin = 0): Rect {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of g.pieces) {
    const c = p.col(i), r = p.row(i);
    for (const [bx, by] of [[c * p.cw, r * p.ch], [(c + 1) * p.cw, (r + 1) * p.ch]]) {
      const [x, y] = p.toWorld(g, bx, by);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return { x: x0 - margin, y: y0 - margin, w: x1 - x0 + 2 * margin, h: y1 - y0 + 2 * margin };
}
