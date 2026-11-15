/**
 * Drawing toolkit shared by the picture generators: colour maths, smooth
 * noise, ridgelines, Voronoi cells and finishing touches (grain, vignette).
 * Everything takes a seeded random source so a picture is identical every
 * time it is drawn.
 */
import { mulberry32, type Rng } from '../engine/rng';

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type RGB = [number, number, number];

export interface Gen {
  c: Ctx2D;
  W: number;
  H: number;
  rnd: Rng;
  /** Which variation of the generator to draw (palette, composition…). */
  v: number;
  noise: Noise;
  makeCanvas(w: number, h: number): { canvas: OffscreenCanvas | HTMLCanvasElement; c: Ctx2D };
}
export type Generator = (g: Gen) => void;

// ---------------------------------------------------------------- colour
export function hex(h: string): RGB {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgb = (c: RGB, a = 1) => (a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mixHex = (a: string, b: string, t: number, alpha = 1) => rgb(mix(hex(a), hex(b), t), alpha);
export const shade = (c: RGB, k: number): RGB => (k < 0 ? mix(c, [0, 0, 0], -k) : mix(c, [255, 255, 255], k));
export function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;
}
/** Sample a multi-stop gradient (array of hex colours) at t in 0..1. */
export function ramp(stops: string[], t: number): RGB {
  const x = Math.max(0, Math.min(0.99999, t)) * (stops.length - 1);
  const i = Math.floor(x);
  return mix(hex(stops[i]), hex(stops[i + 1] ?? stops[i]), x - i);
}
export function linear(c: Ctx2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}
export function radial(c: Ctx2D, x: number, y: number, r0: number, r1: number, stops: [number, string][]) {
  const g = c.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

// ---------------------------------------------------------------- noise
/** 2D gradient noise (Perlin-style) with fractal sums. */
export class Noise {
  private p: Uint8Array;
  constructor(seed: number) {
    const rnd = mulberry32(seed);
    const perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }
  private grad(h: number, x: number, y: number) {
    switch (h & 7) {
      case 0: return x + y; case 1: return x - y; case 2: return -x + y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  }
  /** Roughly -1..1 */
  n2(x: number, y: number): number {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
    const p = this.p;
    const a = p[X] + Y, b = p[X + 1] + Y;
    const l1 = this.grad(p[a], x, y) + u * (this.grad(p[b], x - 1, y) - this.grad(p[a], x, y));
    const l2 = this.grad(p[a + 1], x, y - 1) + u * (this.grad(p[b + 1], x - 1, y - 1) - this.grad(p[a + 1], x, y - 1));
    return (l1 + v * (l2 - l1)) * 0.7;
  }
  fbm(x: number, y: number, oct = 4, lac = 2, gain = 0.5): number {
    let s = 0, a = 1, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += a * this.n2(x * f, y * f); norm += a; a *= gain; f *= lac; }
    return s / norm;
  }
  ridged(x: number, y: number, oct = 4): number {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { const n = 1 - Math.abs(this.n2(x * f, y * f)); s += a * n * n; a *= 0.5; f *= 2; }
    return s;
  }
}

// ---------------------------------------------------------------- shapes
/** A mountain-like ridgeline: `n+1` heights in 0..1 by midpoint displacement. */
export function ridgeline(n: number, rough: number, rnd: Rng): Float32Array {
  const a = new Float32Array(n + 1);
  a[0] = rnd(); a[n] = rnd();
  let step = n, scale = 1;
  while (step > 1) {
    const h = step / 2;
    for (let i = h; i < n; i += step) a[i] = (a[i - h] + a[i + h]) / 2 + (rnd() - 0.5) * scale;
    scale *= rough; step = h;
  }
  let lo = Infinity, hi = -Infinity;
  for (const v of a) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  for (let i = 0; i <= n; i++) a[i] = (a[i] - lo) / (hi - lo || 1);
  return a;
}

/** Fill the area under a ridgeline from `base` (top of peaks = base - amp) down to the bottom. */
export function fillRidge(g: Gen, r: Float32Array, base: number, amp: number, fill: string | CanvasGradient) {
  const { c, W, H } = g, n = r.length - 1;
  c.fillStyle = fill;
  c.beginPath(); c.moveTo(0, H);
  for (let i = 0; i <= n; i++) c.lineTo((i / n) * W, base - r[i] * amp);
  c.lineTo(W, H); c.closePath(); c.fill();
}

export function circle(c: Ctx2D, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }

/** Stars: small dots fading toward `fadeY`. */
export function stars(g: Gen, count: number, fadeY: number, colour = '#ffffff') {
  const { c, W, rnd } = g;
  c.fillStyle = colour;
  for (let i = 0; i < count; i++) {
    const y = rnd() * fadeY;
    c.globalAlpha = Math.max(0, 1 - y / fadeY) * (0.25 + rnd() * 0.75);
    const r = rnd() < 0.03 ? 1.6 + rnd() * 1.6 : 0.5 + rnd() * 1.3;
    const x = rnd() * W;
    circle(c, x, y, r); c.fill();
    if (r > 2.2) { // a few bright stars get a soft sparkle
      c.globalAlpha *= 0.45;
      c.fillRect(x - r * 4, y - 0.6, r * 8, 1.2);
      c.fillRect(x - 0.6, y - r * 4, 1.2, r * 8);
    }
  }
  c.globalAlpha = 1;
}

/** Jittered-grid Voronoi: returns, for every pixel of a w×h grid, the index of its nearest site. */
export function voronoi(w: number, h: number, cell: number, rnd: Rng) {
  const gx = Math.ceil(w / cell) + 2, gy = Math.ceil(h / cell) + 2;
  const sx = new Float32Array(gx * gy), sy = new Float32Array(gx * gy);
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
    sx[j * gx + i] = (i - 1 + 0.15 + rnd() * 0.7) * cell;
    sy[j * gx + i] = (j - 1 + 0.15 + rnd() * 0.7) * cell;
  }
  const id = new Int32Array(w * h), edge = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const cj = Math.floor(y / cell) + 1;
    for (let x = 0; x < w; x++) {
      const ci = Math.floor(x / cell) + 1;
      let d1 = Infinity, d2 = Infinity, best = 0;
      for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
        const k = j * gx + i, dx = sx[k] - x, dy = sy[k] - y, d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; best = k; } else if (d < d2) d2 = d;
      }
      id[y * w + x] = best;
      edge[y * w + x] = Math.sqrt(d2) - Math.sqrt(d1);
    }
  }
  return { id, edge, sx, sy, count: gx * gy };
}

// ---------------------------------------------------------------- finishing
/** Fine film grain: adds texture so flat areas still differ piece to piece. */
export function grain(g: Gen, amount = 10) {
  const { c, W, H, rnd } = g;
  const tile = g.makeCanvas(256, 256);
  const img = tile.c.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 2 * amount;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tile.c.putImageData(img, 0, 0);
  c.save();
  c.globalCompositeOperation = 'overlay';
  c.globalAlpha = 0.5;
  const pat = c.createPattern(tile.canvas as CanvasImageSource, 'repeat');
  if (pat) { c.fillStyle = pat; c.fillRect(0, 0, W, H); }
  c.restore();
}

export function vignette(g: Gen, strength = 0.35) {
  const { c, W, H } = g;
  c.fillStyle = radial(c, W / 2, H / 2, Math.min(W, H) * 0.35, Math.hypot(W, H) * 0.62, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${strength})`]]);
  c.fillRect(0, 0, W, H);
}

/** Soft light glow, e.g. around a sun. */
export function glow(g: Gen, x: number, y: number, r: number, colour: RGB, alpha = 0.6) {
  const { c } = g;
  c.fillStyle = radial(c, x, y, 0, r, [[0, rgb(colour, alpha)], [0.35, rgb(colour, alpha * 0.35)], [1, rgb(colour, 0)]]);
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Puffy cloud made of overlapping circles, lit from above. */
export function cloud(g: Gen, x: number, y: number, w: number, top: string, bottom: string, alpha = 1) {
  const { c, rnd } = g;
  const h = w * 0.32;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = linear(c, 0, y - h, 0, y + h * 0.3, [[0, top], [1, bottom]]);
  c.beginPath();
  const n = 6 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const cx = x - w / 2 + t * w;
    const r = h * (0.35 + Math.sin(t * Math.PI) * (0.45 + rnd() * 0.35));
    c.moveTo(cx + r, y - r * 0.4);
    c.arc(cx, y - r * 0.4, r, 0, Math.PI * 2);
  }
  c.rect(x - w / 2, y - h * 0.3, w, h * 0.3);
  c.fill();
  c.restore();
}

/** Long, flat evening cloud: a soft capsule lit from below or above. */
export function stratus(g: Gen, x: number, y: number, w: number, h: number, lit: string, dark: string, alpha = 1, litBelow = true) {
  const { c, rnd } = g;
  c.save();
  c.globalAlpha = alpha;
  const parts = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < parts; i++) {
    const pw = w * (0.45 + rnd() * 0.55), ph = h * (0.5 + rnd() * 0.6);
    const px = x + (rnd() - 0.5) * (w - pw), py = y + (rnd() - 0.5) * h * 1.2;
    c.fillStyle = linear(c, 0, py - ph / 2, 0, py + ph / 2, litBelow ? [[0, dark], [1, lit]] : [[0, lit], [1, dark]]);
    c.beginPath(); c.roundRect(px - pw / 2, py - ph / 2, pw, ph, ph / 2); c.fill();
  }
  c.restore();
}

/** Soft beams of light fanning out from a point. */
export function rays(g: Gen, x: number, y: number, colour: RGB, n = 9, alpha = 0.08) {
  const { c, W, H, rnd } = g;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const len = Math.hypot(W, H);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.15 + rnd() * Math.PI * 0.7, w = 0.02 + rnd() * 0.05;
    c.fillStyle = linear(c, x, y, x + Math.cos(a) * len * 0.7, y + Math.sin(a) * len * 0.7, [[0, rgb(colour, alpha * (0.6 + rnd()))], [1, rgb(colour, 0)]]);
    c.beginPath(); c.moveTo(x, y);
    c.lineTo(x + Math.cos(a - w) * len, y + Math.sin(a - w) * len);
    c.lineTo(x + Math.cos(a + w) * len, y + Math.sin(a + w) * len);
    c.closePath(); c.fill();
  }
  c.restore();
}

/** Simple conifer tree silhouette. */
export function pine(c: Ctx2D, x: number, y: number, h: number, w = 0.32) {
  c.beginPath();
  const tiers = 4;
  c.moveTo(x, y - h);
  for (let i = 1; i <= tiers; i++) {
    const ty = y - h + (h * 0.9 * i) / tiers;
    const tw = h * w * (0.35 + (0.65 * i) / tiers);
    c.lineTo(x + tw, ty);
    c.lineTo(x + tw * 0.45, ty);
  }
  c.lineTo(x + h * 0.04, y); c.lineTo(x - h * 0.04, y);
  for (let i = tiers; i >= 1; i--) {
    const ty = y - h + (h * 0.9 * i) / tiers;
    const tw = h * w * (0.35 + (0.65 * i) / tiers);
    c.lineTo(x - tw * 0.45, ty);
    c.lineTo(x - tw, ty);
  }
  c.closePath();
  c.fill();
}

/** A distant flock of birds. */
export function birds(g: Gen, x: number, y: number, n: number, size: number, colour: string) {
  const { c, rnd } = g;
  c.save();
  c.strokeStyle = colour; c.lineWidth = Math.max(1.2, size * 0.13); c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const bx = x + (rnd() - 0.5) * size * 14, by = y + (rnd() - 0.5) * size * 6, w = size * (0.6 + rnd() * 0.6);
    const flap = 0.3 + rnd() * 0.5;
    c.beginPath();
    c.moveTo(bx - w, by - w * flap);
    c.quadraticCurveTo(bx - w * 0.4, by - w * 0.5, bx, by);
    c.quadraticCurveTo(bx + w * 0.4, by - w * 0.5, bx + w, by - w * flap);
    c.stroke();
  }
  c.restore();
}
