/**
 * Fireworks for the end of a puzzle.
 *
 * Rockets climb with a sparkling tail and burst into shells of glowing
 * stars. Each star leaves a fading light trail behind it (drawn as a chain of
 * soft line segments through its recent positions), slows in the air, droops
 * under gravity, flickers and burns out from white-hot to its colour to a
 * dull ember. Shells come in several styles: peony, chrysanthemum (long
 * trails), ring, willow (slow golden drooping trails) and crackling glitter.
 * Everything is drawn with additive blending, so overlapping light adds up
 * the way real light does, over a darkened night sky.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import { sfx } from '../audio/audio';

type Kind = 'rocket' | 'debris' | 'star' | 'glitter' | 'flash';
type Style = 'peony' | 'chrysanthemum' | 'ring' | 'willow' | 'glitter';

interface P {
  kind: Kind;
  head: Sprite;
  segs: Sprite[];
  hist: number[]; // x0,y0,x1,y1… most recent first
  histT: number;
  histEvery: number;
  x: number; y: number; vx: number; vy: number;
  age: number; life: number;
  drag: number; grav: number;
  size: number;
  color: number;
  burst?: { style: Style; colors: number[] };
  crackleAt?: number;
  flickerSeed: number;
}

const PALETTES: number[][] = [
  [0xffc864, 0xffe2a8], // gold
  [0xff3b52, 0xffb3bd], // red
  [0x3d8bff, 0xb9dcff], // blue
  [0x3dff7a, 0xd2ffd9], // green
  [0xb36bff, 0xf0c8ff], // violet
  [0xe8eeff, 0x9fb4ff], // silver
  [0xff7a2e, 0xffd27a], // orange
  [0x2ee6ff, 0xff5ccf], // cyan and magenta
];

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): Texture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  return Texture.from(c);
}

/** Round glow: bright core, soft halo. */
const makeGlow = () => canvasTexture(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.12, 'rgba(255,255,255,0.95)');
  r.addColorStop(0.3, 'rgba(255,255,255,0.35)');
  r.addColorStop(0.6, 'rgba(255,255,255,0.08)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});

/** Soft line segment for trails: even along its length, soft across. */
const makeLine = () => canvasTexture(32, 16, (g) => {
  const v = g.createLinearGradient(0, 0, 0, 16);
  v.addColorStop(0, 'rgba(255,255,255,0)');
  v.addColorStop(0.5, 'rgba(255,255,255,1)');
  v.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = v; g.fillRect(0, 0, 32, 16);
});

/** Night sky: dark navy, a little lighter near the horizon. */
const makeSky = () => canvasTexture(4, 256, (g) => {
  const v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, '#01020a');
  v.addColorStop(0.7, '#060a1e');
  v.addColorStop(1, '#141a35');
  g.fillStyle = v; g.fillRect(0, 0, 4, 256);
});

const mix = (a: number, b: number, t: number) => {
  const ar = a >> 16, ag = (a >> 8) & 255, ab = a & 255, br = b >> 16, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};

/** Trail length and sampling by shell style. */
const TRAIL: Record<Style, { segs: number; every: number }> = {
  peony: { segs: 4, every: 0.03 },
  chrysanthemum: { segs: 9, every: 0.035 },
  ring: { segs: 5, every: 0.03 },
  willow: { segs: 14, every: 0.055 },
  glitter: { segs: 5, every: 0.035 },
};

export class Fireworks {
  readonly layer = new Container();
  private sky: Sprite;
  private light = new Container();
  private ps: P[] = [];
  private glow = makeGlow();
  private line = makeLine();
  private skyAlpha = 0;
  private skyTarget = 0;
  private timers: number[] = [];
  private W = 0; private H = 0;
  private scale = 1;

  constructor() {
    this.sky = new Sprite(makeSky());
    this.sky.alpha = 0;
    this.light.blendMode = 'add';
    this.layer.addChild(this.sky, this.light);
  }

  resize(W: number, H: number) {
    this.W = W; this.H = H;
    this.scale = Math.max(0.6, Math.min(1.5, Math.min(W, H) / 650));
    this.sky.width = W; this.sky.height = H;
  }

  /** A show of about six seconds, ending in a finale. */
  show() {
    this.skyTarget = 0.86;
    let t = 200;
    const plan: number[] = [];
    for (let i = 0; i < 8; i++) { plan.push(t); t += 330 + Math.random() * 380; }
    for (const at of plan) this.later(at, () => this.launch());
    for (let k = 0; k < 4; k++) this.later(t + 300 + k * 140, () => this.launch(k === 3 ? 'willow' : undefined)); // finale
    this.later(t + 3400, () => { this.skyTarget = 0; });
  }

  private later(ms: number, fn: () => void) { this.timers.push(window.setTimeout(fn, ms)); }

  private launch(force?: Style) {
    const sc = this.scale;
    const x = this.W * (0.12 + Math.random() * 0.76);
    const apex = this.H * (0.12 + Math.random() * 0.28);
    const g = 600 * sc;
    const vy = -Math.sqrt(2 * g * (this.H + 10 - apex));
    const styles: Style[] = ['peony', 'peony', 'chrysanthemum', 'chrysanthemum', 'ring', 'willow', 'glitter'];
    const style = force ?? styles[Math.floor(Math.random() * styles.length)];
    const colors = style === 'willow' ? PALETTES[0] : PALETTES[Math.floor(Math.random() * PALETTES.length)];
    this.spawn({ kind: 'rocket', x, y: this.H + 10, vx: (Math.random() - 0.5) * 50 * sc, vy, life: 4, drag: 0.3, grav: g, size: 3 * sc, color: 0xffd9a0, burst: { style, colors } }, 0, 0.03);
    sfx.launch();
  }

  private spawn(o: Omit<P, 'head' | 'segs' | 'hist' | 'histT' | 'histEvery' | 'age' | 'flickerSeed'>, segs: number, every: number) {
    const head = new Sprite(this.glow);
    head.anchor.set(0.5);
    head.tint = o.color;
    this.light.addChild(head);
    const list: Sprite[] = [];
    for (let i = 0; i < segs; i++) {
      const s = new Sprite(this.line);
      s.anchor.set(0, 0.5);
      s.tint = o.color;
      s.alpha = 0;
      this.light.addChild(s);
      list.push(s);
    }
    const hist: number[] = [];
    for (let i = 0; i <= segs; i++) hist.push(o.x, o.y);
    this.ps.push({ ...o, head, segs: list, hist, histT: 0, histEvery: every, age: 0, flickerSeed: Math.random() * 100 });
  }

  private explode(x: number, y: number, style: Style, colors: number[]) {
    const sc = this.scale;
    const [c1, c2] = colors;
    // the flash of the bursting charge
    this.spawn({ kind: 'flash', x, y, vx: 0, vy: 0, life: 0.45, drag: 0, grav: 0, size: 220 * sc, color: mix(c1, 0xffffff, 0.55) }, 0, 1);
    const n = { peony: 110, chrysanthemum: 120, ring: 64, willow: 90, glitter: 90 }[style];
    const speed = (style === 'willow' ? 400 : style === 'ring' ? 380 : 430) * sc * (0.85 + Math.random() * 0.3);
    const tilt = Math.random() * Math.PI, flat = 0.4 + Math.random() * 0.5;
    const tr = TRAIL[style];
    for (let i = 0; i < n; i++) {
      let vx: number, vy: number;
      if (style === 'ring') {
        const a = (i / n) * Math.PI * 2, r = speed * (0.97 + Math.random() * 0.06);
        const rx = Math.cos(a) * r, ry = Math.sin(a) * r * flat;
        vx = rx * Math.cos(tilt) - ry * Math.sin(tilt); vy = rx * Math.sin(tilt) + ry * Math.cos(tilt);
      } else {
        // stars spread over a sphere, seen from the side: denser towards the rim, like a real shell
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
        const k = speed * (0.94 + Math.random() * 0.12);
        vx = Math.cos(a) * r * k; vy = Math.sin(a) * r * k;
      }
      const willow = style === 'willow';
      this.spawn({
        kind: 'star', x, y, vx, vy,
        life: willow ? 3.2 + Math.random() * 0.8 : style === 'chrysanthemum' ? 2 + Math.random() * 0.6 : 1.6 + Math.random() * 0.7,
        drag: willow ? 1.05 : 1.25,
        grav: (willow ? 120 : 140) * sc,
        size: (willow ? 2.4 : 2.8) * sc,
        color: style === 'willow' ? (i % 4 ? c1 : c2) : (i % 3 === 0 ? c2 : c1),
        crackleAt: style === 'glitter' ? 0.5 + Math.random() * 0.35 : undefined,
      }, tr.segs, tr.every);
    }
    const distance = 0.12 + Math.random() * 0.3; // seconds for the sound to arrive
    sfx.boom(distance);
    if (style === 'glitter' || style === 'chrysanthemum') this.later((distance + 0.9) * 1000, () => sfx.crackle());
  }

  /** Advance the show; dt in seconds. Returns false once everything has faded. */
  step(dt: number): boolean {
    // keep real time even on slow devices: integrate in small sub-steps, draw once
    let left = Math.min(dt, 0.25);
    while (left > 1e-4) { const h = Math.min(left, 1 / 60); this.integrate(h); left -= h; }
    this.draw();
    return this.ps.length > 0 || this.skyAlpha > 0.01 || this.skyTarget > 0;
  }

  private integrate(dt: number) {
    this.skyAlpha += (this.skyTarget - this.skyAlpha) * Math.min(1, dt * 2.5);
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.age += dt;
      if (p.kind === 'flash') { if (p.age >= p.life) this.kill(i); continue; }
      const drag = Math.exp(-p.drag * dt);
      p.vx *= drag; p.vy = p.vy * drag + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      // trail history: newest point first
      p.hist[0] = p.x; p.hist[1] = p.y;
      p.histT += dt;
      if (p.histT >= p.histEvery && p.hist.length > 2) {
        p.histT = 0;
        p.hist.splice(2, 0, p.x, p.y);
        p.hist.length -= 2;
      }
      if (p.kind === 'rocket') {
        if (Math.random() < 0.8) {
          this.spawn({ kind: 'debris', x: p.x + (Math.random() - 0.5) * 2, y: p.y + 3, vx: (Math.random() - 0.5) * 40, vy: 40 + Math.random() * 60, life: 0.3 + Math.random() * 0.4, drag: 2, grav: 80, size: 1.4, color: 0xffb877 }, 0, 1);
        }
        if (p.vy >= -30) { this.explode(p.x, p.y, p.burst!.style, p.burst!.colors); this.kill(i); }
        continue;
      }
      if (p.age >= p.life) { this.kill(i); continue; }
      if (p.crackleAt !== undefined && p.age / p.life > p.crackleAt) {
        // glitter: the star pops into a few brief white sparks
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 80;
          this.spawn({ kind: 'glitter', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.18 + Math.random() * 0.25, drag: 3, grav: 60, size: 1.5, color: 0xfffbe8 }, 0, 1);
        }
        this.kill(i);
      }
    }
  }

  private draw() {
    this.sky.alpha = this.skyAlpha;
    const sc = this.scale;
    for (const p of this.ps) {
      const t = Math.min(1, p.age / p.life);
      if (p.kind === 'flash') {
        p.head.position.set(p.x, p.y);
        p.head.width = p.head.height = p.size * (0.5 + t * 0.7);
        p.head.alpha = Math.pow(1 - t, 2) * 0.85;
        continue;
      }
      // colour: white-hot, then the star's colour, then a dull ember before it dies
      const hot = Math.max(0, 1 - t * 5);
      const col = hot > 0 ? mix(p.color, 0xffffff, hot * 0.8) : t > 0.7 ? mix(p.color, 0xff4a14, (t - 0.7) * 1.8) : p.color;
      const flicker = t > 0.55 ? 0.45 + 0.55 * Math.abs(Math.sin(p.age * 38 + p.flickerSeed)) : 1;
      const fade = p.kind === 'rocket' ? 1 : Math.pow(1 - t, 1.3);
      const a = fade * flicker;
      p.head.position.set(p.x, p.y);
      const hs = (p.kind === 'rocket' ? 16 : p.kind === 'star' ? 13 : 8) * p.size / 2.8;
      p.head.width = p.head.height = hs * (p.kind === 'star' ? 1 - t * 0.35 : 1);
      p.head.alpha = a;
      p.head.tint = col;
      // trail: soft segments through the recent positions, thinning and fading toward the tail
      const n = p.segs.length;
      for (let j = 0; j < n; j++) {
        const s = p.segs[j];
        const x0 = p.hist[j * 2], y0 = p.hist[j * 2 + 1], x1 = p.hist[j * 2 + 2], y1 = p.hist[j * 2 + 3];
        const dx = x0 - x1, dy = y0 - y1, d = Math.hypot(dx, dy);
        if (d < 0.5) { s.alpha = 0; continue; }
        const k = 1 - j / n;
        s.position.set(x1, y1);
        s.rotation = Math.atan2(dy, dx);
        s.width = d + 1;
        s.height = Math.max(1, p.size * 1.6 * (0.35 + 0.65 * k)) * sc / Math.max(sc, 1);
        const twinkle = p.size < 2.6 && p.kind === 'star' && p.life > 3 ? 0.55 + 0.45 * Math.abs(Math.sin(j * 1.7 + p.age * 22 + p.flickerSeed)) : 1;
        s.alpha = a * Math.pow(k, 1.6) * 0.75 * twinkle;
        s.tint = j === 0 ? col : mix(col, p.color, 0.5);
      }
    }
  }

  private kill(i: number) {
    const p = this.ps[i];
    p.head.destroy();
    for (const s of p.segs) s.destroy();
    this.ps.splice(i, 1);
  }

  destroy() {
    for (const t of this.timers) clearTimeout(t);
    this.layer.destroy({ children: true });
  }
}
