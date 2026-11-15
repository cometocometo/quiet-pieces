/**
 * Piece textures. Every piece is cut from the picture, given a bevelled edge
 * and an outline, and packed into large texture sheets (atlases) so the GPU
 * can draw hundreds of pieces in a handful of draw calls. A matching sheet of
 * soft shadows is made at half resolution.
 *
 * Runs in the worker (OffscreenCanvas). Falls back to the main thread.
 */
import { tracePath, type PathCmds } from './geometry';

export interface SheetRequest {
  picture: ImageBitmap | HTMLCanvasElement | OffscreenCanvas;
  paths: PathCmds[];
  cols: number;
  rows: number;
  cw: number;
  ch: number;
  pad: number;
  /** Pixels per board unit. */
  scale: number;
  maxSheet: number;
  /** Stronger outline for players who want clearer piece edges. */
  outline: boolean;
}

export interface SheetLayout {
  /** Size of one piece cell in pixels. */
  cellW: number;
  cellH: number;
  perRow: number;
  perSheet: number;
  sheetW: number;
  sheetH: number;
  shadowScale: number;
}

export interface SheetResult<T = ImageBitmap> {
  layout: SheetLayout;
  sheets: T[];
  shadows: T[];
  /** Average hue (0..1, greys sorted last) of every piece, for sorting by colour. */
  hues: Float32Array;
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function canvas(w: number, h: number): { cv: AnyCanvas; c: Ctx } {
  const cv: AnyCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  return { cv, c: cv.getContext('2d') as Ctx };
}

export function layoutFor(r: Pick<SheetRequest, 'cw' | 'ch' | 'pad' | 'scale' | 'maxSheet' | 'paths'>): SheetLayout {
  const cellW = Math.ceil((r.cw + 2 * r.pad) * r.scale);
  const cellH = Math.ceil((r.ch + 2 * r.pad) * r.scale);
  const perRow = Math.max(1, Math.floor(r.maxSheet / cellW));
  const rowsPerSheet = Math.max(1, Math.floor(r.maxSheet / cellH));
  const perSheet = perRow * rowsPerSheet;
  const n = r.paths.length;
  const sheetsNeeded = Math.ceil(n / perSheet);
  const lastRows = sheetsNeeded === 1 ? Math.ceil(n / perRow) : rowsPerSheet;
  return {
    cellW, cellH, perRow, perSheet,
    sheetW: Math.min(perRow, n) * cellW,
    sheetH: lastRows * cellH,
    shadowScale: 0.5,
  };
}

/** Pixel scale that keeps total texture memory within budget. */
export function chooseScale(cw: number, ch: number, pad: number, n: number, want: number, budgetPx = 40e6): number {
  const area = (cw + 2 * pad) * (ch + 2 * pad) * n;
  return Math.max(0.2, Math.min(want, Math.sqrt(budgetPx / area)));
}

export function buildPieceSheets(r: SheetRequest): SheetResult {
  const out = buildPieceSheetsCanvas(r);
  const toBitmap = (cv: AnyCanvas) => (cv as OffscreenCanvas).transferToImageBitmap();
  return { layout: out.layout, sheets: out.sheets.map(toBitmap), shadows: out.shadows.map(toBitmap), hues: out.hues };
}

export function buildPieceSheetsCanvas(r: SheetRequest): SheetResult<AnyCanvas> {
  const L = layoutFor(r);
  const { cols, cw, ch, pad, scale: S } = r;
  const n = r.paths.length;
  const BW = cols * cw, BH = r.rows * ch;
  const s = Math.min(cw, ch);
  const sheets: AnyCanvas[] = [], shadows: AnyCanvas[] = [];
  const sheetCount = Math.ceil(n / L.perSheet);
  const Ss = S * L.shadowScale;
  for (let k = 0; k < sheetCount; k++) {
    const count = Math.min(L.perSheet, n - k * L.perSheet);
    const rowsHere = Math.ceil(count / L.perRow);
    const w = Math.min(L.perRow, count) * L.cellW, h = rowsHere * L.cellH;
    const sheet = canvas(w, h), sil = canvas(Math.ceil(w * L.shadowScale), Math.ceil(h * L.shadowScale));
    for (let q = 0; q < count; q++) {
      const i = k * L.perSheet + q;
      const c0 = i % cols, r0 = Math.floor(i / cols);
      const ox = (q % L.perRow) * L.cellW, oy = Math.floor(q / L.perRow) * L.cellH;
      drawPiece(sheet.c, r, i, ox, oy, S, c0, r0, BW, BH, s, pad);
      // shadow silhouette (blurred once per sheet below)
      const sc = sil.c;
      sc.setTransform(Ss, 0, 0, Ss, ox * L.shadowScale + pad * Ss, oy * L.shadowScale + pad * Ss);
      sc.fillStyle = '#000';
      sc.beginPath(); tracePath(sc, r.paths[i]); sc.fill();
    }
    const shadow = canvas(sil.cv.width, sil.cv.height);
    shadow.c.filter = `blur(${Math.max(1, s * 0.05 * Ss).toFixed(1)}px)`;
    shadow.c.drawImage(sil.cv as CanvasImageSource, 0, 0);
    sheets.push(sheet.cv); shadows.push(shadow.cv);
  }
  return { layout: L, sheets, shadows, hues: pieceHues(r) };
}

function drawPiece(c: Ctx, r: SheetRequest, i: number, ox: number, oy: number, S: number, col: number, row: number, BW: number, BH: number, s: number, pad: number) {
  const path = r.paths[i];
  c.save();
  c.setTransform(S, 0, 0, S, ox + pad * S, oy + pad * S);
  c.beginPath(); tracePath(c, path);
  c.save();
  c.clip();
  // copy only the part of the picture this piece needs
  const pic = r.picture as { width: number; height: number };
  const kx = pic.width / BW, ky = pic.height / BH;
  const x0 = Math.max(0, col * r.cw - pad), y0 = Math.max(0, row * r.ch - pad);
  const x1 = Math.min(BW, (col + 1) * r.cw + pad), y1 = Math.min(BH, (row + 1) * r.ch + pad);
  c.drawImage(r.picture as CanvasImageSource, x0 * kx, y0 * ky, (x1 - x0) * kx, (y1 - y0) * ky, x0 - col * r.cw, y0 - row * r.ch, x1 - x0, y1 - y0);
  // Bevel: light along the top-left edges, shade along the bottom-right.
  const o = s * 0.014;
  c.lineJoin = 'round';
  c.lineWidth = o * 2;
  c.translate(o, o);
  c.strokeStyle = 'rgba(255,255,255,0.34)';
  c.beginPath(); tracePath(c, path); c.stroke();
  c.translate(-2 * o, -2 * o);
  c.strokeStyle = 'rgba(0,0,0,0.30)';
  c.beginPath(); tracePath(c, path); c.stroke();
  c.translate(o, o);
  // A soft inner glow gives the cardboard a little depth.
  c.lineWidth = s * 0.07;
  c.strokeStyle = 'rgba(0,0,0,0.05)';
  c.beginPath(); tracePath(c, path); c.stroke();
  c.restore();
  c.lineWidth = r.outline ? Math.max(2 / S, s * 0.018) : Math.max(0.75 / S, s * 0.006);
  c.strokeStyle = r.outline ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.32)';
  c.beginPath(); tracePath(c, path); c.stroke();
  c.restore();
}

/** Hue of each piece's centre region, from a tiny copy of the picture. */
function pieceHues(r: SheetRequest): Float32Array {
  const { cols, rows } = r;
  const tiny = canvas(cols * 3, rows * 3);
  tiny.c.drawImage(r.picture as CanvasImageSource, 0, 0, cols * 3, rows * 3);
  const d = tiny.c.getImageData(0, 0, cols * 3, rows * 3).data;
  const hues = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const x = (i % cols) * 3 + 1, y = Math.floor(i / cols) * 3 + 1;
    const p = (y * cols * 3 + x) * 4;
    const R = d[p] / 255, G = d[p + 1] / 255, B = d[p + 2] / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), delta = mx - mn;
    if (delta < 0.08) { hues[i] = 1.5 + (1 - mx); continue; } // greys at the end, light to dark
    let h = mx === R ? ((G - B) / delta) % 6 : mx === G ? (B - R) / delta + 2 : (R - G) / delta + 4;
    h /= 6; if (h < 0) h += 1;
    hues[i] = h;
  }
  return hues;
}
