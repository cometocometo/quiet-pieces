/**
 * Puzzle state: pieces, the groups they have been joined into, and the rules
 * for joining.
 *
 * Every group keeps its pieces in their correct arrangement, so a group only
 * needs one transform: a rotation (quarter turns) and a translation. A point
 * `b` in board coordinates is drawn at `R(rot)·b + (x, y)` in table (world)
 * coordinates. Two groups fit together exactly when they share an edge and
 * their transforms are equal, and a group sits correctly on the board when its
 * transform is the identity. That makes snapping a simple comparison.
 */
import { cutPuzzle, piecePath, type Cut, type PathCmds, type PieceStyle } from './geometry';
import { mulberry32 } from './rng';

export type Rot = 0 | 1 | 2 | 3;

export interface PuzzleSpec {
  pictureId: string;
  /** Picture width / height. */
  aspect: number;
  cols: number;
  rows: number;
  seed: number;
  style: PieceStyle;
  rotation: boolean;
}

export interface Group {
  id: number;
  pieces: number[];
  x: number;
  y: number;
  rot: Rot;
  placed: boolean;
  /** Single loose pieces can sit in the tray instead of on the table. */
  tray: boolean;
  hasEdge: boolean;
}

export interface SnapResult {
  survivor: Group;
  absorbed: number[];
  placed: boolean;
  /** How many pieces joined in this drop (for sound and score). */
  joined: number;
}

export interface SavedGroup { p: number[]; x: number; y: number; r: Rot; pl?: 1; t?: 1 }
export interface SavedPuzzle {
  v: 2;
  spec: PuzzleSpec;
  groups: SavedGroup[];
  tray: number[]; // indexes into groups
  elapsed: number;
  moves: number;
  hints: number;
}

export const BOARD_HEIGHT = 1000;

/** Rotate a vector by `rot` quarter turns clockwise (screen coordinates, y down). */
export function rotVec(rot: Rot, x: number, y: number): [number, number] {
  switch (rot) {
    case 0: return [x, y];
    case 1: return [-y, x];
    case 2: return [-x, -y];
    default: return [y, -x];
  }
}

export class Puzzle {
  readonly spec: PuzzleSpec;
  readonly cut: Cut;
  readonly BW: number;
  readonly BH = BOARD_HEIGHT;
  readonly cw: number;
  readonly ch: number;
  readonly s: number;
  readonly N: number;
  readonly paths: PathCmds[];
  readonly isEdge: Uint8Array;
  readonly pieceGroup: Int32Array;
  groups = new Map<number, Group>();
  /** Loose groups on the table, bottom to top. */
  order: number[] = [];
  /** Group ids in the tray, in display order. */
  tray: number[] = [];
  elapsed = 0;
  moves = 0;
  hints = 0;
  private nextId = 0;

  constructor(spec: PuzzleSpec) {
    this.spec = spec;
    this.BW = BOARD_HEIGHT * spec.aspect;
    this.cw = this.BW / spec.cols;
    this.ch = this.BH / spec.rows;
    this.s = Math.min(this.cw, this.ch);
    this.N = spec.cols * spec.rows;
    this.cut = cutPuzzle(spec.cols, spec.rows, this.cw, this.ch, spec.seed, spec.style);
    this.paths = [];
    this.isEdge = new Uint8Array(this.N);
    this.pieceGroup = new Int32Array(this.N);
    for (let r = 0; r < spec.rows; r++) {
      for (let c = 0; c < spec.cols; c++) {
        const i = r * spec.cols + c;
        this.paths[i] = piecePath(this.cut, c, r);
        this.isEdge[i] = r === 0 || c === 0 || r === spec.rows - 1 || c === spec.cols - 1 ? 1 : 0;
      }
    }
  }

  /** A new puzzle with every piece in its own group, sitting at its correct spot. */
  static create(spec: PuzzleSpec): Puzzle {
    const p = new Puzzle(spec);
    const rnd = mulberry32(spec.seed ^ 0x9e3779b9);
    for (let i = 0; i < p.N; i++) {
      const rot = (spec.rotation ? Math.floor(rnd() * 4) : 0) as Rot;
      p.addGroup([i], 0, 0, rot, false, false);
    }
    return p;
  }

  col(i: number) { return i % this.spec.cols; }
  row(i: number) { return Math.floor(i / this.spec.cols); }
  group(i: number): Group { return this.groups.get(this.pieceGroup[i])!; }

  private addGroup(pieces: number[], x: number, y: number, rot: Rot, placed: boolean, tray: boolean): Group {
    const g: Group = { id: this.nextId++, pieces, x, y, rot, placed, tray, hasEdge: pieces.some((i) => this.isEdge[i]) };
    this.groups.set(g.id, g);
    for (const i of pieces) this.pieceGroup[i] = g.id;
    if (tray) this.tray.push(g.id);
    else if (!placed) this.order.push(g.id);
    return g;
  }

  neighbours(i: number): number[] {
    const { cols, rows } = this.spec;
    const c = i % cols, r = (i / cols) | 0, out: number[] = [];
    if (c > 0) out.push(i - 1);
    if (c < cols - 1) out.push(i + 1);
    if (r > 0) out.push(i - cols);
    if (r < rows - 1) out.push(i + cols);
    return out;
  }

  /** World position of a board-space point drawn by group g. */
  toWorld(g: Group, bx: number, by: number): [number, number] {
    const [x, y] = rotVec(g.rot, bx, by);
    return [x + g.x, y + g.y];
  }

  /** Board-space point of a world point, in the frame of group g. */
  toBoard(g: Group, wx: number, wy: number): [number, number] {
    return rotVec(((4 - g.rot) % 4) as Rot, wx - g.x, wy - g.y);
  }

  /** World centre of piece i. */
  pieceCentre(i: number): [number, number] {
    return this.toWorld(this.group(i), (this.col(i) + 0.5) * this.cw, (this.row(i) + 0.5) * this.ch);
  }

  move(g: Group, dx: number, dy: number) { g.x += dx; g.y += dy; }

  /** Move a group so that the centre of its piece `i` lands on world point (wx, wy). */
  moveCentreTo(g: Group, i: number, wx: number, wy: number) {
    const [cx, cy] = this.toWorld(g, (this.col(i) + 0.5) * this.cw, (this.row(i) + 0.5) * this.ch);
    this.move(g, wx - cx, wy - cy);
  }

  /** Rotate a group a quarter turn (dir 1 = clockwise) around world point (px, py). */
  rotate(g: Group, px: number, py: number, dir: 1 | -1 = 1) {
    const r = ((g.rot + (dir === 1 ? 1 : 3)) % 4) as Rot;
    const [vx, vy] = rotVec(dir === 1 ? 1 : 3, g.x - px, g.y - py);
    g.x = px + vx; g.y = py + vy; g.rot = r;
  }

  toFront(g: Group) {
    const k = this.order.indexOf(g.id);
    if (k >= 0) { this.order.splice(k, 1); this.order.push(g.id); }
  }

  putInTray(g: Group, index = this.tray.length) {
    if (g.placed || g.pieces.length !== 1 || g.tray) return false;
    this.order.splice(this.order.indexOf(g.id), 1);
    g.tray = true;
    this.tray.splice(Math.min(index, this.tray.length), 0, g.id);
    return true;
  }

  takeFromTray(g: Group) {
    if (!g.tray) return;
    this.tray.splice(this.tray.indexOf(g.id), 1);
    g.tray = false;
    this.order.push(g.id);
  }

  /** Join groups that are dropped close enough to fit, and place groups that are close to their spot on the board. */
  snap(g: Group, tol: number): SnapResult | null {
    if (g.tray) return null;
    let survivor = g;
    const absorbed: number[] = [];
    let placed = false, joined = 0;

    if (!survivor.placed && survivor.rot === 0 && Math.hypot(survivor.x, survivor.y) < tol) {
      this.place(survivor);
      placed = true;
    }
    for (;;) {
      const other = this.findFit(survivor, tol);
      if (!other) break;
      joined += other.pieces.length;
      const keep = other.placed || (!survivor.placed && other.pieces.length > survivor.pieces.length) ? other : survivor;
      const drop = keep === other ? survivor : other;
      // The group that was just dropped moves onto the other one, unless it is
      // already on the board, in which case the other one comes to it.
      const target = survivor.placed ? survivor : other;
      keep.x = target.x; keep.y = target.y; keep.rot = target.rot;
      this.mergeInto(keep, drop);
      absorbed.push(drop.id);
      survivor = keep;
    }
    if (!placed && !absorbed.length) return null;
    return { survivor, absorbed, placed, joined };
  }

  private findFit(g: Group, tol: number): Group | null {
    const seen = new Set<number>();
    for (const i of g.pieces) {
      for (const n of this.neighbours(i)) {
        const gid = this.pieceGroup[n];
        if (gid === g.id || seen.has(gid)) continue;
        seen.add(gid);
        const o = this.groups.get(gid)!;
        if (o.tray || o.rot !== g.rot) continue;
        if (Math.hypot(o.x - g.x, o.y - g.y) < tol) return o;
      }
    }
    return null;
  }

  private place(g: Group) {
    g.x = 0; g.y = 0; g.rot = 0; g.placed = true;
    const k = this.order.indexOf(g.id);
    if (k >= 0) this.order.splice(k, 1);
  }

  private mergeInto(keep: Group, drop: Group) {
    for (const i of drop.pieces) { keep.pieces.push(i); this.pieceGroup[i] = keep.id; }
    keep.hasEdge ||= drop.hasEdge;
    const k = this.order.indexOf(drop.id);
    if (k >= 0) this.order.splice(k, 1);
    this.groups.delete(drop.id);
    if (drop.placed && !keep.placed) this.place(keep);
    if (keep.placed) this.place(keep);
    else this.toFront(keep);
  }

  /** Put a group on the board (used when the last group is joined but not yet on the board). */
  placeGroup(g: Group) { this.place(g); }

  get placedCount(): number {
    let n = 0;
    for (const g of this.groups.values()) if (g.placed) n += g.pieces.length;
    return n;
  }

  /** 0..1: how many joins are done out of the N-1 needed. */
  get progress(): number {
    if (this.N <= 1) return 1;
    let p = (this.N - this.groups.size) / (this.N - 1);
    if (this.groups.size === 1 && ![...this.groups.values()][0].placed) p = 0.99;
    return p;
  }

  get complete(): boolean {
    return this.groups.size === 1 && [...this.groups.values()][0].placed;
  }

  /**
   * Suggest a move: which group to move, and the transform that makes it fit.
   * Prefers pieces that join what is already on the board, then corners and
   * edges, then any pair of pieces that belong together.
   */
  hint(): { group: Group; x: number; y: number; rot: Rot } | null {
    const loose = [...this.groups.values()].filter((g) => !g.placed);
    if (!loose.length) return null;
    const byWeight = (a: Group, b: Group) => a.pieces.length - b.pieces.length;
    for (const g of loose.sort(byWeight)) {
      if (g.pieces.some((i) => this.neighbours(i).some((n) => this.group(n).placed))) return { group: g, x: 0, y: 0, rot: 0 };
    }
    const corner = loose.find((g) => g.pieces.some((i) => this.neighbours(i).length === 2));
    if (corner && !loose.some((g) => g.placed)) return { group: corner, x: 0, y: 0, rot: 0 };
    for (const g of loose) {
      for (const i of g.pieces) {
        for (const n of this.neighbours(i)) {
          const o = this.group(n);
          if (o !== g && !o.tray) return { group: g, x: o.x, y: o.y, rot: o.rot };
        }
      }
    }
    return { group: loose[0], x: 0, y: 0, rot: 0 };
  }

  serialize(): SavedPuzzle {
    const groups = [...this.groups.values()];
    // Keep table z-order: placed groups first, then loose groups bottom to top, then tray.
    const ordered = [
      ...groups.filter((g) => g.placed),
      ...this.order.map((id) => this.groups.get(id)!),
      ...groups.filter((g) => g.tray),
    ];
    const pos = new Map(ordered.map((g, k) => [g.id, k]));
    return {
      v: 2,
      spec: this.spec,
      groups: ordered.map((g) => {
        const o: SavedGroup = { p: g.pieces, x: round(g.x), y: round(g.y), r: g.rot };
        if (g.placed) o.pl = 1;
        if (g.tray) o.t = 1;
        return o;
      }),
      tray: this.tray.map((id) => pos.get(id)!),
      elapsed: Math.round(this.elapsed),
      moves: this.moves,
      hints: this.hints,
    };
  }

  static deserialize(data: SavedPuzzle): Puzzle {
    const p = new Puzzle(data.spec);
    const made: Group[] = data.groups.map((s) => p.addGroup(s.p.slice(), s.x, s.y, s.r, !!s.pl, false));
    // Restore tray membership and order.
    p.tray = [];
    for (const k of data.tray) {
      const g = made[k];
      if (!g || g.placed || g.pieces.length !== 1) continue;
      p.order.splice(p.order.indexOf(g.id), 1);
      g.tray = true;
      p.tray.push(g.id);
    }
    p.elapsed = data.elapsed || 0;
    p.moves = data.moves || 0;
    p.hints = data.hints || 0;
    return p;
  }
}

const round = (v: number) => Math.round(v * 10) / 10;
