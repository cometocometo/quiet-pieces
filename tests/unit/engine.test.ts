import { describe, expect, it } from 'vitest';
import { chooseGrid, cutPuzzle, flattenPath, piecePath, pointInPolygon, PIECE_COUNTS, TAB_REACH } from '../../src/engine/geometry';
import { Puzzle, rotVec, type PuzzleSpec } from '../../src/engine/puzzle';
import { arrange, slots, tableFor } from '../../src/engine/layout';
import { mulberry32 } from '../../src/engine/rng';

const spec = (o: Partial<PuzzleSpec> = {}): PuzzleSpec => ({
  pictureId: 'test', aspect: 1.5, cols: 6, rows: 4, seed: 42, style: 'classic', rotation: false, ...o,
});

describe('geometry', () => {
  it('shares every interior edge between neighbours', () => {
    const cut = cutPuzzle(5, 4, 100, 120, 7);
    // The right edge of (1,1) and the left edge of (2,1) are the same curve.
    const v = cut.v[1][2];
    expect(v[0]).toEqual([200, 120]);
    expect(v[9]).toEqual([200, 240]);
    const h = cut.h[2][3];
    expect(h[0]).toEqual([300, 240]);
    expect(h[9]).toEqual([400, 240]);
  });

  it('builds closed outlines that stay within the tab reach', () => {
    const cut = cutPuzzle(8, 6, 90, 90, 3, 'organic');
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) {
      const cmds = piecePath(cut, c, r);
      expect(cmds[cmds.length - 1]).toBe(3);
      const poly = flattenPath(cmds);
      const reach = TAB_REACH * cut.s * 1.15;
      for (const [x, y] of poly) {
        expect(x).toBeGreaterThan(-reach); expect(x).toBeLessThan(90 + reach);
        expect(y).toBeGreaterThan(-reach); expect(y).toBeLessThan(90 + reach);
      }
      // The centre of every piece is inside it.
      expect(pointInPolygon(poly, 45, 45)).toBe(true);
    }
  });

  it('keeps border edges straight', () => {
    const cut = cutPuzzle(3, 3, 100, 100, 1);
    const poly = flattenPath(piecePath(cut, 0, 0));
    expect(pointInPolygon(poly, 2, 50)).toBe(true);
    expect(pointInPolygon(poly, -2, 50)).toBe(false);
  });

  it('chooses grids close to the requested count with near-square cells', () => {
    for (const n of PIECE_COUNTS) {
      for (const a of [1.5, 4 / 3, 0.75, 1]) {
        const { cols, rows } = chooseGrid(n, a);
        expect(Math.abs(cols * rows - n) / n).toBeLessThan(0.25);
        const cell = a / cols / (1 / rows);
        expect(cell).toBeGreaterThan(0.7); expect(cell).toBeLessThan(1.4);
      }
    }
  });
});

describe('puzzle rules', () => {
  it('rotates vectors clockwise in screen space', () => {
    expect(rotVec(1, 1, 0)).toEqual([-0, 1]);
    expect(rotVec(2, 1, 2)).toEqual([-1, -2]);
    expect(rotVec(3, 0, 1)).toEqual([1, -0]);
  });

  it('joins neighbours dropped near each other', () => {
    const p = Puzzle.create(spec());
    const a = p.group(0), b = p.group(1);
    p.move(a, 500, 300); p.move(b, 508, 296);
    const res = p.snap(b, 20)!;
    expect(res.absorbed.length).toBe(1);
    expect(p.groups.size).toBe(p.N - 1);
    expect(p.group(0)).toBe(p.group(1));
    expect(p.group(0).x).toBe(500);
  });

  it('does not join pieces that are not neighbours', () => {
    const p = Puzzle.create(spec());
    const a = p.group(0), b = p.group(2);
    p.move(a, 500, 300); p.move(b, 500, 300);
    expect(p.snap(b, 20)).toBeNull();
  });

  it('does not join pieces turned differently', () => {
    const p = Puzzle.create(spec({ rotation: true, seed: 5 }));
    const a = p.group(0), b = p.group(1);
    a.rot = 0; b.rot = 1;
    p.move(a, 300, 300); b.x = a.x; b.y = a.y;
    expect(p.snap(b, 20)).toBeNull();
    b.rot = 0;
    expect(p.snap(b, 20)).not.toBeNull();
  });

  it('places groups near their spot on the board and pulls in neighbours', () => {
    const p = Puzzle.create(spec());
    const a = p.group(7);
    p.move(a, 6, -5);
    const res = p.snap(a, 20)!;
    expect(res.placed).toBe(true);
    expect(a.placed).toBe(true);
    expect(a.x).toBe(0);
    // Every other piece is still at the identity, so they all join.
    expect(p.complete).toBe(true);
  });

  it('keeps the rotation pivot fixed', () => {
    const p = Puzzle.create(spec());
    const g = p.group(3);
    p.move(g, 400, 100);
    const [cx, cy] = p.pieceCentre(3);
    p.rotate(g, cx, cy, 1);
    const [nx, ny] = p.pieceCentre(3);
    expect(nx).toBeCloseTo(cx); expect(ny).toBeCloseTo(cy);
    expect(g.rot).toBe(1);
    p.rotate(g, cx, cy, -1);
    expect(g.rot).toBe(0);
    expect(g.x).toBeCloseTo(400);
  });

  it('maps world and board points both ways', () => {
    const p = Puzzle.create(spec());
    const g = p.group(0);
    g.rot = 3; g.x = 123; g.y = -40;
    const [wx, wy] = p.toWorld(g, 33, 77);
    const [bx, by] = p.toBoard(g, wx, wy);
    expect(bx).toBeCloseTo(33); expect(by).toBeCloseTo(77);
  });

  it('solves a whole puzzle piece by piece', () => {
    const p = Puzzle.create(spec({ cols: 5, rows: 5 }));
    const rnd = mulberry32(9);
    for (const g of p.groups.values()) p.move(g, rnd() * 3000 - 1500, rnd() * 3000 - 1500);
    for (let i = 0; i < p.N; i++) {
      const g = p.group(i);
      if (g.placed) continue;
      // Put it back (almost) exactly where it belongs.
      g.x = 3; g.y = -2;
      p.snap(g, 10);
    }
    expect(p.complete).toBe(true);
    expect(p.progress).toBe(1);
  });

  it('moves pieces in and out of the tray', () => {
    const p = Puzzle.create(spec());
    const g = p.group(4);
    expect(p.putInTray(g)).toBe(true);
    expect(p.tray).toContain(g.id);
    expect(p.order).not.toContain(g.id);
    expect(p.snap(g, 1000)).toBeNull();
    p.takeFromTray(g);
    expect(p.order).toContain(g.id);
  });

  it('round-trips through a save', () => {
    const p = Puzzle.create(spec({ rotation: true }));
    p.move(p.group(0), 100, 50);
    p.move(p.group(1), 100, 50);
    p.group(1).rot = p.group(0).rot;
    p.snap(p.group(1), 10);
    p.putInTray(p.group(10));
    p.elapsed = 12345; p.moves = 7;
    const json = JSON.parse(JSON.stringify(p.serialize()));
    const q = Puzzle.deserialize(json);
    expect(q.groups.size).toBe(p.groups.size);
    expect(q.group(0)).toBe(q.group(1));
    expect(q.group(0).x).toBeCloseTo(p.group(0).x);
    expect(q.group(10).tray).toBe(true);
    expect(q.elapsed).toBe(12345);
    expect(q.moves).toBe(7);
  });

  it('gives a useful hint', () => {
    const p = Puzzle.create(spec());
    for (const g of p.groups.values()) p.move(g, 2000, 0);
    const h = p.hint()!;
    expect(h).not.toBeNull();
    // With nothing on the board yet, a corner is suggested for the board.
    expect(p.neighbours(h.group.pieces[0]).length).toBe(2);
  });
});

describe('layout', () => {
  it('finds enough free spots off the board for every piece', () => {
    for (const n of [24, 120, 500, 1000]) {
      const { cols, rows } = chooseGrid(n, 1.5);
      const p = Puzzle.create(spec({ cols, rows }));
      const t = tableFor(p, 16 / 10);
      const s = slots(p, t);
      expect(s.length).toBeGreaterThanOrEqual(p.N * 0.95);
      for (const sl of s) {
        const inside = sl.cx > 0 && sl.cx < p.BW && sl.cy > 0 && sl.cy < p.BH;
        expect(inside).toBe(false);
      }
    }
  });

  it('arranges every loose single piece', () => {
    const p = Puzzle.create(spec({ cols: 10, rows: 7 }));
    const t = tableFor(p, 0.5);
    const out = arrange(p, t, 'tidy', mulberry32(1));
    expect(out.length).toBe(p.N);
    // Edge pieces come first, nearest the board.
    const firstInner = out.findIndex((o) => !p.isEdge[o.g.pieces[0]]);
    expect(out.slice(firstInner).every((o) => !p.isEdge[o.g.pieces[0]])).toBe(true);
  });
});
