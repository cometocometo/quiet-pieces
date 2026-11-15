import { circle, cloud, grain, hex, linear, mix, radial, rgb, ridgeline, shade, vignette, type Gen } from '../lib';

/** Glowing mandala flowers on a dark ground. */
export function bloom(g: Gen) {
  const { c, W, H, rnd } = g;
  const grounds = [['#2b1240', '#06050d'], ['#0e2a2a', '#020a0a'], ['#2a1010', '#0a0404']];
  const bg = grounds[g.v % grounds.length];
  c.fillStyle = radial(c, W * 0.5, H * 0.5, 0, W * 0.7, [[0, bg[0]], [1, bg[1]]]);
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'lighter';
  const baseHue = [280, 160, 20][g.v % 3];
  for (let i = 0; i < 110; i++) {
    const h = baseHue + (rnd() - 0.5) * 140;
    c.fillStyle = `hsla(${h},85%,60%,${0.03 + rnd() * 0.1})`;
    circle(c, rnd() * W, rnd() * H, 10 + rnd() * H * 0.08); c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  const flowers = Array.from({ length: 9 }, () => ({ x: rnd() * W, y: rnd() * H, R: H * (0.08 + rnd() * 0.17) })).sort((a, b) => a.R - b.R);
  for (const { x: cx, y: cy, R } of flowers) {
    const hue = baseHue + (rnd() - 0.5) * 200;
    for (let L = 0; L < 6; L++) {
      const n = 8 + L * 2, len = R * (1 - L * 0.15), h = hue + L * 22, off = rnd() * 6;
      for (let k = 0; k < n; k++) {
        c.save(); c.translate(cx, cy); c.rotate((k / n) * Math.PI * 2 + off);
        const gr = c.createLinearGradient(0, 0, len, 0);
        gr.addColorStop(0, `hsl(${h},80%,20%)`); gr.addColorStop(0.7, `hsl(${h},90%,57%)`); gr.addColorStop(1, `hsl(${h + 30},95%,78%)`);
        c.fillStyle = gr; c.beginPath(); c.ellipse(len * 0.52, 0, len * 0.5, len * (0.16 + L * 0.015), 0, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }
    c.fillStyle = radial(c, cx, cy, 0, R * 0.18, [[0, '#fff6c2'], [1, `hsl(${hue + 140},90%,40%)`]]);
    circle(c, cx, cy, R * 0.18); c.fill();
    c.fillStyle = 'rgba(255,240,200,.8)';
    for (let k = 0; k < 14; k++) { const a = rnd() * 6.3, d = rnd() * R * 0.15; circle(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * 0.012); c.fill(); }
  }
  for (let i = 0; i < 700; i++) { c.fillStyle = `hsla(${rnd() * 360},100%,85%,${rnd() * 0.8})`; circle(c, rnd() * W, rnd() * H, rnd() * 1.8); c.fill(); }
  grain(g, 7);
  vignette(g, 0.3);
}

/** A meadow of tulips or poppies running to the hills. */
export function meadow(g: Gen) {
  const { c, W, H, rnd } = g;
  const P = [
    { sky: ['#7ec8e3', '#e6f6fb'], flowers: ['#e63946', '#f4a261', '#ffd166', '#ff8fab', '#ffffff', '#c77dff'], grass: ['#7fb069', '#3d6b3a'], hills: '#9cc59a', kind: 'tulip' },
    { sky: ['#f6a77a', '#fde8c9'], flowers: ['#d00000', '#e85d04', '#dc2f02', '#ffba08', '#ffffff'], grass: ['#9aa84a', '#4e5a26'], hills: '#b3a86a', kind: 'poppy' },
    { sky: ['#9bb0e8', '#f1e4f3'], flowers: ['#9d4edd', '#c77dff', '#e0aaff', '#7b2cbf', '#ffffff', '#ffd6ff'], grass: ['#8fae76', '#45603d'], hills: '#a4b7c9', kind: 'lavender' },
  ][g.v % 3];
  c.fillStyle = linear(c, 0, 0, 0, H * 0.45, [[0, P.sky[0]], [1, P.sky[1]]]);
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) cloud(g, rnd() * W, H * (0.05 + rnd() * 0.2), W * (0.07 + rnd() * 0.12), '#ffffff', rgb(mix(hex(P.sky[0]), hex('#ffffff'), 0.55)), 0.85);
  for (let l = 0; l < 3; l++) {
    const r = ridgeline(128, 0.45, rnd), base = H * (0.38 + l * 0.04), amp = H * (0.08 - l * 0.015);
    c.fillStyle = rgb(mix(hex(P.hills), hex(P.sky[1]), 0.5 - l * 0.2));
    c.beginPath(); c.moveTo(0, H); for (let i = 0; i <= 128; i++) c.lineTo((i / 128) * W, base - r[i] * amp); c.lineTo(W, H); c.fill();
  }
  // windmill or tree line in the distance
  c.fillStyle = rgb(shade(hex(P.hills), -0.35));
  for (let k = 0; k < 40; k++) { circle(c, rnd() * W, H * 0.44 + rnd() * H * 0.02, 4 + rnd() * 8); c.fill(); }
  const top = H * 0.45;
  c.fillStyle = linear(c, 0, top, 0, H, [[0, P.grass[0]], [1, P.grass[1]]]);
  c.fillRect(0, top, W, H - top);
  // flowers in perspective: tiny in the back, large in front; colour rows like bulb fields
  const rowsCount = 70;
  for (let r = 0; r < rowsCount; r++) {
    const t = r / (rowsCount - 1), y = top + Math.pow(t, 1.9) * (H - top) * 1.02;
    const s = 2 + Math.pow(t, 1.6) * H * 0.05;
    const bandCol = P.flowers[Math.floor((r / 6) % P.flowers.length)];
    const n = Math.floor(W / (s * 1.4));
    for (let k = 0; k < n; k++) {
      const x = (k + rnd() * 0.8) * (W / n);
      const col = rnd() < 0.85 ? bandCol : P.flowers[Math.floor(rnd() * P.flowers.length)];
      flower(c, P.kind, x, y + (rnd() - 0.5) * s * 0.6, s, col, P.grass[1]);
    }
  }
  grain(g, 9);
  vignette(g, 0.2);
}

function flower(c: Gen['c'], kind: string, x: number, y: number, s: number, col: string, stem: string) {
  c.strokeStyle = stem; c.lineWidth = Math.max(1, s * 0.08);
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - s * 1.1); c.stroke();
  if (s > 8) { c.fillStyle = stem; c.beginPath(); c.ellipse(x + s * 0.2, y - s * 0.4, s * 0.3, s * 0.08, -0.6, 0, Math.PI * 2); c.fill(); }
  const hy = y - s * 1.2;
  const cc = hex(col);
  if (kind === 'tulip') {
    c.fillStyle = rgb(shade(cc, -0.2));
    c.beginPath(); c.moveTo(x - s * 0.3, hy - s * 0.1); c.quadraticCurveTo(x - s * 0.35, hy + s * 0.35, x, hy + s * 0.35); c.quadraticCurveTo(x + s * 0.35, hy + s * 0.35, x + s * 0.3, hy - s * 0.1);
    c.lineTo(x + s * 0.15, hy + s * 0.05); c.lineTo(x, hy - s * 0.2); c.lineTo(x - s * 0.15, hy + s * 0.05); c.closePath(); c.fill();
    c.fillStyle = rgb(cc); c.beginPath(); c.ellipse(x, hy + s * 0.08, s * 0.16, s * 0.26, 0, 0, Math.PI * 2); c.fill();
  } else if (kind === 'poppy') {
    c.fillStyle = rgb(cc);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; c.beginPath(); c.ellipse(x + Math.cos(a) * s * 0.18, hy + Math.sin(a) * s * 0.12, s * 0.25, s * 0.2, a, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#1b1b1b'; circle(c, x, hy, s * 0.08); c.fill();
  } else {
    c.fillStyle = rgb(cc);
    for (let k = 0; k < 6; k++) { circle(c, x + (k % 2 ? 1 : -1) * s * 0.06, hy + s * 0.25 - k * s * 0.1, s * 0.08); c.fill(); }
  }
}

/** Tropical leaves: monstera and palms on a dark green ground. */
export function botanical(g: Gen) {
  const { c, W, H, rnd } = g;
  const P = [
    { bg: '#0f2a1d', leaves: ['#2d6a4f', '#40916c', '#52b788', '#1b4332', '#74c69d'], accent: ['#ff8fa3', '#ffd166'] },
    { bg: '#f3efe0', leaves: ['#2d6a4f', '#40916c', '#588157', '#3a5a40', '#a3b18a'], accent: ['#e76f51', '#f4a261'] },
    { bg: '#1b1f3b', leaves: ['#2a9d8f', '#264653', '#3d8c7a', '#1f6f68', '#5fb49c'], accent: ['#ff70a6', '#ffd670'] },
  ][g.v % 3];
  c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
  const items = Array.from({ length: 52 }, () => ({ x: rnd() * W, y: rnd() * H, s: H * (0.12 + rnd() * 0.22), a: rnd() * Math.PI * 2, k: rnd() }));
  for (const it of items) {
    const col = P.leaves[Math.floor(rnd() * P.leaves.length)];
    if (it.k < 0.4) {
      // drawn on its own layer so the cut-outs only cut this leaf
      const size = Math.ceil(it.s * 2.6), leaf = g.makeCanvas(size, size);
      leaf.c.translate(size / 2, size / 2 + it.s * 0.35);
      monstera(leaf.c, it.s, col, rnd);
      c.save(); c.translate(it.x, it.y); c.rotate(it.a);
      c.drawImage(leaf.canvas as CanvasImageSource, -size / 2, -size / 2 - it.s * 0.35);
      c.restore();
      continue;
    }
    c.save(); c.translate(it.x, it.y); c.rotate(it.a);
    if (false) void 0;
    else if (it.k < 0.75) palm(c, it.s, col, rnd);
    else if (it.k < 0.9) simpleLeaf(c, it.s * 0.8, col);
    else blossom(c, it.s * 0.25, P.accent[Math.floor(rnd() * 2)]);
    c.restore();
  }
  grain(g, 9);
  vignette(g, 0.25);
}

function monstera(c: Gen['c'], s: number, col: string, rnd: () => number) {
  const cc = hex(col);
  c.fillStyle = rgb(cc);
  c.beginPath(); c.moveTo(0, 0);
  c.bezierCurveTo(s * 0.6, -s * 0.15, s * 0.9, -s * 0.75, 0, -s);
  c.bezierCurveTo(-s * 0.9, -s * 0.75, -s * 0.6, -s * 0.15, 0, 0);
  c.fill();
  // splits
  c.strokeStyle = 'rgba(0,0,0,1)'; c.globalCompositeOperation = 'destination-out'; c.lineWidth = s * 0.05;
  for (let k = 0; k < 5; k++) {
    const t = 0.18 + k * 0.15;
    for (const side of [-1, 1]) {
      const depth = 0.2 + rnd() * 0.25;
      c.lineWidth = s * (0.035 + rnd() * 0.03);
      c.beginPath(); c.moveTo(side * s * 0.9, -s * (t - 0.06)); c.quadraticCurveTo(side * s * 0.5, -s * (t + 0.02), side * s * depth, -s * (t + 0.12)); c.stroke();
    }
  }
  c.fillStyle = '#000';
  for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse((k % 2 ? 1 : -1) * s * 0.14, -s * (0.3 + k * 0.17), s * 0.035, s * 0.06, (k % 2 ? 1 : -1) * 0.4, 0, Math.PI * 2); c.fill(); }
  c.globalCompositeOperation = 'source-over';
  c.strokeStyle = rgb(shade(cc, 0.25)); c.lineWidth = s * 0.018;
  c.beginPath(); c.moveTo(0, s * 0.3); c.lineTo(0, -s * 0.95); c.stroke();
  c.fillStyle = rgb(shade(cc, -0.3), 0.6);
  for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse((k % 2 ? 1 : -1) * s * 0.3, -s * (0.35 + k * 0.12), s * 0.05, s * 0.03, 0, 0, Math.PI * 2); c.fill(); }
}
function palm(c: Gen['c'], s: number, col: string, rnd: () => number) {
  const cc = hex(col);
  c.strokeStyle = rgb(shade(cc, -0.2)); c.lineWidth = s * 0.02;
  c.beginPath(); c.moveTo(0, s * 0.2); c.quadraticCurveTo(s * 0.05, -s * 0.5, 0, -s); c.stroke();
  for (let k = 0; k < 22; k++) {
    const t = k / 22, y = s * 0.1 - t * s * 1.05, len = s * 0.45 * Math.sin(t * Math.PI) + s * 0.05;
    for (const side of [-1, 1]) {
      c.fillStyle = rgb(shade(cc, (rnd() - 0.5) * 0.15));
      c.save(); c.translate(0, y); c.rotate(side * (0.9 - t * 0.4));
      c.beginPath(); c.ellipse(side * len * 0.5, 0, len * 0.5, s * 0.025, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }
}
function simpleLeaf(c: Gen['c'], s: number, col: string) {
  const cc = hex(col);
  c.fillStyle = rgb(cc);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.4, -s * 0.5, 0, -s); c.quadraticCurveTo(-s * 0.4, -s * 0.5, 0, 0); c.fill();
  c.strokeStyle = rgb(shade(cc, 0.3)); c.lineWidth = s * 0.02;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s * 0.95); c.stroke();
  for (let k = 1; k < 7; k++) { const y = -s * k * 0.13; c.beginPath(); c.moveTo(0, y); c.lineTo(s * 0.15, y - s * 0.08); c.moveTo(0, y); c.lineTo(-s * 0.15, y - s * 0.08); c.stroke(); }
}
function blossom(c: Gen['c'], s: number, col: string) {
  const cc = hex(col);
  for (let k = 0; k < 5; k++) {
    c.fillStyle = rgb(mix(cc, hex('#ffffff'), 0.15));
    c.save(); c.rotate((k / 5) * Math.PI * 2); c.beginPath(); c.ellipse(s * 0.6, 0, s * 0.6, s * 0.38, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }
  c.fillStyle = '#ffe28a'; circle(c, 0, 0, s * 0.25); c.fill();
}
