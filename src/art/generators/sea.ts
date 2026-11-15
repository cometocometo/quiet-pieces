import { birds, circle, cloud, glow, grain, hex, linear, mix, radial, rays, rgb, ridgeline, shade, stars, stratus, vignette, type Gen } from '../lib';

const SEA = [
  { sky: ['#1d1340', '#6b2f6b', '#e0686a', '#ffcf86'], sea: ['#f7a26f', '#7a3a6a', '#1a1035'], sun: ['#fff3c4', '#ff7a5c'], land: '#1a0f22' },
  { sky: ['#3d78b8', '#8fc0e3', '#d8ecf2', '#fff4dc'], sea: ['#bfe6ee', '#3c8fb3', '#0d3d63'], sun: ['#ffffff', '#fff2cc'], land: '#24413e' },
  { sky: ['#0a1630', '#24406e', '#5b6f9e', '#a3a4c4'], sea: ['#8d96bd', '#2b3f6e', '#070f22'], sun: ['#ffffff', '#d6e2ff'], land: '#070b17' },
  { sky: ['#f1a26e', '#f6c48b', '#fbe2b2', '#fff3d8'], sea: ['#ffd6a0', '#d88e64', '#5a3a4a'], sun: ['#fffbe8', '#ffd89a'], land: '#3a2230' },
];

/** Sun over the open sea with a glittering reflection and sailing boats. */
export function seaSunset(g: Gen) {
  const { c, W, H, rnd } = g;
  const P = SEA[g.v % SEA.length];
  const hz = H * (0.5 + rnd() * 0.08);
  c.fillStyle = linear(c, 0, 0, 0, hz, P.sky.map((s, i) => [i / (P.sky.length - 1), s] as [number, string]));
  c.fillRect(0, 0, W, hz);
  const night = g.v % SEA.length === 2;
  if (night || g.v % SEA.length === 0) stars(g, night ? 700 : 200, hz * 0.7);
  const sx = W * (0.3 + rnd() * 0.4), sr = H * (night ? 0.05 : 0.1), sy = hz - sr * (night ? 4 : 0.35);
  glow(g, sx, sy, sr * 6, hex(P.sun[1]), 0.5);
  c.fillStyle = linear(c, 0, sy - sr, 0, sy + sr, [[0, P.sun[0]], [1, P.sun[1]]]);
  circle(c, sx, sy, sr); c.fill();
  for (let i = 0; i < 12; i++) {
    const y = hz * (0.1 + rnd() * 0.75);
    stratus(g, rnd() * W, y, W * (0.1 + rnd() * 0.3), H * (0.01 + rnd() * 0.02), shadeHex(P.sky[3], 0.25), P.sky[1], 0.3 + rnd() * 0.5, y > sy);
  }
  // sea
  c.fillStyle = linear(c, 0, hz, 0, H, P.sea.map((s, i) => [i / (P.sea.length - 1), s] as [number, string]));
  c.fillRect(0, hz, W, H - hz);
  // distant headland
  const r = ridgeline(128, 0.5, rnd);
  c.fillStyle = rgb(mix(hex(P.land), hex(P.sky[2]), 0.45));
  const hw = W * (0.25 + rnd() * 0.25), hx = rnd() < 0.5 ? 0 : W - hw;
  c.beginPath(); c.moveTo(hx, hz);
  for (let i = 0; i <= 128; i++) {
    const t = i / 128, edge = Math.sin(t * Math.PI);
    c.lineTo(hx + t * hw, hz - (r[i] * 0.6 + 0.4) * H * 0.05 * Math.pow(edge, 0.6));
  }
  c.lineTo(hx + hw, hz); c.fill();
  // glittering path of light
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 900; i++) {
    const t = Math.pow(rnd(), 1.4), y = hz + t * (H - hz);
    const spread = sr * (0.8 + t * 5.5);
    const x = sx + (rnd() - 0.5) * 2 * spread * (0.4 + rnd() * 0.6);
    const w = (4 + t * 40) * (0.3 + rnd()), h = 1 + t * 3;
    c.fillStyle = rgb(hex(P.sun[0]), (0.08 + rnd() * 0.3) * (1 - Math.abs(x - sx) / (spread * 1.3)));
    c.fillRect(x - w / 2, y, w, h);
  }
  c.restore();
  // wave lines
  for (let i = 0; i < 260; i++) {
    const t = Math.pow(rnd(), 1.3), y = hz + t * (H - hz);
    const w = W * (0.01 + t * 0.06), x = rnd() * W;
    c.strokeStyle = rgb(shade(hex(P.sea[2]), -0.2), 0.25 + t * 0.2); c.lineWidth = 1 + t * 2.5;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 2, y - 2 - t * 4, x + w, y); c.stroke();
  }
  // boats
  const boats = 2 + Math.floor(rnd() * 3);
  for (let k = 0; k < boats; k++) {
    const t = 0.05 + rnd() * 0.4, y = hz + t * (H - hz), s = H * (0.02 + t * 0.12);
    sailboat(c, W * (0.08 + rnd() * 0.84), y, s, P.land, rnd() < 0.5 ? 1 : -1);
  }
  if (!night) birds(g, W * (0.2 + rnd() * 0.6), hz * 0.45, 10, W * 0.006, rgb(hex(P.land), 0.75));
  grain(g, 9);
  vignette(g, 0.25);
}

function shadeHex(h: string, k: number) { return rgb(shade(hex(h), k)); }

function sailboat(c: Gen['c'], x: number, y: number, s: number, col: string, dir: number) {
  c.fillStyle = col;
  c.beginPath(); c.moveTo(x - s * 0.7, y - s * 0.12); c.lineTo(x + s * 0.7, y - s * 0.12); c.lineTo(x + s * 0.5, y + s * 0.05); c.lineTo(x - s * 0.5, y + s * 0.05); c.closePath(); c.fill();
  c.fillRect(x - s * 0.02, y - s * 1.3, s * 0.04, s * 1.2);
  c.beginPath(); c.moveTo(x + dir * s * 0.04, y - s * 1.25); c.quadraticCurveTo(x + dir * s * 0.7, y - s * 0.7, x + dir * s * 0.6, y - s * 0.2); c.lineTo(x + dir * s * 0.04, y - s * 0.2); c.fill();
  c.beginPath(); c.moveTo(x - dir * s * 0.04, y - s * 1.05); c.lineTo(x - dir * s * 0.45, y - s * 0.2); c.lineTo(x - dir * s * 0.04, y - s * 0.2); c.fill();
  c.fillRect(x - s * 0.6, y + s * 0.08, s * 1.2, Math.max(1, s * 0.03));
}

/** A striped lighthouse on a cliff above rolling waves. */
export function lighthouse(g: Gen) {
  const { c, W, H, rnd } = g;
  const P = [
    { sky: ['#7db7dc', '#bfdcec', '#f2f2e6'], sea: ['#5aa6c4', '#1f5f86', '#0d2f4a'], cliff: ['#7d8f5a', '#4e5f3a', '#6e5a48'], stripe: '#d63b2f', beam: false },
    { sky: ['#0e1a3a', '#2b3d6b', '#6b6f9b'], sea: ['#2f4a78', '#14244a', '#060c1e'], cliff: ['#2c3b35', '#18231f', '#2e2a2c'], stripe: '#b8322a', beam: true },
    { sky: ['#f39a72', '#f8c49a', '#fde7c8'], sea: ['#e7a07f', '#9a5a6e', '#3b2546'], cliff: ['#6b6a3e', '#3f3d27', '#5a3f3a'], stripe: '#2f4b7a', beam: false },
  ][g.v % 3];
  const hz = H * 0.56;
  c.fillStyle = linear(c, 0, 0, 0, hz, P.sky.map((s, i) => [i / (P.sky.length - 1), s] as [number, string]));
  c.fillRect(0, 0, W, hz);
  if (P.beam) stars(g, 600, hz * 0.8);
  else for (let i = 0; i < 7; i++) cloud(g, rnd() * W, H * (0.08 + rnd() * 0.25), W * (0.08 + rnd() * 0.14), '#ffffff', rgb(mix(hex(P.sky[0]), hex('#ffffff'), 0.6)), 0.85);
  c.fillStyle = linear(c, 0, hz, 0, H, P.sea.map((s, i) => [i / (P.sea.length - 1), s] as [number, string]));
  c.fillRect(0, hz, W, H - hz);
  // rows of waves with foam crests
  for (let row = 0; row < 26; row++) {
    const t = row / 25, y = hz + Math.pow(t, 1.6) * (H - hz);
    const amp = 2 + t * 18, len = W * (0.03 + t * 0.09);
    c.fillStyle = rgb(shade(hex(P.sea[1]), -0.1 + t * 0.15), 0.35);
    c.strokeStyle = `rgba(255,255,255,${0.25 + t * 0.4})`; c.lineWidth = 1 + t * 2.5;
    const off = rnd() * len;
    c.beginPath(); c.moveTo(-len, y);
    for (let x = -len + off; x < W + len; x += len) c.quadraticCurveTo(x + len * 0.25, y - amp, x + len * 0.5, y), c.quadraticCurveTo(x + len * 0.75, y + amp * 0.4, x + len, y);
    c.stroke();
  }
  // cliff
  const left = rnd() < 0.5;
  const cw = W * 0.48, x0 = left ? 0 : W - cw;
  const top = H * 0.46;
  const r = ridgeline(64, 0.45, rnd);
  c.fillStyle = linear(c, 0, top, 0, H, [[0, P.cliff[2]], [1, rgb(shade(hex(P.cliff[2]), -0.45))]]);
  c.beginPath();
  c.moveTo(left ? 0 : W, H);
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const x = left ? x0 + t * cw : W - t * cw;
    const y = top + r[i] * H * 0.04 + Math.pow(t, 4) * H * 0.5;
    c.lineTo(x + (t > 0.85 ? (left ? 1 : -1) * (t - 0.85) * W * 0.2 : 0), y);
  }
  c.lineTo(left ? x0 + cw * 0.9 : W - cw * 0.9, H); c.closePath(); c.fill();
  // rock strata
  c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2;
  for (let k = 0; k < 18; k++) {
    const y = top + H * 0.05 + rnd() * H * 0.45, w = cw * (0.2 + rnd() * 0.5), x = left ? rnd() * cw * 0.7 : W - rnd() * cw * 0.7 - w;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + (rnd() - 0.5) * 12); c.stroke();
  }
  // grass cap
  c.fillStyle = linear(c, 0, top - H * 0.02, 0, top + H * 0.06, [[0, P.cliff[0]], [1, P.cliff[1]]]);
  c.beginPath(); c.moveTo(left ? 0 : W, top + H * 0.06);
  for (let i = 0; i <= 64; i++) {
    const t = i / 64; if (t > 0.86) break;
    c.lineTo(left ? x0 + t * cw : W - t * cw, top + r[i] * H * 0.04 + Math.pow(t, 4) * H * 0.5 - 4);
  }
  for (let i = 55; i >= 0; i--) {
    const t = i / 64;
    c.lineTo(left ? x0 + t * cw : W - t * cw, top + r[i] * H * 0.04 + Math.pow(t, 4) * H * 0.5 + H * 0.035 + Math.sin(i) * 6);
  }
  c.closePath(); c.fill();
  // lighthouse
  const lx = left ? cw * 0.42 : W - cw * 0.42, ly = top + H * 0.01, lh = H * 0.36, lw0 = H * 0.06, lw1 = H * 0.042;
  if (P.beam) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const dir of [-1, 1]) {
      c.fillStyle = linear(c, lx, ly - lh, lx + dir * W * 0.6, ly - lh - H * 0.1, [[0, 'rgba(255,240,190,.45)'], [1, 'rgba(255,240,190,0)']]);
      c.beginPath(); c.moveTo(lx, ly - lh * 1.04); c.lineTo(lx + dir * W, ly - lh - H * 0.22); c.lineTo(lx + dir * W, ly - lh + H * 0.08); c.closePath(); c.fill();
    }
    c.restore();
  }
  const stripes = 5;
  for (let k = 0; k < stripes; k++) {
    const y0 = ly - (lh * k) / stripes, y1 = ly - (lh * (k + 1)) / stripes;
    const w0 = lw0 + (lw1 - lw0) * (k / stripes), w1 = lw0 + (lw1 - lw0) * ((k + 1) / stripes);
    c.fillStyle = k % 2 ? '#f4f1ea' : P.stripe;
    c.beginPath(); c.moveTo(lx - w0 / 2, y0); c.lineTo(lx + w0 / 2, y0); c.lineTo(lx + w1 / 2, y1); c.lineTo(lx - w1 / 2, y1); c.closePath(); c.fill();
  }
  c.fillStyle = 'rgba(0,0,0,.18)';
  c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + lw0 / 2, ly); c.lineTo(lx + lw1 / 2, ly - lh); c.lineTo(lx, ly - lh); c.fill();
  // gallery and lamp room
  c.fillStyle = '#2b2b2b'; c.fillRect(lx - lw1 * 0.75, ly - lh - H * 0.008, lw1 * 1.5, H * 0.01);
  c.fillStyle = P.beam ? '#fff1b8' : '#cfe3ea'; c.fillRect(lx - lw1 * 0.4, ly - lh - H * 0.045, lw1 * 0.8, H * 0.037);
  if (P.beam) glow(g, lx, ly - lh - H * 0.026, H * 0.12, hex('#fff1b8'), 0.8);
  c.fillStyle = '#2b2b2b';
  c.beginPath(); c.moveTo(lx - lw1 * 0.55, ly - lh - H * 0.045); c.lineTo(lx, ly - lh - H * 0.075); c.lineTo(lx + lw1 * 0.55, ly - lh - H * 0.045); c.fill();
  // keeper's cottage
  const hx = lx + (left ? 1 : -1) * H * 0.05;
  c.fillStyle = '#f4f1ea'; c.fillRect(hx - (left ? 0 : H * 0.1), ly - H * 0.05, H * 0.1, H * 0.05);
  c.fillStyle = P.stripe;
  const hx0 = hx - (left ? 0 : H * 0.1);
  c.beginPath(); c.moveTo(hx0 - H * 0.008, ly - H * 0.05); c.lineTo(hx0 + H * 0.05, ly - H * 0.08); c.lineTo(hx0 + H * 0.108, ly - H * 0.05); c.fill();
  c.fillStyle = P.beam ? '#ffd27a' : '#4b6b7a';
  c.fillRect(hx0 + H * 0.015, ly - H * 0.035, H * 0.018, H * 0.018); c.fillRect(hx0 + H * 0.065, ly - H * 0.035, H * 0.018, H * 0.018);
  // spray at the foot of the cliff
  const fx = left ? cw * 0.95 : W - cw * 0.95;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 140; k++) {
    c.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.12})`;
    const sy = H * (0.7 + Math.pow(rnd(), 0.5) * 0.3);
    circle(c, fx + (rnd() - 0.5) * W * 0.16 * ((H - sy) / (H * 0.3) + 0.3), sy, 2 + rnd() * 14); c.fill();
  }
  c.restore();
  if (!P.beam) birds(g, W * (left ? 0.65 : 0.35), H * 0.22, 8, W * 0.007, 'rgba(40,40,50,.7)');
  grain(g, 9);
  vignette(g, 0.22);
}

/** A coral reef: sunbeams, coral and fish. */
export function reef(g: Gen) {
  const { c, W, H, rnd } = g;
  const P = [
    { water: ['#5fd3e0', '#1b8fb5', '#0b3f6b'], sand: '#e9d3a6', coral: ['#ff6f61', '#ffb347', '#ff8fb1', '#b388eb', '#ffd166', '#f25f5c'] },
    { water: ['#7ee0c8', '#1fa29b', '#0b4a5a'], sand: '#f0dcb2', coral: ['#ff7b54', '#ffd56b', '#e56b9f', '#7b6cf6', '#f9a03f', '#ff5e78'] },
    { water: ['#3a7bd5', '#1b3f8b', '#0a1a3d'], sand: '#c9b38a', coral: ['#ff4f79', '#ffb400', '#c86bfa', '#4ecdc4', '#ff8c42', '#f9f871'] },
    { water: ['#0c2f4a', '#071c33', '#020a14'], sand: '#5d5a6e', coral: ['#ff4fd8', '#6bf3ff', '#c3ff6b', '#ffb86b', '#b98bff', '#ff6b8b'] },
    { water: ['#9be7d6', '#3fb1a6', '#126b72'], sand: '#f2e2bd', coral: ['#ff9f80', '#ffe066', '#ff6f91', '#a1e44d', '#f6a6ff', '#ffffff'] },
  ][g.v % 5];
  const night = g.v % 5 === 3, kelp = g.v % 4 === 2 || g.v === 9;
  c.fillStyle = linear(c, 0, 0, 0, H, P.water.map((s, i) => [i / (P.water.length - 1), s] as [number, string]));
  c.fillRect(0, 0, W, H);
  // light from the surface
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W, w = W * (0.02 + rnd() * 0.06), lean = W * (0.1 + rnd() * 0.15);
    c.fillStyle = linear(c, 0, 0, 0, H * 0.9, [[0, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']]);
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w, 0); c.lineTo(x + w + lean, H); c.lineTo(x + lean - w, H); c.closePath(); c.fill();
  }
  c.restore();
  // caustic ripples near the surface
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2;
  for (let i = 0; i < 70; i++) { const x = rnd() * W, y = rnd() * H * 0.18; c.beginPath(); c.ellipse(x, y, 20 + rnd() * 50, 4 + rnd() * 6, 0, 0, Math.PI * 2); c.stroke(); }
  // distant reef silhouettes
  for (let l = 0; l < 3; l++) {
    const col = mix(hex(P.water[1]), hex(P.water[2]), 0.3 + l * 0.25);
    const r = ridgeline(128, 0.6, rnd), base = H * (0.62 + l * 0.08), amp = H * (0.12 - l * 0.02);
    c.fillStyle = rgb(col, 0.8);
    c.beginPath(); c.moveTo(0, H); for (let i = 0; i <= 128; i++) c.lineTo((i / 128) * W, base - r[i] * amp); c.lineTo(W, H); c.fill();
  }
  if (kelp) {
    for (let k = 0; k < 26; k++) {
      const x = rnd() * W, h = H * (0.35 + rnd() * 0.5), col = rgb(mix(hex('#3f7d3a'), hex(P.water[1]), 0.2 + rnd() * 0.4));
      c.strokeStyle = col; c.lineWidth = H * (0.006 + rnd() * 0.006); c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, H);
      for (let t = 0; t <= 1; t += 0.05) c.lineTo(x + Math.sin(t * 7 + k) * H * 0.02 * t, H - t * h);
      c.stroke();
      c.fillStyle = col;
      for (let t = 0.15; t < 1; t += 0.09) { const yy = H - t * h, xx = x + Math.sin(t * 7 + k) * H * 0.02 * t; c.beginPath(); c.ellipse(xx + H * 0.012, yy, H * 0.014, H * 0.005, -0.5, 0, Math.PI * 2); c.fill(); }
    }
  }
  if (night) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 9; k++) jelly(c, W * (0.1 + rnd() * 0.8), H * (0.12 + rnd() * 0.5), H * (0.03 + rnd() * 0.05), P.coral[Math.floor(rnd() * P.coral.length)], rnd);
    c.restore();
  }
  // sand floor
  c.fillStyle = linear(c, 0, H * 0.82, 0, H, [[0, rgb(mix(hex(P.sand), hex(P.water[1]), 0.4))], [1, P.sand]]);
  c.beginPath(); c.moveTo(0, H);
  for (let i = 0; i <= 40; i++) c.lineTo((i / 40) * W, H * 0.85 + Math.sin(i * 0.7 + rnd()) * H * 0.012);
  c.lineTo(W, H); c.fill();
  // coral
  for (let k = 0; k < 40; k++) {
    const x = rnd() * W, y = H * (0.8 + rnd() * 0.18), s = H * (0.05 + rnd() * 0.12);
    const col = P.coral[Math.floor(rnd() * P.coral.length)];
    const kind = rnd();
    if (kind < 0.35) branchCoral(c, x, y, s, col, rnd);
    else if (kind < 0.6) fanCoral(c, x, y, s, col, rnd);
    else if (kind < 0.8) brainCoral(c, x, y, s * 0.5, col);
    else anemone(c, x, y, s * 0.6, col, rnd);
  }
  // fish schools
  for (let k = 0; k < 6; k++) {
    const col = P.coral[Math.floor(rnd() * P.coral.length)], cx = rnd() * W, cy = H * (0.2 + rnd() * 0.5), n = 4 + Math.floor(rnd() * 10);
    const s = H * (0.015 + rnd() * 0.03), dir = rnd() < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) fish(c, cx + (rnd() - 0.5) * s * 14, cy + (rnd() - 0.5) * s * 6, s, col, dir, rnd() < 0.5);
  }
  // a turtle
  turtle(c, W * (0.2 + rnd() * 0.6), H * (0.3 + rnd() * 0.2), H * 0.09, rnd() < 0.5 ? 1 : -1);
  // bubbles
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W, y = rnd() * H, r = 1.5 + rnd() * 6;
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.2; circle(c, x, y, r); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; circle(c, x - r * 0.35, y - r * 0.35, r * 0.25); c.fill();
  }
  grain(g, 8);
  vignette(g, 0.3);
}

function jelly(c: Gen['c'], x: number, y: number, s: number, col: string, rnd: () => number) {
  const cc = hex(col);
  c.fillStyle = radial(c, x, y, 0, s * 2.5, [[0, rgb(cc, 0.35)], [1, rgb(cc, 0)]]);
  c.fillRect(x - s * 2.5, y - s * 2.5, s * 5, s * 5);
  c.fillStyle = rgb(cc, 0.6);
  c.beginPath(); c.arc(x, y, s, Math.PI, 0); c.quadraticCurveTo(x, y + s * 0.3, x - s, y); c.fill();
  c.strokeStyle = rgb(cc, 0.5); c.lineWidth = Math.max(1, s * 0.06);
  for (let k = 0; k < 7; k++) {
    const tx = x - s * 0.8 + (k / 6) * s * 1.6;
    c.beginPath(); c.moveTo(tx, y);
    for (let t = 0; t <= 1; t += 0.1) c.lineTo(tx + Math.sin(t * 9 + k + rnd()) * s * 0.15, y + t * s * 2.6);
    c.stroke();
  }
}

function branchCoral(c: Gen['c'], x: number, y: number, s: number, col: string, rnd: () => number) {
  c.strokeStyle = col; c.lineCap = 'round';
  const branch = (x0: number, y0: number, a: number, len: number, w: number, d: number) => {
    const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    if (d > 0) { branch(x1, y1, a - 0.3 - rnd() * 0.3, len * 0.72, w * 0.72, d - 1); branch(x1, y1, a + 0.3 + rnd() * 0.3, len * 0.72, w * 0.72, d - 1); }
    else { c.fillStyle = rgb(shade(hex(col), 0.3)); circle(c, x1, y1, w * 0.7); c.fill(); }
  };
  branch(x, y, -Math.PI / 2 + (rnd() - 0.5) * 0.4, s * 0.35, s * 0.08, 4);
}
function fanCoral(c: Gen['c'], x: number, y: number, s: number, col: string, rnd: () => number) {
  c.fillStyle = rgb(hex(col), 0.85);
  c.beginPath(); c.moveTo(x, y);
  for (let i = 0; i <= 20; i++) { const a = Math.PI + (i / 20) * Math.PI; const r = s * (0.8 + rnd() * 0.25); c.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r); }
  c.closePath(); c.fill();
  c.strokeStyle = rgb(shade(hex(col), -0.3), 0.6); c.lineWidth = 1.5;
  for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.9); c.stroke(); }
  for (let k = 1; k < 5; k++) { c.beginPath(); c.ellipse(x, y, s * 0.16 * k, s * 0.2 * k, 0, Math.PI, Math.PI * 2); c.stroke(); }
}
function brainCoral(c: Gen['c'], x: number, y: number, s: number, col: string) {
  c.fillStyle = radial(c, x - s * 0.3, y - s * 0.6, 0, s * 1.4, [[0, rgb(shade(hex(col), 0.3))], [1, rgb(shade(hex(col), -0.25))]]);
  c.beginPath(); c.ellipse(x, y - s * 0.2, s, s * 0.75, 0, Math.PI, Math.PI * 2); c.closePath(); c.fill();
  c.strokeStyle = rgb(shade(hex(col), -0.35), 0.6); c.lineWidth = 1.5;
  for (let k = 1; k < 6; k++) { c.beginPath(); c.ellipse(x, y - s * 0.2, s * k / 6, s * 0.75 * k / 6, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); }
}
function anemone(c: Gen['c'], x: number, y: number, s: number, col: string, rnd: () => number) {
  c.strokeStyle = col; c.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, len = s * (0.6 + rnd() * 0.5);
    c.lineWidth = s * 0.07;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (rnd() - 0.5) * s * 0.3, y + Math.sin(a) * len * 0.6, x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
  }
  c.fillStyle = rgb(shade(hex(col), -0.3)); c.beginPath(); c.ellipse(x, y, s * 0.3, s * 0.12, 0, 0, Math.PI * 2); c.fill();
}
function fish(c: Gen['c'], x: number, y: number, s: number, col: string, dir: number, stripes: boolean) {
  c.save(); c.translate(x, y); c.scale(dir, 1);
  c.fillStyle = col;
  c.beginPath(); c.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(-s * 0.8, 0); c.lineTo(-s * 1.5, -s * 0.45); c.lineTo(-s * 1.5, s * 0.45); c.closePath(); c.fill();
  if (stripes) { c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(-s * 0.2, -s * 0.48, s * 0.18, s * 0.96); c.fillRect(s * 0.3, -s * 0.4, s * 0.14, s * 0.8); }
  c.fillStyle = '#fff'; circle(c, s * 0.55, -s * 0.1, s * 0.13); c.fill();
  c.fillStyle = '#111'; circle(c, s * 0.58, -s * 0.1, s * 0.07); c.fill();
  c.restore();
}
function turtle(c: Gen['c'], x: number, y: number, s: number, dir: number) {
  c.save(); c.translate(x, y); c.scale(dir, 1); c.rotate(-0.15);
  c.fillStyle = '#7d9b5a';
  for (const [fx, fy, a] of [[0.5, -0.45, -0.6], [0.5, 0.45, 0.6], [-0.55, -0.35, -2.4], [-0.55, 0.35, 2.4]]) {
    c.save(); c.translate(s * fx, s * fy); c.rotate(a); c.beginPath(); c.ellipse(s * 0.25, 0, s * 0.35, s * 0.12, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }
  c.beginPath(); c.ellipse(s * 0.85, 0, s * 0.22, s * 0.16, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5b4a2e'; c.beginPath(); c.ellipse(0, 0, s * 0.7, s * 0.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#c8a86a'; c.lineWidth = s * 0.03;
  for (const [hx, hy] of [[0, 0], [0.35, -0.2], [0.35, 0.2], [-0.35, -0.2], [-0.35, 0.2]]) {
    c.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.lineTo(s * hx + Math.cos(a) * s * 0.17, s * hy + Math.sin(a) * s * 0.17); }
    c.closePath(); c.stroke();
  }
  c.fillStyle = '#111'; circle(c, s * 0.95, -s * 0.05, s * 0.03); c.fill();
  c.restore();
}

export { rays };
