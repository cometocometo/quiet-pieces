import { circle, cloud, fillRidge, glow, grain, hex, linear, mix, pine, radial, rgb, ridgeline, shade, stars, vignette, type Gen } from '../lib';

/** Northern lights over snowy peaks and a frozen lake. */
export function aurora(g: Gen) {
  const { c, W, H, rnd, noise } = g;
  const P = [
    { sky: ['#020617', '#06243a', '#0b3b4f'], bands: ['#4dffb0', '#2ad1ff', '#b56bff'] },
    { sky: ['#05030f', '#1a0f3a', '#2a1650'], bands: ['#ff6bd6', '#7d6bff', '#4dffd2'] },
    { sky: ['#010812', '#04203a', '#08304a'], bands: ['#9dff6b', '#3dffb5', '#ffe36b'] },
  ][g.v % 3];
  c.fillStyle = linear(c, 0, 0, 0, H * 0.7, [[0, P.sky[0]], [0.6, P.sky[1]], [1, P.sky[2]]]);
  c.fillRect(0, 0, W, H);
  stars(g, 1100, H * 0.75);
  // aurora curtains: many thin vertical strokes along wavy ribbons
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 3; b++) {
    const col = hex(P.bands[b]);
    const yBase = H * (0.18 + b * 0.09 + rnd() * 0.05), amp = H * (0.06 + rnd() * 0.06), ph = rnd() * 10;
    for (let x = -20; x < W + 20; x += 2) {
      const u = x / W;
      const y = yBase + amp * noise.fbm(u * 2.2 + ph, b * 5, 3) * 2;
      const strength = Math.max(0, 0.5 + noise.fbm(u * 6 + ph, b * 9 + 3, 2) * 1.2);
      const len = H * (0.14 + 0.24 * strength);
      c.fillStyle = linear(c, 0, y - len, 0, y + H * 0.03, [[0, rgb(col, 0)], [0.55, rgb(col, 0.1 + strength * 0.16)], [0.85, rgb(col, 0.22 + strength * 0.3)], [1, rgb(col, 0)]]);
      c.fillRect(x, y - len, 2.4, len + H * 0.03);
    }
  }
  c.fillStyle = linear(c, 0, H * 0.1, 0, H * 0.6, [[0, rgb(hex(P.bands[0]), 0)], [1, rgb(hex(P.bands[0]), 0.12)]]);
  c.fillRect(0, 0, W, H * 0.6);
  c.restore();
  // mountains with snow
  for (let l = 0; l < 3; l++) {
    const base = H * (0.6 + l * 0.06), amp = H * (0.24 - l * 0.06);
    const r = ridgeline(256, 0.5, rnd);
    const col = mix(hex('#1b2a40'), hex('#060b14'), l / 2);
    fillRidge(g, r, base, amp, rgb(col));
    c.save();
    c.beginPath(); c.moveTo(0, H); for (let i = 0; i <= 256; i++) c.lineTo((i / 256) * W, base - r[i] * amp); c.lineTo(W, H); c.clip();
    c.fillStyle = linear(c, 0, base - amp, 0, base - amp * 0.3, [[0, `rgba(210,235,255,${0.85 - l * 0.25})`], [1, 'rgba(210,235,255,0)']]);
    c.fillRect(0, base - amp, W, amp);
    // aurora light catching the snow
    c.fillStyle = rgb(hex(P.bands[0]), 0.08); c.fillRect(0, base - amp, W, amp);
    c.restore();
  }
  // frozen lake with reflection of the sky
  const lakeY = H * 0.8;
  c.fillStyle = linear(c, 0, lakeY, 0, H, [[0, rgb(mix(hex(P.bands[0]), hex(P.sky[1]), 0.75))], [1, P.sky[0]]]);
  c.fillRect(0, lakeY, W, H - lakeY);
  c.strokeStyle = 'rgba(200,230,255,.12)'; c.lineWidth = 1.5;
  for (let i = 0; i < 80; i++) { const y = lakeY + rnd() * (H - lakeY), x = rnd() * W; c.beginPath(); c.moveTo(x, y); c.lineTo(x + W * (0.03 + rnd() * 0.1), y + (rnd() - 0.5) * 6); c.stroke(); }
  c.fillStyle = '#03070d';
  for (let i = 0; i < 120; i++) { const x = rnd() * W; pine(c, x, lakeY + 3, H * (0.03 + rnd() * 0.08)); }
  // a small cabin with a warm window
  const cx = W * (0.15 + rnd() * 0.7), cy = lakeY + 2, s = H * 0.05;
  c.fillStyle = '#0a0d14'; c.fillRect(cx, cy - s, s * 1.4, s);
  c.beginPath(); c.moveTo(cx - s * 0.15, cy - s); c.lineTo(cx + s * 0.7, cy - s * 1.6); c.lineTo(cx + s * 1.55, cy - s); c.fill();
  c.fillStyle = '#ffcf6b'; c.fillRect(cx + s * 0.25, cy - s * 0.65, s * 0.3, s * 0.3); c.fillRect(cx + s * 0.85, cy - s * 0.65, s * 0.3, s * 0.3);
  glow(g, cx + s * 0.7, cy - s * 0.5, s * 2.5, hex('#ffb84d'), 0.35);
  grain(g, 8);
  vignette(g, 0.3);
}

/** Deep space: a nebula, a ringed planet and its moons. */
export function space(g: Gen) {
  const { c, W, H, rnd, noise } = g;
  const P = [
    { bg: '#03020a', neb: ['#ff4fa3', '#6b4dff', '#22c1ff'], planet: ['#f2c38b', '#c9734d', '#7a3b2e'] },
    { bg: '#01060d', neb: ['#29ffc6', '#2a6bff', '#9b4dff'], planet: ['#b7d7ff', '#5b7fd1', '#27306b'] },
    { bg: '#0a0306', neb: ['#ff8a3d', '#ff3d6e', '#8f3dff'], planet: ['#ffe2b0', '#e7a35a', '#7a4a2a'] },
  ][g.v % 3];
  c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
  // nebula from noise, drawn at low resolution and scaled up smoothly
  const sw = 320, sh = Math.round(320 * H / W);
  const small = g.makeCanvas(sw, sh);
  const img = small.c.createImageData(sw, sh);
  const cols = P.neb.map(hex);
  const ox = rnd() * 100, oy = rnd() * 100;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const u = x / sw * 3 + ox, v = y / sh * 2 + oy;
    const warp = noise.fbm(u + 3, v + 7, 3);
    const n = noise.fbm(u + warp * 1.5, v + warp * 1.5, 5);
    const d = Math.max(0, n * 1.8 + 0.25);
    const k = Math.max(0, Math.min(1, (noise.fbm(u * 0.7 + 11, v * 0.7, 2) + 0.5)));
    const col = k < 0.5 ? mix(cols[0], cols[1], k * 2) : mix(cols[1], cols[2], (k - 0.5) * 2);
    const i = (y * sw + x) * 4;
    img.data[i] = col[0] * d; img.data[i + 1] = col[1] * d; img.data[i + 2] = col[2] * d; img.data[i + 3] = 255;
  }
  small.c.putImageData(img, 0, 0);
  c.save(); c.globalCompositeOperation = 'lighter'; c.imageSmoothingQuality = 'high';
  c.drawImage(small.canvas as CanvasImageSource, 0, 0, W, H);
  c.restore();
  stars(g, 1600, H * 1.3);
  // bright stars with glow
  for (let i = 0; i < 18; i++) { const x = rnd() * W, y = rnd() * H; glow(g, x, y, H * (0.01 + rnd() * 0.03), hex('#ffffff'), 0.7); c.fillStyle = '#fff'; circle(c, x, y, 1.6); c.fill(); }
  // planet
  const px = W * (0.6 + rnd() * 0.25), py = H * (0.45 + rnd() * 0.25), pr = H * (0.2 + rnd() * 0.08);
  const tilt = -0.35 + rnd() * 0.2;
  const ring = (front: boolean) => {
    c.save(); c.translate(px, py); c.rotate(tilt);
    for (let k = 0; k < 7; k++) {
      c.strokeStyle = rgb(mix(hex(P.planet[0]), hex(P.planet[2]), k / 7), 0.35 + 0.1 * (k % 2));
      c.lineWidth = pr * 0.05;
      c.beginPath(); c.ellipse(0, 0, pr * (1.45 + k * 0.08), pr * (0.3 + k * 0.017), 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); c.stroke();
    }
    c.restore();
  };
  ring(false);
  c.save(); circle(c, px, py, pr); c.clip();
  c.fillStyle = P.planet[1]; c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  for (let k = 0; k < 14; k++) {
    const y = py - pr + (k / 14) * pr * 2 + (rnd() - 0.5) * pr * 0.05;
    c.fillStyle = rgb(mix(hex(P.planet[0]), hex(P.planet[2]), rnd()), 0.6);
    c.save(); c.translate(px, y); c.rotate(tilt * 0.3); c.fillRect(-pr * 1.2, 0, pr * 2.4, pr * (0.04 + rnd() * 0.12)); c.restore();
  }
  c.fillStyle = radial(c, px - pr * 0.4, py - pr * 0.4, pr * 0.1, pr * 1.3, [[0, 'rgba(255,255,255,.18)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.75)']]);
  c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  c.restore();
  ring(true);
  // moons
  for (let k = 0; k < 3; k++) {
    const mx = W * (0.08 + rnd() * 0.45), my = H * (0.15 + rnd() * 0.7), mr = H * (0.015 + rnd() * 0.05);
    c.fillStyle = radial(c, mx - mr * 0.4, my - mr * 0.4, 0, mr * 1.3, [[0, '#e8e4dc'], [0.6, '#8c877e'], [1, '#2a2826']]);
    circle(c, mx, my, mr); c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)';
    for (let q = 0; q < 6; q++) { circle(c, mx + (rnd() - 0.5) * mr * 1.2, my + (rnd() - 0.5) * mr * 1.2, mr * (0.08 + rnd() * 0.15)); c.fill(); }
  }
  grain(g, 7);
  vignette(g, 0.35);
}

/** Hot air balloons drifting over hills at sunrise. */
export function balloons(g: Gen) {
  const { c, W, H, rnd } = g;
  const P = [
    { sky: ['#8ec5e8', '#cfe6f0', '#fde9cf'], hills: ['#9cc28a', '#6e9b5f', '#3f6b45'], sun: '#fff4d6' },
    { sky: ['#f7a072', '#fbc9a0', '#fde9cf'], hills: ['#c9a66b', '#8e7b4f', '#4e5236'], sun: '#fff1c2' },
    { sky: ['#6c7fc4', '#b5a4d8', '#f6c6c9'], hills: ['#8e9fc4', '#5e6f9e', '#33406b'], sun: '#ffffff' },
  ][g.v % 3];
  const palettes = [
    ['#e63946', '#f1faee', '#1d3557', '#ffb703'], ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff'], ['#f72585', '#7209b7', '#4cc9f0', '#ffd166'],
    ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'], ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f'], ['#d62828', '#f77f00', '#fcbf49', '#eae2b7'],
  ];
  c.fillStyle = linear(c, 0, 0, 0, H * 0.7, P.sky.map((s, i) => [i / (P.sky.length - 1), s] as [number, string]));
  c.fillRect(0, 0, W, H);
  const sx = W * (0.2 + rnd() * 0.6);
  glow(g, sx, H * 0.6, H * 0.6, hex(P.sun), 0.6);
  for (let i = 0; i < 8; i++) cloud(g, rnd() * W, H * (0.1 + rnd() * 0.4), W * (0.08 + rnd() * 0.14), '#ffffff', rgb(mix(hex(P.sky[0]), hex('#ffffff'), 0.5)), 0.6 + rnd() * 0.35);
  for (let l = 0; l < 3; l++) {
    const r = ridgeline(128, 0.4, rnd);
    fillRidge(g, r, H * (0.72 + l * 0.1), H * (0.12 - l * 0.02), rgb(hex(P.hills[l])));
    // hedges and tree dots
    c.fillStyle = rgb(shade(hex(P.hills[l]), -0.25));
    for (let k = 0; k < 40 + l * 30; k++) { const x = rnd() * W, i = Math.round((x / W) * 128); circle(c, x, H * (0.72 + l * 0.1) - r[i] * H * (0.12 - l * 0.02) + 6 + rnd() * H * 0.08, 3 + l * 3 + rnd() * 4); c.fill(); }
  }
  // balloons, far to near
  const list = Array.from({ length: 14 }, () => ({ x: rnd() * W, y: H * (0.1 + rnd() * 0.55), s: H * (0.025 + Math.pow(rnd(), 2) * 0.13) })).sort((a, b) => a.s - b.s);
  for (const b of list) balloon(c, b.x, b.y, b.s, palettes[Math.floor(rnd() * palettes.length)], rnd, mix(hex(P.sky[1]), hex('#ffffff'), 0.2), b.s / (H * 0.155));
  grain(g, 8);
  vignette(g, 0.18);
}

function balloon(c: Gen['c'], x: number, y: number, s: number, pal: string[], rnd: () => number, hazeCol: [number, number, number], near: number) {
  const haze = 0.55 * (1 - near);
  const gores = 8 + Math.floor(rnd() * 4) * 2;
  const shape = (cx: number, cy: number) => {
    c.beginPath();
    c.moveTo(cx, cy + s * 1.15);
    c.bezierCurveTo(cx - s * 0.45, cy + s * 0.75, cx - s * 1.05, cy + s * 0.3, cx - s, cy - s * 0.15);
    c.bezierCurveTo(cx - s * 0.95, cy - s * 0.95, cx + s * 0.95, cy - s * 0.95, cx + s, cy - s * 0.15);
    c.bezierCurveTo(cx + s * 1.05, cy + s * 0.3, cx + s * 0.45, cy + s * 0.75, cx, cy + s * 1.15);
    c.closePath();
  };
  c.save();
  shape(x, y); c.clip();
  for (let k = 0; k < gores; k++) {
    const x0 = x - s * 1.1 + (k / gores) * s * 2.2, x1 = x - s * 1.1 + ((k + 1) / gores) * s * 2.2;
    c.fillStyle = rgb(mix(hex(pal[k % pal.length]), hazeCol, haze));
    c.beginPath(); c.moveTo(x, y - s * 1.2); c.quadraticCurveTo(x0 + (x0 - x) * 0.25, y, x, y + s * 1.2); c.quadraticCurveTo(x1 + (x1 - x) * 0.25, y, x, y - s * 1.2); c.fill();
  }
  // a band around the middle
  c.fillStyle = rgb(mix(hex(pal[(gores + 1) % pal.length]), hazeCol, haze), 0.9);
  c.fillRect(x - s * 1.1, y + s * 0.15, s * 2.2, s * 0.12);
  c.fillStyle = radial(c, x - s * 0.4, y - s * 0.4, s * 0.1, s * 1.4, [[0, 'rgba(255,255,255,.35)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.35)']]);
  c.fillRect(x - s * 1.2, y - s * 1.2, s * 2.4, s * 2.4);
  c.restore();
  c.strokeStyle = rgb(mix(hex('#3a2a1a'), hazeCol, haze)); c.lineWidth = Math.max(1, s * 0.02);
  c.beginPath(); c.moveTo(x - s * 0.18, y + s * 1.12); c.lineTo(x - s * 0.12, y + s * 1.4); c.moveTo(x + s * 0.18, y + s * 1.12); c.lineTo(x + s * 0.12, y + s * 1.4); c.stroke();
  c.fillStyle = rgb(mix(hex('#7a5230'), hazeCol, haze));
  c.fillRect(x - s * 0.14, y + s * 1.38, s * 0.28, s * 0.2);
}
