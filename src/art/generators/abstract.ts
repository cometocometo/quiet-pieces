import { mulberry32 } from '../../engine/rng';
import { circle, grain, hex, linear, mix, radial, ramp, rgb, shade, vignette, voronoi, type Gen } from '../lib';
import { ridges } from './landscapes';

const BAUHAUS = [
  ['#c4000b', '#1f3a93', '#f2b705', '#1a1a1a', '#2f7d5b', '#f07d2b', '#e9dfca'],
  ['#e63946', '#457b9d', '#f1c453', '#1d3557', '#a8dadc', '#f4a261', '#f1faee'],
  ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#1b1b1b', '#efe7d6'],
  ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f78c6b', '#fff5e1'],
];

/** A grid of geometric tiles in the Bauhaus tradition. */
export function bauhaus(g: Gen) {
  const { c, W, H, rnd } = g;
  const pal = BAUHAUS[g.v % BAUHAUS.length];
  const paper = pal[pal.length - 1];
  c.fillStyle = paper; c.fillRect(0, 0, W, H);
  const cols = 9 + (g.v % 2) * 3, s = W / cols, rows = Math.ceil(H / s);
  const pick = (not?: string) => { let v; do v = pal[Math.floor(rnd() * (pal.length - 1))]; while (v === not); return v; };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * s, y = j * s;
    const bg = rnd() < 0.35 ? paper : pick();
    const fg = pick(bg), fg2 = pick(fg);
    c.fillStyle = bg; c.fillRect(x, y, s + 1, s + 1);
    c.save(); c.beginPath(); c.rect(x, y, s, s); c.clip(); c.fillStyle = fg;
    const k = Math.floor(rnd() * 10);
    const cx = x + s / 2, cy = y + s / 2;
    if (k === 0) { circle(c, cx, cy, s * 0.36); c.fill(); c.fillStyle = fg2; circle(c, cx, cy, s * 0.14); c.fill(); }
    else if (k === 1) { circle(c, x + (rnd() < 0.5 ? 0 : s), y + (rnd() < 0.5 ? 0 : s), s); c.fill(); }
    else if (k === 2) { c.beginPath(); c.arc(cx, y + s, s / 2, Math.PI, 0); c.fill(); c.fillStyle = fg2; c.fillRect(x, y + s * 0.12, s, s * 0.12); }
    else if (k === 3) { c.beginPath(); c.moveTo(x, y + s); c.lineTo(x + s, y + s); c.lineTo(x + (rnd() < 0.5 ? 0 : s), y); c.fill(); }
    else if (k === 4) { for (let q = 0; q < 5; q++) c.fillRect(x + s * 0.1 + q * s * 0.17, y + s * 0.1, s * 0.09, s * 0.8); }
    else if (k === 5) { c.lineWidth = s * 0.06; c.strokeStyle = fg; for (let q = 1; q <= 4; q++) { circle(c, cx, cy, q * s * 0.1); c.stroke(); } }
    else if (k === 6) { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { circle(c, x + s * (0.22 + a * 0.28), y + s * (0.22 + b * 0.28), s * 0.08); c.fill(); } }
    else if (k === 7) { c.translate(cx, cy); c.rotate(Math.PI / 4); c.fillRect(-s * 0.26, -s * 0.26, s * 0.52, s * 0.52); }
    else if (k === 8) { c.beginPath(); c.arc(x, cy, s / 2, -Math.PI / 2, Math.PI / 2); c.fill(); c.fillStyle = fg2; c.beginPath(); c.arc(x + s, cy, s / 2, Math.PI / 2, Math.PI * 1.5); c.fill(); }
    else { c.fillRect(x, y, s / 2, s / 2); c.fillRect(x + s / 2, y + s / 2, s / 2, s / 2); c.fillStyle = fg2; circle(c, cx, cy, s * 0.18); c.fill(); }
    c.restore();
  }
  c.strokeStyle = '#1a1a1a'; c.lineWidth = W * 0.004;
  circle(c, W * (0.3 + rnd() * 0.4), H * (0.3 + rnd() * 0.4), H * (0.25 + rnd() * 0.15)); c.stroke();
  c.lineWidth = W * 0.007; c.beginPath(); c.moveTo(0, H * (0.6 + rnd() * 0.3)); c.lineTo(W, H * (0.1 + rnd() * 0.3)); c.stroke();
  grain(g, 10);
}

/** Stained glass: Voronoi panes with lead lines and light falling through. */
export function stainedGlass(g: Gen) {
  const { c, W, H, rnd, noise } = g;
  const pals = [
    ['#0b3c5d', '#328cc1', '#d9b310', '#e45f2b', '#7c1d2c', '#2e7d32', '#f2e5b5', '#5b2a86'],
    ['#2b2d42', '#8d99ae', '#ef233c', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0', '#ff006e'],
    ['#1e3d59', '#f5f0e1', '#ff6e40', '#ffc13b', '#2a9d8f', '#6a4c93', '#c9184a', '#80b918'],
  ];
  const pal = pals[g.v % pals.length].map(hex);
  // work at reduced resolution for the cell map, then draw the panes as images
  const sc = 0.5, w = Math.round(W * sc), h = Math.round(H * sc);
  const cell = 34 + (g.v % 3) * 8;
  const v = voronoi(w, h, cell, rnd);
  const colours = new Array(v.count);
  const cx = w * (0.3 + rnd() * 0.4), cy = h * (0.35 + rnd() * 0.3);
  for (let k = 0; k < v.count; k++) {
    // a flower-like rosette: colour by angle and distance from the centre
    const dx = v.sx[k] - cx, dy = v.sy[k] - cy, d = Math.hypot(dx, dy) / Math.hypot(w, h);
    const a = Math.atan2(dy, dx);
    const band = Math.floor(d * 9 + Math.sin(a * 6) * 0.5 + noise.n2(v.sx[k] * 0.01, v.sy[k] * 0.01) * 0.8);
    colours[k] = pal[((band % pal.length) + pal.length) % pal.length];
  }
  const img = new ImageData(w, h);
  const lead = 2.2;
  for (let i = 0; i < w * h; i++) {
    const k = v.id[i], e = v.edge[i];
    const x = i % w, y = (i / w) | 0;
    const col = colours[k];
    const shine = 0.75 + 0.35 * noise.fbm(x * 0.02, y * 0.02, 3) + 0.25 * Math.max(0, 1 - Math.hypot(x - w * 0.3, y - h * 0.2) / (w * 0.8));
    const o = i * 4;
    if (e < lead) { const dk = 18 + e * 6; img.data[o] = dk; img.data[o + 1] = dk; img.data[o + 2] = dk + 4; }
    else {
      const edgeLight = Math.min(1, (e - lead) / 6);
      const k2 = shine * (0.7 + 0.3 * edgeLight);
      img.data[o] = Math.min(255, col[0] * k2); img.data[o + 1] = Math.min(255, col[1] * k2); img.data[o + 2] = Math.min(255, col[2] * k2);
    }
    img.data[o + 3] = 255;
  }
  const tmp = g.makeCanvas(w, h);
  tmp.c.putImageData(img, 0, 0);
  c.imageSmoothingQuality = 'high';
  c.drawImage(tmp.canvas as CanvasImageSource, 0, 0, W, H);
  // glass texture: faint streaks and bubbles
  c.save(); c.globalCompositeOperation = 'soft-light';
  for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(255,255,255,${rnd() * 0.25})`; circle(c, rnd() * W, rnd() * H, 1 + rnd() * 4); c.fill(); }
  c.restore();
  c.fillStyle = radial(c, W * 0.3, H * 0.15, 0, W * 0.8, [[0, 'rgba(255,250,230,.18)'], [1, 'rgba(255,250,230,0)']]);
  c.fillRect(0, 0, W, H);
  grain(g, 8);
  vignette(g, 0.3);
}

/** Low-poly landscape: a mountain scene re-drawn as flat-shaded triangles. */
export function lowpoly(g: Gen) {
  const { c, W, H, rnd } = g;
  // Paint a mountain scene small, then sample it triangle by triangle.
  const sw = 480, sh = Math.round(480 * H / W);
  const src = g.makeCanvas(sw, sh);
  ridges({ ...g, c: src.c, W: sw, H: sh, v: [0, 3, 4, 5, 1][g.v % 5], rnd: mulberry32(Math.floor(rnd() * 1e9)) });
  const px = src.c.getImageData(0, 0, sw, sh).data;
  const sample = (x: number, y: number): [number, number, number] => {
    const ix = Math.max(0, Math.min(sw - 1, Math.round((x / W) * sw))), iy = Math.max(0, Math.min(sh - 1, Math.round((y / H) * sh)));
    const i = (iy * sw + ix) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  };
  const n = 34 + (g.v % 2) * 10, m = Math.round(n * H / W);
  const pts: [number, number][][] = [];
  for (let j = 0; j <= m; j++) {
    pts[j] = [];
    for (let i = 0; i <= n; i++) {
      const jx = i > 0 && i < n ? (rnd() - 0.5) * 0.85 : 0, jy = j > 0 && j < m ? (rnd() - 0.5) * 0.85 : 0;
      pts[j][i] = [((i + jx) / n) * W, ((j + jy) / m) * H];
    }
  }
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const a = pts[j][i], b = pts[j][i + 1], cc = pts[j + 1][i + 1], d = pts[j + 1][i];
    const tris = rnd() < 0.5 ? [[a, b, cc], [a, cc, d]] : [[a, b, d], [b, cc, d]];
    for (const t of tris) {
      const mx = (t[0][0] + t[1][0] + t[2][0]) / 3, my = (t[0][1] + t[1][1] + t[2][1]) / 3;
      // facet lighting: triangles facing up-left are lighter
      const nx = (t[1][1] - t[0][1]) * (t[2][0] - t[0][0]) - (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]);
      const col = shade(sample(mx, my), Math.sign(nx) * 0.05 + (rnd() - 0.5) * 0.1);
      c.fillStyle = rgb(col); c.strokeStyle = rgb(col); c.lineWidth = 1;
      c.beginPath(); c.moveTo(...t[0]); c.lineTo(...t[1]); c.lineTo(...t[2]); c.closePath(); c.fill(); c.stroke();
    }
  }
  grain(g, 5);
}

/** Memphis-style pattern: confetti shapes, squiggles and grids on pastel. */
export function memphis(g: Gen) {
  const { c, W, H, rnd } = g;
  const pals = [
    { bg: '#fdf0e6', ink: '#1b1b1b', cols: ['#ff6f91', '#ffc75f', '#00c9a7', '#845ec2', '#4d8af0', '#ff9671'] },
    { bg: '#e8f4f8', ink: '#1d1d3d', cols: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c'] },
    { bg: '#1d1d2b', ink: '#f5f5f5', cols: ['#f72585', '#4cc9f0', '#ffd60a', '#80ffdb', '#ff9e00', '#b5179e'] },
  ];
  const P = pals[g.v % pals.length];
  c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
  const u = W / 100;
  // big background blobs
  for (let i = 0; i < 9; i++) {
    c.fillStyle = rgb(hex(P.cols[i % P.cols.length]), 0.9);
    const x = rnd() * W, y = rnd() * H, r = u * (6 + rnd() * 10);
    const k = rnd();
    if (k < 0.4) { circle(c, x, y, r); c.fill(); }
    else if (k < 0.7) { c.save(); c.translate(x, y); c.rotate(rnd() * 3); c.fillRect(-r, -r * 0.6, r * 2, r * 1.2); c.restore(); }
    else { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y + r * 0.8); c.lineTo(x - r, y + r * 0.8); c.fill(); }
  }
  // dot grids and stripes
  for (let i = 0; i < 7; i++) {
    const x = rnd() * W, y = rnd() * H, n = 4 + Math.floor(rnd() * 5);
    c.fillStyle = P.ink;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { circle(c, x + a * u * 1.6, y + b * u * 1.6, u * 0.35); c.fill(); }
  }
  for (let i = 0; i < 6; i++) {
    c.save(); c.translate(rnd() * W, rnd() * H); c.rotate(rnd() * Math.PI);
    c.fillStyle = P.cols[Math.floor(rnd() * P.cols.length)];
    for (let k = 0; k < 6; k++) c.fillRect(k * u * 1.4, 0, u * 0.6, u * 8);
    c.restore();
  }
  // confetti shapes, outlined
  for (let i = 0; i < 160; i++) {
    const x = rnd() * W, y = rnd() * H, s = u * (1 + rnd() * 3.2), col = P.cols[Math.floor(rnd() * P.cols.length)];
    c.save(); c.translate(x, y); c.rotate(rnd() * Math.PI * 2);
    c.lineWidth = u * 0.35; c.strokeStyle = P.ink; c.fillStyle = col;
    const k = Math.floor(rnd() * 6);
    if (k === 0) { circle(c, 0, 0, s * 0.5); c.fill(); c.stroke(); }
    else if (k === 1) { c.beginPath(); c.moveTo(0, -s * 0.6); c.lineTo(s * 0.55, s * 0.4); c.lineTo(-s * 0.55, s * 0.4); c.closePath(); c.fill(); c.stroke(); }
    else if (k === 2) { c.beginPath(); c.moveTo(-s, 0); for (let q = 0; q <= 8; q++) c.lineTo(-s + (q / 8) * s * 2, (q % 2 ? -1 : 1) * s * 0.3); c.strokeStyle = col; c.lineWidth = u * 0.6; c.stroke(); }
    else if (k === 3) { c.fillRect(-s * 0.5, -s * 0.5, s, s); c.strokeRect(-s * 0.5, -s * 0.5, s, s); }
    else if (k === 4) { c.beginPath(); c.arc(0, 0, s * 0.6, 0, Math.PI); c.strokeStyle = col; c.lineWidth = u * 0.7; c.stroke(); }
    else { c.fillRect(-s, -u * 0.35, s * 2, u * 0.7); c.fillRect(-u * 0.35, -s, u * 0.7, s * 2); }
    c.restore();
  }
  grain(g, 8);
}

/** A kaleidoscope mandala with twelve-fold symmetry. */
export function kaleido(g: Gen) {
  const { c, W, H, rnd } = g;
  const pals = [
    ['#0b132b', '#1c2541', '#3a506b', '#5bc0be', '#ffd166', '#ef476f', '#f6f5ae'],
    ['#22092c', '#872341', '#be3144', '#f05941', '#ffc947', '#f6f1e9', '#3fa796'],
    ['#03071e', '#370617', '#9d0208', '#e85d04', '#faa307', '#ffba08', '#90e0ef'],
    ['#10002b', '#3c096c', '#7b2cbf', '#c77dff', '#e0aaff', '#80ffdb', '#ffd6ff'],
  ];
  const pal = pals[g.v % pals.length];
  c.fillStyle = radial(c, W / 2, H / 2, 0, W * 0.7, [[0, pal[1]], [1, pal[0]]]);
  c.fillRect(0, 0, W, H);
  const R = Math.hypot(W, H) / 2;
  const seg = 12;
  const wedge = g.makeCanvas(Math.ceil(R), Math.ceil(R));
  const wc = wedge.c;
  const r2 = mulberry32(Math.floor(rnd() * 1e9));
  for (let i = 0; i < 260; i++) {
    const d = Math.pow(r2(), 0.8) * R, a = r2() * (Math.PI / seg);
    const x = Math.cos(a) * d, y = Math.sin(a) * d, s = 6 + r2() * (18 + d * 0.06);
    wc.fillStyle = rgb(hex(pal[2 + Math.floor(r2() * (pal.length - 2))]), 0.55 + r2() * 0.45);
    const k = r2();
    wc.save(); wc.translate(x, y); wc.rotate(r2() * Math.PI);
    if (k < 0.4) { circle(wc, 0, 0, s * 0.5); wc.fill(); }
    else if (k < 0.7) { wc.beginPath(); wc.ellipse(0, 0, s, s * 0.3, 0, 0, Math.PI * 2); wc.fill(); }
    else { wc.beginPath(); wc.moveTo(0, -s * 0.7); wc.lineTo(s * 0.6, s * 0.4); wc.lineTo(-s * 0.6, s * 0.4); wc.fill(); }
    wc.restore();
  }
  c.save(); c.translate(W / 2, H / 2);
  for (let k = 0; k < seg * 2; k++) {
    c.save();
    c.rotate((k >> 1) * (Math.PI * 2 / seg));
    if (k & 1) c.scale(1, -1);
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, 0, Math.PI / seg + 0.002); c.closePath(); c.clip();
    c.drawImage(wedge.canvas as CanvasImageSource, 0, 0);
    c.restore();
  }
  // rings
  for (let k = 1; k < 9; k++) {
    c.strokeStyle = rgb(hex(pal[pal.length - 1]), 0.15 + 0.05 * (k % 3)); c.lineWidth = 2 + (k % 2) * 3;
    circle(c, 0, 0, k * H * 0.07); c.stroke();
  }
  c.restore();
  grain(g, 7);
  vignette(g, 0.3);
}

/** Marbled paper: swirling bands of colour with gold veins. Hard: few hard edges. */
export function marble(g: Gen) {
  const { c, W, H, rnd, noise } = g;
  const pals = [
    ['#0d1b2a', '#1b263b', '#415a77', '#778da9', '#e0e1dd', '#d4af37'],
    ['#2d0f1f', '#6d213c', '#c44569', '#f8b195', '#f6e7d8', '#e0b04e'],
    ['#06241f', '#0e5e4e', '#2fa38c', '#a8e6cf', '#f7f7f2', '#c9a227'],
    ['#140c2c', '#3a2a6e', '#7c6bd6', '#c2b8ff', '#f4f1ff', '#e9c46a'],
  ];
  const pal = pals[g.v % pals.length];
  const stops = pal.slice(0, 5);
  const gold = hex(pal[5]);
  const sc = 0.5, w = Math.round(W * sc), h = Math.round(H * sc);
  const img = new ImageData(w, h);
  const ox = rnd() * 100, oy = rnd() * 100, freq = 2.2 + rnd();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x / w) * freq + ox, v = (y / h) * freq * (H / W) + oy;
    const q1 = noise.fbm(u, v, 4), q2 = noise.fbm(u + 5.2, v + 1.3, 4);
    const r1 = noise.fbm(u + 3 * q1 + 1.7, v + 3 * q2 + 9.2, 4);
    const t = (Math.sin((r1 * 4 + u * 0.3) * Math.PI) + 1) / 2;
    let col = ramp(stops, t);
    const vein = Math.abs(Math.sin((r1 * 9 + q1 * 3) * Math.PI));
    if (vein < 0.06) col = mix(col, gold, (0.06 - vein) / 0.06);
    const i = (y * w + x) * 4;
    img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
  }
  const tmp = g.makeCanvas(w, h);
  tmp.c.putImageData(img, 0, 0);
  c.imageSmoothingQuality = 'high';
  c.drawImage(tmp.canvas as CanvasImageSource, 0, 0, W, H);
  c.fillStyle = linear(c, 0, 0, W, H, [[0, 'rgba(255,255,255,.08)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.12)']]);
  c.fillRect(0, 0, W, H);
  grain(g, 9);
}

/** Japanese wave pattern (seigaiha) with a few gold accents. */
export function seigaiha(g: Gen) {
  const { c, W, H, rnd } = g;
  const pals = [
    ['#0b2545', '#13315c', '#8da9c4', '#eef4ed', '#d4af37'],
    ['#3d0c11', '#7a1c25', '#d9a5a0', '#f7ede2', '#e9c46a'],
    ['#073b3a', '#0b6e4f', '#9ad1b3', '#f1f7ed', '#f2c14e'],
  ];
  const P = pals[g.v % pals.length];
  c.fillStyle = P[0]; c.fillRect(0, 0, W, H);
  const r = W / (18 + (g.v % 2) * 6);
  for (let row = -1; row * r * 0.5 < H + r; row++) {
    const y = row * r * 0.5;
    const off = row % 2 ? r : 0;
    for (let x = -r * 2 + off; x < W + r * 2; x += r * 2) {
      const accent = rnd() < 0.05;
      for (let k = 5; k >= 1; k--) {
        const rr = (r * k) / 5;
        c.fillStyle = k % 2 ? (accent ? P[4] : P[1 + (k % 3 === 0 ? 1 : 0)]) : P[3];
        if (k === 5) c.fillStyle = accent ? P[4] : P[1];
        c.beginPath(); c.arc(x, y + r, rr, Math.PI, 0); c.closePath(); c.fill();
      }
    }
  }
  // drifting gold petals
  for (let i = 0; i < 60; i++) {
    c.save(); c.translate(rnd() * W, rnd() * H); c.rotate(rnd() * Math.PI * 2);
    c.fillStyle = rgb(hex(P[4]), 0.9); c.beginPath(); c.ellipse(0, 0, r * 0.18, r * 0.08, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  grain(g, 9);
  vignette(g, 0.25);
}

/** Patchwork quilt of half-square triangles, stars and stripes. */
export function quilt(g: Gen) {
  const { c, W, H, rnd } = g;
  const pals = [
    ['#2b4162', '#385f71', '#f5f0f6', '#d7b377', '#8f754f', '#b5445c'],
    ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#fffcf2'],
    ['#6d597a', '#b56576', '#e56b6f', '#eaac8b', '#355070', '#f8f4e3'],
  ];
  const pal = pals[g.v % pals.length];
  const n = 10 + (g.v % 2) * 2, s = W / n, m = Math.ceil(H / s);
  c.fillStyle = pal[pal.length - 1]; c.fillRect(0, 0, W, H);
  const p = (not?: string) => { let v; do v = pal[Math.floor(rnd() * pal.length)]; while (v === not); return v; };
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const x = i * s, y = j * s, a = p(), b = p(a);
    const k = Math.floor(rnd() * 4);
    c.save(); c.beginPath(); c.rect(x, y, s, s); c.clip();
    if (k === 0) {
      for (let q = 0; q < 4; q++) {
        const qx = x + (q % 2) * s / 2, qy = y + Math.floor(q / 2) * s / 2, h = s / 2;
        c.fillStyle = a; c.fillRect(qx, qy, h, h);
        c.fillStyle = b; c.beginPath();
        if ((q + i + j) % 2) { c.moveTo(qx, qy); c.lineTo(qx + h, qy); c.lineTo(qx, qy + h); } else { c.moveTo(qx + h, qy); c.lineTo(qx + h, qy + h); c.lineTo(qx, qy); }
        c.fill();
      }
    } else if (k === 1) {
      c.fillStyle = a; c.fillRect(x, y, s, s);
      c.fillStyle = b;
      const cx = x + s / 2, cy = y + s / 2;
      c.beginPath();
      for (let q = 0; q < 16; q++) { const r = q % 2 ? s * 0.18 : s * 0.46; const ang = (q / 16) * Math.PI * 2; c.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); }
      c.fill();
      c.fillStyle = p(b); circle(c, cx, cy, s * 0.12); c.fill();
    } else if (k === 2) {
      for (let q = 0; q < 6; q++) { c.fillStyle = q % 2 ? a : b; c.fillRect(x, y + (q * s) / 6, s, s / 6 + 1); }
    } else {
      c.fillStyle = a; c.fillRect(x, y, s, s);
      c.fillStyle = b; c.fillRect(x + s * 0.2, y + s * 0.2, s * 0.6, s * 0.6);
      c.fillStyle = p(b); c.fillRect(x + s * 0.38, y + s * 0.38, s * 0.24, s * 0.24);
    }
    // fabric texture
    c.strokeStyle = 'rgba(0,0,0,.05)'; c.lineWidth = 1;
    for (let q = 0; q < s; q += 3) { c.beginPath(); c.moveTo(x + q, y); c.lineTo(x + q, y + s); c.stroke(); }
    c.restore();
    // stitches
    c.setLineDash([6, 5]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5;
    c.strokeRect(x + 4, y + 4, s - 8, s - 8); c.setLineDash([]);
  }
  c.fillStyle = 'rgba(0,0,0,.06)';
  for (let i = 0; i <= n; i++) c.fillRect(i * s - 1, 0, 2, H);
  for (let j = 0; j <= m; j++) c.fillRect(0, j * s - 1, W, 2);
  grain(g, 10);
  vignette(g, 0.18);
}
