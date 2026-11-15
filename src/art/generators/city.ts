import { circle, cloud, glow, grain, hex, linear, mix, rgb, shade, stars, stratus, vignette, type Gen } from '../lib';

/** City skyline over a river, at dusk, at night or by day. Thousands of windows make for a satisfying puzzle. */
export function skyline(g: Gen) {
  const { c, W, H, rnd } = g;
  const P = [
    { sky: ['#0b1026', '#27245a', '#7a3d74', '#f08a6c'], bld: ['#1a1838', '#14122c', '#0d0b1f'], win: ['#ffd27a', '#ffe9b0', '#ffb45c'], lit: 0.45, water: '#120f2a', stars: 200 },
    { sky: ['#020512', '#071233', '#13235a', '#26407a'], bld: ['#0f1a33', '#0a1226', '#050a17'], win: ['#ffe08a', '#bfe3ff', '#ffc36b'], lit: 0.55, water: '#040916', stars: 600 },
    { sky: ['#5f9fd6', '#9ac7ea', '#d8ecf4', '#f6f2e6'], bld: ['#7a8fa6', '#5b6e86', '#3e4e63'], win: ['#c9e3f2', '#e8f4fa', '#9cc0d6'], lit: 0.9, water: '#3d6a8a', stars: 0 },
  ][g.v % 3];
  const day = g.v % 3 === 2;
  const river = H * 0.72;
  c.fillStyle = linear(c, 0, 0, 0, river, P.sky.map((s, i) => [i / (P.sky.length - 1), s] as [number, string]));
  c.fillRect(0, 0, W, river);
  if (P.stars) stars(g, P.stars, river * 0.6);
  if (!day) {
    const mx = W * (0.1 + rnd() * 0.8), my = H * 0.16;
    glow(g, mx, my, H * 0.25, hex('#e6ecff'), 0.3);
    c.fillStyle = '#f4f2e8'; circle(c, mx, my, H * 0.035); c.fill();
    for (let i = 0; i < 8; i++) stratus(g, rnd() * W, H * (0.1 + rnd() * 0.4), W * (0.1 + rnd() * 0.25), H * 0.012, P.sky[3], P.sky[1], 0.3, true);
  } else {
    for (let i = 0; i < 7; i++) cloud(g, rnd() * W, H * (0.08 + rnd() * 0.3), W * (0.08 + rnd() * 0.12), '#ffffff', '#cfe0ec', 0.85);
  }
  const top = g.makeCanvas(W, Math.ceil(river));
  const tc = top.c;
  // three rows of buildings, far to near
  for (let row = 0; row < 3; row++) {
    const col = hex(P.bld[row]);
    const far = row === 0;
    let x = -rnd() * 40;
    while (x < W) {
      const w = W * (0.025 + rnd() * 0.05) * (1 + row * 0.25);
      const h = river * (0.18 + Math.pow(rnd(), 1.8) * (0.55 - row * 0.12)) * (far ? 1.15 : 1);
      const y = river - h;
      const bc = day ? mix(col, hex(P.sky[2]), far ? 0.45 : 0.15 * (2 - row)) : col;
      tc.fillStyle = rgb(shade(bc, (rnd() - 0.5) * 0.12));
      tc.fillRect(x, y, w, h);
      // roof details
      const roof = rnd();
      if (roof < 0.25) { tc.beginPath(); tc.moveTo(x, y); tc.lineTo(x + w / 2, y - w * 0.6); tc.lineTo(x + w, y); tc.fill(); }
      else if (roof < 0.45) { tc.fillRect(x + w * 0.45, y - h * 0.18, w * 0.1, h * 0.18); if (!day) { tc.fillStyle = '#ff4d4d'; circle(tc, x + w / 2, y - h * 0.18, 2.5); tc.fill(); } }
      else if (roof < 0.6) { tc.fillRect(x + w * 0.15, y - w * 0.25, w * 0.7, w * 0.25); }
      else if (roof < 0.68) { tc.beginPath(); tc.arc(x + w / 2, y, w / 2, Math.PI, 0); tc.fill(); }
      // windows
      const cols = Math.max(2, Math.floor(w / (6 + row * 2))), rows = Math.floor(h / (9 + row * 3));
      const ww = (w / cols) * 0.55, wh = (h / rows) * 0.5;
      for (let i = 0; i < cols; i++) for (let j = 1; j < rows; j++) {
        if (rnd() > P.lit) continue;
        const wc = P.win[Math.floor(rnd() * P.win.length)];
        tc.fillStyle = day ? rgb(mix(hex(wc), bc, 0.35 + rnd() * 0.3)) : rgb(hex(wc), far ? 0.55 : 0.75 + rnd() * 0.25);
        tc.fillRect(x + (i + 0.22) * (w / cols), y + j * (h / rows), ww, wh);
      }
      x += w + (rnd() < 0.3 ? rnd() * 8 : 0);
    }
  }
  // bridge
  const by = river - H * 0.07, bx0 = W * (0.05 + rnd() * 0.3), bx1 = bx0 + W * 0.55;
  tc.strokeStyle = day ? '#b03a2e' : '#2a2448'; tc.lineWidth = H * 0.008;
  tc.fillStyle = tc.strokeStyle;
  tc.fillRect(bx0 - W * 0.05, by, bx1 - bx0 + W * 0.1, H * 0.012);
  for (const tx of [bx0 + (bx1 - bx0) * 0.25, bx0 + (bx1 - bx0) * 0.75]) {
    tc.fillRect(tx - H * 0.008, by - H * 0.16, H * 0.016, H * 0.16 + (river - by));
  }
  tc.lineWidth = 2;
  tc.beginPath();
  const t1 = bx0 + (bx1 - bx0) * 0.25, t2 = bx0 + (bx1 - bx0) * 0.75;
  tc.moveTo(bx0 - W * 0.05, by); tc.quadraticCurveTo((bx0 + t1) / 2, by - H * 0.02, t1, by - H * 0.16);
  tc.quadraticCurveTo((t1 + t2) / 2, by + H * 0.02, t2, by - H * 0.16);
  tc.quadraticCurveTo((t2 + bx1) / 2, by - H * 0.02, bx1 + W * 0.05, by);
  tc.stroke();
  for (let k = 0; k < 40; k++) { const x = bx0 + (bx1 - bx0) * (k / 40); tc.beginPath(); tc.moveTo(x, by); tc.lineTo(x, by - H * 0.05); tc.stroke(); }
  if (!day) for (let k = 0; k < 24; k++) { tc.fillStyle = '#ffe2a0'; circle(tc, bx0 - W * 0.04 + (bx1 - bx0 + W * 0.08) * (k / 23), by - 3, 2.2); tc.fill(); }
  c.drawImage(top.canvas as CanvasImageSource, 0, 0);
  // river with broken reflections
  c.fillStyle = P.water; c.fillRect(0, river, W, H - river);
  c.save();
  c.globalAlpha = day ? 0.35 : 0.55;
  for (let y = 0; y < (H - river); y += 2) {
    const sy = river - y * 1.2 - 2;
    if (sy < 0) break;
    const off = Math.sin(y * 0.3) * (2 + y * 0.03) + (rnd() - 0.5) * 3;
    c.drawImage(top.canvas as CanvasImageSource, 0, sy, W, 2, off, river + y, W, 2);
  }
  c.restore();
  c.fillStyle = linear(c, 0, river, 0, H, [[0, rgb(hex(P.water), 0.1)], [1, rgb(hex(P.water), 0.75)]]);
  c.fillRect(0, river, W, H - river);
  // a boat
  const bx = W * (0.1 + rnd() * 0.7), byy = river + H * 0.12;
  c.fillStyle = day ? '#f4f1ea' : '#1a1830'; c.fillRect(bx, byy - H * 0.02, W * 0.08, H * 0.02);
  c.fillRect(bx + W * 0.015, byy - H * 0.035, W * 0.04, H * 0.016);
  if (!day) { c.fillStyle = '#ffd27a'; for (let k = 0; k < 5; k++) c.fillRect(bx + W * 0.018 + k * W * 0.0075, byy - H * 0.031, W * 0.004, H * 0.007); }
  grain(g, 8);
  vignette(g, 0.25);
}

/** A seaside hill town of stacked, brightly painted houses. */
export function hillTown(g: Gen) {
  const { c, W, H, rnd } = g;
  const P = [
    { sky: ['#8cc8ea', '#d6eef6'], sea: ['#2c8fb8', '#0e4f74'], walls: ['#f2c14e', '#f78154', '#4d9de0', '#e15554', '#7768ae', '#3bb273', '#f4e1c1', '#f9a3a4', '#e1bc29'], roof: ['#b5523b', '#8c3b2a', '#c96a4a'], hill: '#7a8c4a' },
    { sky: ['#f7a072', '#fde2c4'], sea: ['#d7896b', '#5b3a5c'], walls: ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#ffc6ff', '#ffadad', '#f1c0e8', '#fbf8cc'], roof: ['#9c4f3c', '#7a3b30', '#b8634b'], hill: '#7d6b45' },
    { sky: ['#1b2449', '#4b4a7c'], sea: ['#1d2a52', '#070d22'], walls: ['#e9c46a', '#f4a261', '#e76f51', '#2a9d8f', '#8ab17d', '#f6bd60', '#f7ede2', '#84a59d', '#f28482'], roof: ['#6b3a2e', '#4a2a24', '#7d4636'], hill: '#2e3b2c' },
  ][g.v % 3];
  const night = g.v % 3 === 2;
  c.fillStyle = linear(c, 0, 0, 0, H * 0.4, [[0, P.sky[0]], [1, P.sky[1]]]);
  c.fillRect(0, 0, W, H);
  if (night) stars(g, 500, H * 0.35);
  else for (let i = 0; i < 6; i++) cloud(g, rnd() * W, H * (0.05 + rnd() * 0.15), W * (0.07 + rnd() * 0.1), '#ffffff', rgb(mix(hex(P.sky[0]), hex('#ffffff'), 0.5)), 0.85);
  // sea at the bottom
  const seaY = H * 0.86;
  c.fillStyle = linear(c, 0, seaY, 0, H, [[0, P.sea[0]], [1, P.sea[1]]]);
  c.fillRect(0, seaY, W, H - seaY);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
  for (let i = 0; i < 70; i++) { const x = rnd() * W, y = seaY + rnd() * (H - seaY); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10 + rnd() * 40, y); c.stroke(); }
  // hill shape: a dome rising from the sea
  const peakX = W * (0.4 + rnd() * 0.2), peakY = H * 0.16;
  const hillY = (x: number) => {
    const d = (x - peakX) / (W * 0.62);
    return peakY + (seaY - peakY) * Math.min(1, d * d * 1.6 + Math.abs(d) * 0.25);
  };
  c.fillStyle = P.hill;
  c.beginPath(); c.moveTo(0, seaY); for (let x = 0; x <= W; x += 10) c.lineTo(x, hillY(x)); c.lineTo(W, seaY); c.fill();
  // cypress trees on the ridge
  c.fillStyle = rgb(shade(hex(P.hill), -0.35));
  for (let k = 0; k < 30; k++) { const x = rnd() * W, y = hillY(x); c.beginPath(); c.ellipse(x, y - H * 0.025, H * 0.008, H * 0.03, 0, 0, Math.PI * 2); c.fill(); }
  // houses: rows from the top of the hill down, each later row in front
  const rows = 9;
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const s = H * (0.05 + t * 0.045);
    let x = -s * rnd();
    while (x < W) {
      const w = s * (0.9 + rnd() * 1.1), h = s * (1 + rnd() * 0.9);
      const groundY = Math.max(hillY(x + w / 2), H * 0.2) + s * 0.5 + (seaY - H * 0.25) * t * 0.92 * 0.0;
      const yb = Math.min(seaY + s * 0.2, groundY + t * (seaY - groundY));
      if (yb > hillY(x + w / 2) - s * 0.2 && yb < seaY + s * 0.5) {
        house(c, x, yb, w, h, P.walls[Math.floor(rnd() * P.walls.length)], P.roof[Math.floor(rnd() * P.roof.length)], rnd, night);
      }
      x += w + s * (rnd() < 0.15 ? 0.4 : 0.02);
    }
  }
  // harbour wall and boats
  c.fillStyle = '#cbbfa8'; c.fillRect(0, seaY - H * 0.008, W, H * 0.02);
  const boatCols = ['#e63946', '#1d3557', '#f1faee', '#ffb703', '#2a9d8f'];
  for (let k = 0; k < 9; k++) {
    const bx = rnd() * W, by = seaY + H * (0.04 + rnd() * 0.08), bw = W * (0.03 + rnd() * 0.02);
    c.fillStyle = boatCols[k % boatCols.length];
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw * 0.85, by + bw * 0.25); c.lineTo(bx + bw * 0.15, by + bw * 0.25); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(bx + bw * 0.1, by - 2, bw * 0.8, 3);
  }
  grain(g, 8);
  vignette(g, 0.2);
}

function house(c: Gen['c'], x: number, yb: number, w: number, h: number, wall: string, roof: string, rnd: () => number, night: boolean) {
  const y = yb - h;
  const wc = hex(wall);
  c.fillStyle = rgb(night ? mix(wc, hex('#1b2449'), 0.45) : wc);
  c.fillRect(x, y, w, h);
  // side shade
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x + w * 0.82, y, w * 0.18, h);
  // roof
  c.fillStyle = roof;
  if (rnd() < 0.6) { c.beginPath(); c.moveTo(x - w * 0.06, y); c.lineTo(x + w * 0.5, y - h * 0.32); c.lineTo(x + w * 1.06, y); c.closePath(); c.fill(); }
  else { c.fillRect(x - w * 0.04, y - h * 0.06, w * 1.08, h * 0.08); }
  // windows with shutters
  const cols = w > h * 0.9 ? 3 : 2, rows = Math.max(1, Math.round(h / (w * 0.5)));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const wx = x + w * (0.14 + i * (0.72 / cols)) , wy = y + h * (0.14 + j * (0.62 / rows));
    const ww = w * (0.36 / cols), wh = h * (0.3 / rows);
    if (j === rows - 1 && i === Math.floor(cols / 2) && rnd() < 0.7) {
      c.fillStyle = '#5a3a28'; c.fillRect(wx, yb - h * 0.32, ww, h * 0.32); continue;
    }
    c.fillStyle = night ? (rnd() < 0.55 ? '#ffd27a' : '#20263f') : '#2d3a4a';
    c.fillRect(wx, wy, ww, wh);
    if (!night) { c.fillStyle = rgb(shade(wc, -0.35)); c.fillRect(wx - ww * 0.35, wy, ww * 0.3, wh); c.fillRect(wx + ww * 1.05, wy, ww * 0.3, wh); }
  }
  // occasional flower box or awning
  if (rnd() < 0.3) { c.fillStyle = ['#e63946', '#ff8fab', '#ffd166'][Math.floor(rnd() * 3)]; c.fillRect(x + w * 0.1, y + h * 0.48, w * 0.6, h * 0.04); }
}
