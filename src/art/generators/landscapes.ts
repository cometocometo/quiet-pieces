import { birds, circle, cloud, fillRidge, rays, stratus, glow, grain, hex, linear, mix, pine, radial, ramp, rgb, ridgeline, shade, stars, vignette, type Gen, type RGB } from '../lib';

interface SkyTheme {
  sky: string[];          // top → horizon
  sun: [string, string];  // sun top/bottom
  far: string; near: string;
  haze: string;
  stars: number;
  moon?: boolean;
  snow?: boolean;
  cloudTop: string; cloudBottom: string;
}

const THEMES: SkyTheme[] = [
  { sky: ['#120c2c', '#4d2764', '#d4615a', '#ffc87c'], sun: ['#fff3b5', '#ff6a5c'], far: '#bf5c80', near: '#140a20', haze: '#ffab8a', stars: 380, cloudTop: '#ffb59a', cloudBottom: '#7b3a6a' },
  { sky: ['#5c7fb8', '#a9b8de', '#f6c6c4', '#ffe7c2'], sun: ['#fffbe6', '#ffd29c'], far: '#9aa6cf', near: '#2c3352', haze: '#ffe1d4', stars: 0, cloudTop: '#ffffff', cloudBottom: '#d7b9c9' },
  { sky: ['#030712', '#0b1a3a', '#1d3b6a', '#3e6a9a'], sun: ['#ffffff', '#cfe3ff'], far: '#33507c', near: '#040a16', haze: '#7fa4d6', stars: 900, moon: true, cloudTop: '#5d7fae', cloudBottom: '#1a2c4e' },
  { sky: ['#9fc4d9', '#c7dde6', '#e8efef', '#f3efe4'], sun: ['#ffffff', '#fff6dc'], far: '#a9c0cc', near: '#28434f', haze: '#ffffff', stars: 0, snow: true, cloudTop: '#ffffff', cloudBottom: '#c3d6df' },
  { sky: ['#2a1b3d', '#a34d4f', '#f0954e', '#ffd88a'], sun: ['#fff6c8', '#ff8a3d'], far: '#c36a4a', near: '#2a120c', haze: '#ffc07a', stars: 120, cloudTop: '#ffcf8f', cloudBottom: '#93424a' },
  { sky: ['#1b2f4b', '#3f6f8f', '#9cc5c9', '#f4e3b8'], sun: ['#fffde8', '#ffe39a'], far: '#5d8a8e', near: '#0f2526', haze: '#e9f1d8', stars: 60, snow: true, cloudTop: '#f8f3e4', cloudBottom: '#6d8e9c' },
];

/** Layered mountain ranges at different times of day. */
export function ridges(g: Gen) {
  const { c, W, H, rnd } = g;
  const T = THEMES[g.v % THEMES.length];
  const horizon = H * 0.62;
  c.fillStyle = linear(c, 0, 0, 0, horizon, T.sky.map((s, i) => [i / (T.sky.length - 1), s] as [number, string]));
  c.fillRect(0, 0, W, H);
  if (T.stars) stars(g, T.stars, horizon * 0.85);

  const sx = W * (0.25 + rnd() * 0.5), sy = H * (0.28 + rnd() * 0.22), sr = H * (T.moon ? 0.06 : 0.12);
  glow(g, sx, sy, sr * (T.moon ? 7 : 4.5), hex(T.sun[1]), T.moon ? 0.35 : 0.55);
  if (T.moon) {
    c.fillStyle = radial(c, sx - sr * 0.3, sy - sr * 0.3, 0, sr * 1.2, [[0, '#ffffff'], [1, '#d7e4f5']]);
    circle(c, sx, sy, sr); c.fill();
    c.fillStyle = 'rgba(150,170,200,.35)';
    for (let i = 0; i < 9; i++) { circle(c, sx + (rnd() - 0.5) * sr * 1.3, sy + (rnd() - 0.5) * sr * 1.3, sr * (0.08 + rnd() * 0.16)); c.fill(); }
  } else {
    c.fillStyle = linear(c, 0, sy - sr, 0, sy + sr, [[0, T.sun[0]], [1, T.sun[1]]]);
    circle(c, sx, sy, sr); c.fill();
  }
  const evening = T.stars > 0 && !T.moon;
  if (evening || T.moon) {
    for (let i = 0; i < 14; i++) {
      const y = H * (0.08 + rnd() * 0.42);
      stratus(g, rnd() * W, y, W * (0.12 + rnd() * 0.3), H * (0.012 + rnd() * 0.02), T.cloudTop, T.cloudBottom, 0.35 + rnd() * 0.5, y > sy);
    }
  } else {
    for (let i = 0; i < 6; i++) cloud(g, rnd() * W, H * (0.1 + rnd() * 0.3), W * (0.1 + rnd() * 0.14), T.cloudTop, T.cloudBottom, 0.5 + rnd() * 0.45);
  }
  if (!T.moon) rays(g, sx, sy, hex(T.sun[0]), 10, 0.05);
  if (!T.moon) birds(g, W * (0.3 + rnd() * 0.4), H * (0.3 + rnd() * 0.1), 9, W * 0.006, rgb(shade(hex(T.near), 0.1), 0.8));

  const layers = 6;
  const far = hex(T.far), near = hex(T.near), haze = hex(T.haze);
  for (let l = 0; l < layers; l++) {
    const t = l / (layers - 1);
    const col = mix(far, near, Math.pow(t, 0.8));
    const base = H * (0.5 + l * 0.085), amp = H * (0.22 - l * 0.024);
    const r = ridgeline(512, 0.42 + l * 0.03, rnd);
    fillRidge(g, r, base, amp, linear(c, 0, base - amp, 0, H, [[0, rgb(col)], [1, rgb(shade(col, -0.45))]]));
    if (T.snow && l < 2) {
      // snowcaps: lighten the top of the range
      c.save();
      c.beginPath(); c.moveTo(0, H);
      for (let i = 0; i <= 512; i++) c.lineTo((i / 512) * W, base - r[i] * amp);
      c.lineTo(W, H); c.closePath(); c.clip();
      c.fillStyle = linear(c, 0, base - amp, 0, base - amp * 0.45, [[0, 'rgba(255,255,255,.95)'], [1, 'rgba(255,255,255,0)']]);
      c.fillRect(0, base - amp, W, amp);
      c.restore();
    }
    c.fillStyle = linear(c, 0, base - amp * 0.3, 0, base + H * 0.08, [[0, rgb(haze, 0)], [1, rgb(haze, 0.22 * (1 - t))]]);
    c.fillRect(0, base - amp * 0.3, W, H * 0.12 + amp * 0.3);
    if (l >= layers - 2) {
      c.fillStyle = rgb(shade(col, -0.5));
      const n = l === layers - 1 ? 110 : 60;
      for (let i = 0; i < n; i++) {
        const x = rnd() * W, xi = Math.round((x / W) * 512);
        const y = base - r[xi] * amp + amp * 0.05 + rnd() * H * 0.03;
        pine(c, x, y, H * (0.025 + rnd() * 0.05) * (l === layers - 1 ? 1.4 : 1));
      }
    }
  }
  grain(g, 9);
  vignette(g, 0.22);
}

/** Mountains mirrored in a still lake with a pine shoreline. */
export function lake(g: Gen) {
  const { c, W, H, rnd } = g;
  const T = THEMES[(g.v + 1) % THEMES.length];
  const shore = H * 0.6;
  const top = g.makeCanvas(W, Math.ceil(shore));
  const tg: Gen = { ...g, c: top.c, H: shore };
  const tc = top.c;
  tc.fillStyle = linear(tc, 0, 0, 0, shore, T.sky.map((s, i) => [i / (T.sky.length - 1), s] as [number, string]));
  tc.fillRect(0, 0, W, shore);
  if (T.stars) stars(tg, T.stars * 0.7, shore * 0.8);
  const sx = W * (0.3 + rnd() * 0.4), sy = shore * (0.35 + rnd() * 0.2), sr = H * (T.moon ? 0.05 : 0.09);
  glow(tg, sx, sy, sr * 5, hex(T.sun[1]), 0.5);
  tc.fillStyle = linear(tc, 0, sy - sr, 0, sy + sr, [[0, T.sun[0]], [1, T.sun[1]]]);
  circle(tc, sx, sy, sr); tc.fill();
  for (let i = 0; i < 10; i++) stratus(tg, rnd() * W, shore * (0.1 + rnd() * 0.4), W * (0.12 + rnd() * 0.25), H * (0.01 + rnd() * 0.018), T.cloudTop, T.cloudBottom, 0.35 + rnd() * 0.5);
  const far = hex(T.far), near = hex(T.near);
  for (let l = 0; l < 4; l++) {
    const t = l / 3, col = mix(far, near, t * 0.85);
    const base = shore * (0.72 + l * 0.08), amp = shore * (0.42 - l * 0.08);
    const r = ridgeline(256, 0.45 + l * 0.04, rnd);
    fillRidge(tg, r, base, amp, linear(tc, 0, base - amp, 0, shore, [[0, rgb(col)], [1, rgb(shade(col, -0.35))]]));
    if (T.snow && l === 0) {
      tc.save(); tc.globalCompositeOperation = 'source-atop';
      tc.fillStyle = linear(tc, 0, base - amp, 0, base - amp * 0.5, [[0, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]);
      tc.fillRect(0, 0, W, shore); tc.restore();
    }
  }
  tc.fillStyle = rgb(shade(near, -0.3));
  for (let i = 0; i < 160; i++) pine(tc, rnd() * W, shore + 2, H * (0.03 + rnd() * 0.07));
  c.drawImage(top.canvas as CanvasImageSource, 0, 0);
  // reflection, squashed and darkened, with ripples
  c.save();
  c.translate(0, shore * 2); c.scale(1, -1);
  c.globalAlpha = 0.85;
  for (let y = 0; y < shore; y += 3) {
    const off = Math.sin(y * 0.08) * 3 + (rnd() - 0.5) * 2;
    c.drawImage(top.canvas as CanvasImageSource, 0, y, W, 3, off, y, W, 3);
  }
  c.restore();
  c.fillStyle = linear(c, 0, shore, 0, H, [[0, rgb(near, 0.25)], [1, rgb(shade(near, -0.4), 0.85)]]);
  c.fillRect(0, shore, W, H - shore);
  c.strokeStyle = rgb(hex(T.haze), 0.22); c.lineWidth = 1.5;
  for (let i = 0; i < 140; i++) {
    const y = shore + Math.pow(rnd(), 1.6) * (H - shore), w = W * (0.02 + rnd() * 0.08) * (1 + (y - shore) / H);
    const x = rnd() * W;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke();
  }
  grain(g, 8);
  vignette(g, 0.25);
}

/** Sand dunes with sharp crests: one slope in sun, the other in shade. */
export function dunes(g: Gen) {
  const { c, W, H, rnd } = g;
  const PALS = [
    { sky: ['#f6d9a6', '#f1b37a', '#e88b5f'], lit: ['#ffd497', '#f0a965', '#c9733f'], shade: ['#d98654', '#a2502f', '#5e2414'], sun: '#fff1c9', night: false },
    { sky: ['#1f2a55', '#7e4f86', '#f2a47a'], lit: ['#f6b98a', '#df8c63', '#a2503e'], shade: ['#9d4f57', '#6a2c41', '#2c1328'], sun: '#ffe3b0', night: false },
    { sky: ['#8ccbe6', '#cfe7ee', '#f7ead2'], lit: ['#fbe3b4', '#f0c27f', '#d7924f'], shade: ['#dca06a', '#b26d3b', '#7a4322'], sun: '#ffffff', night: false },
    { sky: ['#050b24', '#13235a', '#2b4c8a'], lit: ['#8fa3d6', '#5d73b0', '#34457a'], shade: ['#4a5b94', '#2b3766', '#121a3a'], sun: '#f4f6ff', night: true },
    { sky: ['#f7c6d0', '#fbd9c9', '#fff0dc'], lit: ['#ffe2d2', '#f7bfa8', '#e0937e'], shade: ['#e7a493', '#c47466', '#8a4a4a'], sun: '#fffaf0', night: false },
    { sky: ['#5fb7c9', '#a8dde0', '#eef7f0'], lit: ['#ffffff', '#eef0ea', '#d6dcd6'], shade: ['#c4d6d8', '#9ab4ba', '#6d8a94'], sun: '#ffffff', night: false },
    { sky: ['#e9a65a', '#d9733f', '#8e3b2a'], lit: ['#e88a55', '#c9603a', '#8f3a24'], shade: ['#a64a2e', '#7a2e1c', '#40150d'], sun: '#ffe7b0', night: false },
  ];
  const pal = PALS[g.v % PALS.length];
  c.fillStyle = linear(c, 0, 0, 0, H * 0.62, pal.sky.map((col, i) => [i / (pal.sky.length - 1), col] as [number, string]));
  c.fillRect(0, 0, W, H);
  if (pal.night) stars(g, 900, H * 0.6);
  const sx = W * (0.15 + rnd() * 0.7), sy = H * (0.18 + rnd() * 0.22), sr = H * (pal.night ? 0.045 : 0.05 + rnd() * 0.04);
  glow(g, sx, sy, H * (pal.night ? 0.35 : 0.6), hex(pal.sun), pal.night ? 0.3 : 0.55);
  c.fillStyle = pal.sun; circle(c, sx, sy, sr); c.fill();
  if (!pal.night) for (let i = 0; i < 6; i++) stratus(g, rnd() * W, H * (0.08 + rnd() * 0.3), W * (0.1 + rnd() * 0.2), H * 0.012, '#fff4e0', pal.sky[1], 0.35);
  const oasis = g.v % 3 === 1;
  const sunLeft = sx < W / 2;
  const layers = 6;
  for (let l = 0; l < layers; l++) {
    const t = l / (layers - 1);
    const base = H * (0.54 + t * 0.4), amp = H * (0.025 + t * 0.19);
    const lit = rgb(ramp(pal.lit, t)), dark = rgb(ramp(pal.shade, t));
    c.fillStyle = lit;
    c.fillRect(0, base + amp * 0.6, W, H);
    const mounds: number[] = [];
    for (let x = -W * 0.1; x < W * 1.1; x += W * (0.16 + rnd() * 0.18) * (0.6 + t * 0.8)) mounds.push(x);
    const crests: [number, number][] = [];
    for (const xc0 of mounds.sort(() => rnd() - 0.5)) {
      const w = W * (0.38 + rnd() * 0.3) * (0.8 + t * 0.5);
      const xc = xc0, yc = base - amp * (0.35 + rnd() * 0.65);
      const dir = sunLeft ? 1 : -1;               // the steep, shaded side faces away from the sun
      const xw = xc - dir * w * 0.65, xl = xc + dir * w * 0.35;
      const yb = H + 2;
      c.fillStyle = lit;
      c.beginPath(); c.moveTo(xw, yb);
      c.bezierCurveTo(xw + dir * w * 0.3, yb - (yb - yc) * 0.2, xc - dir * w * 0.25, yc, xc, yc);
      c.bezierCurveTo(xc + dir * w * 0.05, yc + (yb - yc) * 0.05, xl - dir * w * 0.2, yb - (yb - yc) * 0.25, xl, yb);
      c.closePath(); c.fill();
      // shaded lee slope: crest → foot, back up along a curve that sweeps under the crest
      c.fillStyle = dark;
      c.beginPath(); c.moveTo(xc, yc);
      c.bezierCurveTo(xc + dir * w * 0.05, yc + (yb - yc) * 0.05, xl - dir * w * 0.2, yb - (yb - yc) * 0.25, xl, yb);
      c.lineTo(xc + dir * w * 0.16, yb);
      c.bezierCurveTo(xc + dir * w * 0.1, yc + (yb - yc) * 0.5, xc + dir * w * 0.02, yc + (yb - yc) * 0.15, xc, yc);
      c.closePath(); c.fill();
      // wind ripples across the sunny slope
      c.strokeStyle = rgb(ramp(pal.shade, t), 0.18); c.lineWidth = 1 + t * 1.2;
      for (let q = 0; q < 8 + t * 16; q++) {
        const u = rnd(), x = xc - dir * w * 0.6 * u, y = yc + (H - yc) * (0.1 + rnd() * 0.5) * (0.3 + u);
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - dir * W * 0.012, y - 2 - t * 3, x - dir * W * (0.025 + t * 0.02), y + 1); c.stroke();
      }
      c.strokeStyle = 'rgba(255,240,215,.4)'; c.lineWidth = 1.2 + t * 1.6;
      c.beginPath(); c.moveTo(xc - dir * w * 0.18, yc + amp * 0.04); c.quadraticCurveTo(xc - dir * w * 0.06, yc, xc + dir * w * 0.01, yc + 1); c.stroke();
      crests.push([xc, yc]);
    }
    if (l === 2 && g.v % 2 === 0) {
      const pk = crests.filter(([x]) => x > W * 0.2 && x < W * 0.8)[0] ?? crests[0];
      c.fillStyle = pal.night ? 'rgba(5,8,20,.9)' : 'rgba(40,18,12,.85)';
      for (let k = 0; k < 3 + (g.v % 3); k++) camel(c, pk[0] - W * 0.08 + k * W * 0.024, pk[1] + amp * 0.12 + k * 3, H * 0.022);
    }
    if (l === 3 && oasis) {
      const ox = W * (0.2 + rnd() * 0.6), oy = base + amp * 0.3;
      c.fillStyle = rgb(mix(hex('#4f9fb3'), hex(pal.sky[2]), 0.3));
      c.beginPath(); c.ellipse(ox, oy, W * 0.08, H * 0.018, 0, 0, Math.PI * 2); c.fill();
      for (let k = 0; k < 6; k++) palmTree(c, ox + (rnd() - 0.5) * W * 0.16, oy - H * 0.005, H * (0.06 + rnd() * 0.05), pal.night ? '#0b1430' : '#2e5a2c', rnd);
    }
  }
  grain(g, 11);
  vignette(g, 0.2);
}

function palmTree(c: Gen['c'], x: number, y: number, h: number, col: string, rnd: () => number) {
  const lean = (rnd() - 0.5) * h * 0.4;
  c.strokeStyle = col; c.lineWidth = h * 0.06; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.2, y - h * 0.5, x + lean, y - h); c.stroke();
  c.fillStyle = col;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.45 + (rnd() - 0.5) * 0.2;
    c.save(); c.translate(x + lean, y - h); c.rotate(a);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(h * 0.25, -h * 0.12, h * 0.45, h * 0.08); c.quadraticCurveTo(h * 0.25, -h * 0.02, 0, 0); c.fill();
    c.restore();
  }
}

function camel(c: Gen['c'], x: number, y: number, s: number) {
  c.beginPath();
  c.ellipse(x, y - s * 0.9, s * 0.7, s * 0.35, 0, 0, Math.PI * 2);
  c.ellipse(x - s * 0.15, y - s * 1.2, s * 0.25, s * 0.25, 0, 0, Math.PI * 2);
  c.fill();
  c.fillRect(x - s * 0.55, y - s * 0.8, s * 0.08, s * 0.8);
  c.fillRect(x + s * 0.45, y - s * 0.8, s * 0.08, s * 0.8);
  c.beginPath(); c.moveTo(x + s * 0.6, y - s * 1); c.lineTo(x + s * 1.0, y - s * 1.5); c.lineTo(x + s * 1.15, y - s * 1.45); c.lineTo(x + s * 0.75, y - s * 0.85); c.fill();
}

/** Patchwork farmland on rolling hills, seen in perspective, with hedgerows, trees and a farm. */
export function fields(g: Gen) {
  const { c, W, H, rnd, noise } = g;
  const pals = [
    ['#e9c46a', '#8ab17d', '#2a9d8f', '#d9a441', '#b5c99a', '#f4a261', '#97a97c', '#6b9b5a'],
    ['#c9a227', '#7a9a3d', '#b4503a', '#e0b85c', '#5d8a3a', '#d98e3f', '#9fb35a', '#8f6b3a'],
    ['#b8d8a0', '#7fb069', '#e6c86e', '#a1c181', '#cfd96b', '#5c946e', '#f2e094', '#c58fb8'],
  ];
  const cols = pals[g.v % pals.length];
  const skyTop = ['#6fa8d0', '#e99a64', '#9cc2e6'][g.v % 3], skyLow = ['#e6f1f5', '#fde0bd', '#f4f1e1'][g.v % 3];
  const horizon = H * 0.36;
  c.fillStyle = linear(c, 0, 0, 0, horizon, [[0, skyTop], [1, skyLow]]);
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) cloud(g, rnd() * W, H * (0.05 + rnd() * 0.2), W * (0.07 + rnd() * 0.12), '#ffffff', mixHexLocal(skyTop, '#ffffff', 0.6), 0.75 + rnd() * 0.25);
  // distant blue hills
  fillRidge(g, ridgelineSmooth(rnd), horizon + H * 0.02, H * 0.06, rgb(mix(hex('#6d8fa6'), hex(skyLow), 0.4)));
  const bands = 7, vpx = W * (0.3 + rnd() * 0.4);
  const tops: number[][] = [];
  for (let l = 0; l < bands; l++) {
    const t = l / (bands - 1);
    const base = horizon + H * 0.05 + (H - horizon) * Math.pow(t, 1.15) * 0.92, amp = H * (0.025 + t * 0.06);
    const ph = rnd() * 50;
    tops.push(Array.from({ length: 101 }, (_, i) => base - amp * (0.5 + 0.5 * noise.fbm(i / 100 * 1.6 + ph, l * 2.3, 3))));
  }
  for (let l = 0; l < bands; l++) {
    const t = l / (bands - 1), top = tops[l];
    const yAt = (x: number) => top[Math.max(0, Math.min(100, Math.round((x / W) * 100)))];
    const haze = (1 - t) * 0.5;
    const depth = (l < bands - 1 ? (tops[l + 1][50] - top[50]) : H * 0.2) + H * 0.04;
    c.save();
    c.beginPath(); c.moveTo(0, H); top.forEach((y, i) => c.lineTo((i / 100) * W, y)); c.lineTo(W, H); c.closePath(); c.clip();
    // columns of fields with edges pointing away from a vanishing point above the horizon
    const xs: number[] = [];
    for (let x = -W * 0.2; x < W * 1.2; x += W * (0.05 + rnd() * 0.07) * (0.5 + t * 0.9)) xs.push(x);
    const spread = 0.35 + t * 0.9;
    const P = (x: number, d: number): [number, number] => { const y0 = yAt(x); return [x + ((x - vpx) / W) * spread * d * 2.2, y0 + d]; };
    for (let k = 0; k < xs.length - 1; k++) {
      const cuts = [0, depth * (0.3 + rnd() * 0.3), depth * 1.4];
      if (rnd() < 0.5) cuts.splice(1, 1);
      for (let q = 0; q < cuts.length - 1; q++) {
        const a = P(xs[k], cuts[q]), b = P(xs[k + 1], cuts[q]), cc = P(xs[k + 1], cuts[q + 1]), d = P(xs[k], cuts[q + 1]);
        const base = mix(hex(cols[Math.floor(rnd() * cols.length)]), hex(skyLow), haze);
        c.fillStyle = rgb(base);
        c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...cc); c.lineTo(...d); c.closePath(); c.fill();
        // crop rows, either along the column or across it
        c.save(); c.clip();
        c.strokeStyle = rgb(shade(base, rnd() < 0.5 ? -0.12 : 0.1), 0.6); c.lineWidth = 0.8 + t * 1.6;
        const rows = 5 + Math.floor(rnd() * 9);
        if (rnd() < 0.55) {
          for (let r = 1; r < rows; r++) { const u = r / rows; c.beginPath(); c.moveTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); c.lineTo(d[0] + (cc[0] - d[0]) * u, d[1] + (cc[1] - d[1]) * u); c.stroke(); }
        } else {
          for (let r = 1; r < rows; r++) { const u = r / rows; c.beginPath(); c.moveTo(a[0] + (d[0] - a[0]) * u, a[1] + (d[1] - a[1]) * u); c.lineTo(b[0] + (cc[0] - b[0]) * u, b[1] + (cc[1] - b[1]) * u); c.stroke(); }
        }
        c.restore();
        // hedgerow along the lower edge
        c.strokeStyle = rgb(mix(hex('#2f5228'), hex(skyLow), haze)); c.lineWidth = 1.5 + t * 4;
        c.beginPath(); c.moveTo(...d); c.lineTo(...cc); c.stroke();
      }
      const top0 = P(xs[k + 1], 0), bot = P(xs[k + 1], depth * 1.4);
      c.strokeStyle = rgb(mix(hex('#2f5228'), hex(skyLow), haze)); c.lineWidth = 1.5 + t * 4;
      c.beginPath(); c.moveTo(...top0); c.lineTo(...bot); c.stroke();
      // trees dotted along some hedgerows
      if (rnd() < 0.45) {
        const n = 2 + Math.floor(rnd() * 5);
        for (let q = 0; q < n; q++) tree(c, top0[0] + (bot[0] - top0[0]) * (q / n), top0[1] + (bot[1] - top0[1]) * (q / n), H * (0.006 + t * 0.014), mix(hex('#2c5530'), hex(skyLow), haze));
      }
    }
    c.restore();
    // trees along the crest
    for (let k = 0; k < 10 + l * 3; k++) { const x = rnd() * W; tree(c, x, yAt(x) + 1, H * (0.005 + t * 0.013) * (0.7 + rnd() * 0.6), mix(hex('#284d2b'), hex(skyLow), haze)); }
    if (l === 3) { const fx = W * (0.15 + rnd() * 0.6); farmhouse(c, fx, yAt(fx) + H * 0.035, H * 0.045, rnd); }
  }
  grain(g, 9);
  vignette(g, 0.2);
}

function tree(c: Gen['c'], x: number, y: number, r: number, col: RGB) {
  c.fillStyle = rgb(shade(col, -0.35)); circle(c, x + r * 0.35, y - r * 0.55, r); c.fill();
  c.fillStyle = rgb(col); circle(c, x, y - r * 0.8, r); c.fill();
  c.fillStyle = rgb(shade(col, 0.18)); circle(c, x - r * 0.35, y - r * 1.15, r * 0.5); c.fill();
}
const ridgelineSmooth = (rnd: () => number) => ridgeline(128, 0.45, rnd);
const mixHexLocal = (a: string, b: string, t: number) => rgb(mix(hex(a), hex(b), t));

function farmhouse(c: Gen['c'], x: number, y: number, s: number, rnd: () => number) {
  const walls = ['#f4efe3', '#c94c3c', '#f1e2b8'][Math.floor(rnd() * 3)];
  c.fillStyle = walls; c.fillRect(x, y - s, s * 1.6, s);
  c.fillStyle = '#7b2e26';
  c.beginPath(); c.moveTo(x - s * 0.1, y - s); c.lineTo(x + s * 0.8, y - s * 1.6); c.lineTo(x + s * 1.7, y - s); c.closePath(); c.fill();
  c.fillStyle = '#3b2a20'; c.fillRect(x + s * 0.65, y - s * 0.55, s * 0.3, s * 0.55);
  c.fillStyle = '#9cc3d9'; c.fillRect(x + s * 0.18, y - s * 0.7, s * 0.25, s * 0.25); c.fillRect(x + s * 1.15, y - s * 0.7, s * 0.25, s * 0.25);
  // barn
  c.fillStyle = '#a8322a'; c.fillRect(x + s * 2, y - s * 1.1, s * 1.2, s * 1.1);
  c.fillStyle = '#5a1a16'; c.beginPath(); c.moveTo(x + s * 1.9, y - s * 1.1); c.lineTo(x + s * 2.6, y - s * 1.7); c.lineTo(x + s * 3.3, y - s * 1.1); c.fill();
  c.strokeStyle = '#f4efe3'; c.lineWidth = s * 0.06; c.strokeRect(x + s * 2.35, y - s * 0.75, s * 0.5, s * 0.75);
  c.beginPath(); c.moveTo(x + s * 2.35, y - s * 0.75); c.lineTo(x + s * 2.85, y); c.moveTo(x + s * 2.85, y - s * 0.75); c.lineTo(x + s * 2.35, y); c.stroke();
}

export type { RGB };
