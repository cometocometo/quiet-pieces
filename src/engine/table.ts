/**
 * The play table: draws the puzzle with PixiJS (WebGL) and turns mouse,
 * touch and keyboard input into moves on the Puzzle.
 *
 * Every group of pieces is one container whose transform mirrors the group's
 * transform in the Puzzle, so dragging, rotating and joining are just
 * container moves and re-parenting; textures never change.
 */
import { Application, Container, Graphics, Rectangle, Sprite, Texture, TilingSprite } from 'pixi.js';
import { sfx } from '../audio/audio';
import { surfaceCanvas, SURFACES } from './backgrounds';
import { tracePath } from './geometry';
import { arrange, groupBox, tableFor, type Rect } from './layout';
import { Fireworks } from './fireworks';
import type { Group, Puzzle, Rot } from './puzzle';
import { mulberry32 } from './rng';
import { chooseScale, type SheetLayout, type SheetResult } from './sheets';

type Drawable = ImageBitmap | HTMLCanvasElement | OffscreenCanvas;

export interface TableEvents {
  progress(p: { progress: number; placed: number; total: number }): void;
  changed(): void;
  firstMove(): void;
  complete(): void;
  hintUsed(): void;
}

export interface TableSettings {
  surface: string;
  outline: boolean;
  reduceMotion: boolean;
  /** Keep loose pieces in a tray along the bottom (best on phones). */
  tray: boolean;
}

interface Anim { t0: number; dur: number; fx: number; fy: number; fr: number; tx: number; ty: number; tr: number; px?: number; py?: number; done?: () => void }

class GroupView {
  c = new Container();
  shadows = new Container();
  pieces = new Container();
  anim: Anim | null = null;
  lifted = false;
  constructor(public g: Group) {
    this.c.addChild(this.shadows, this.pieces);
  }
}

interface TrayItem { gid: number; sprite: Sprite; x: number }

const EASE = (t: number) => 1 - Math.pow(1 - t, 3);

export class PlayTable {
  readonly app = new Application();
  readonly puzzle: Puzzle;
  private host: HTMLElement;
  private picture: Drawable;
  private settings: TableSettings;
  private events: TableEvents;

  private world = new Container();
  private bg!: TilingSprite;
  private boardG = new Graphics();
  private ghost!: Sprite;
  private finishSprite!: Sprite;
  private placedLayer = new Container();
  private looseLayer = new Container();
  private fxLayer = new Container();
  private trayLayer = new Container();
  private trayBg = new Graphics();
  private trayItems = new Container();
  private confettiLayer = new Container();

  private views = new Map<number, GroupView>();
  private viewOf = new WeakMap<Container, GroupView>();
  private pieceTex: Texture[] = [];
  private shadowTex: Texture[] = [];
  private pieceSprites: Sprite[] = [];
  private shadowSprites: Sprite[] = [];
  private paths2d: Path2D[] = [];
  private hitCtx = document.createElement('canvas').getContext('2d')!;
  private hues: Float32Array<ArrayBufferLike> = new Float32Array(0);
  private layout!: SheetLayout;

  private table!: Rect;
  private cam = { k: 1, x: 0, y: 0, fitK: 1 };
  private camAnim: { t0: number; dur: number; from: { k: number; x: number; y: number }; to: { k: number; x: number; y: number } } | null = null;
  private W = 0; private H = 0;
  private insets = { top: 64, bottom: 0, left: 0, right: 0 };

  private pointers = new Map<number, { x: number; y: number }>();
  private drag: { v: GroupView; id: number; wx: number; wy: number; sx: number; sy: number; t: number; moved: boolean; fromTray: boolean } | null = null;
  private pan: { id: number; x: number; y: number; cx: number; cy: number; moved: boolean; t: number } | null = null;
  private pinch: { d: number; mx: number; my: number } | null = null;
  private trayPress: { id: number; x: number; y: number; scroll0: number; item: TrayItem | null; mode: 'press' | 'scroll' } | null = null;
  private trayScroll = 0; private trayVel = 0; private trayList: TrayItem[] = [];
  private trayH = 0;
  private lastTap = { t: 0, x: 0, y: 0 };

  private edgesOnly = false;
  private ghostAlpha = 0;
  private peekOn = false;
  private started = false;
  private finished = false;
  private paused = false;
  private hintState: { gid: number; t0: number; marks: Container } | null = null;
  private lastHintGid = -1;
  private flashes: { s: Sprite; t0: number }[] = [];
  private fireworks: Fireworks | null = null;
  private finishT0 = 0;
  private rnd = mulberry32(Date.now() & 0xffff);
  private destroyed = false;
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);
  private resizeObs: ResizeObserver | null = null;

  private constructor(host: HTMLElement, puzzle: Puzzle, picture: Drawable, settings: TableSettings, events: TableEvents) {
    this.host = host; this.puzzle = puzzle; this.picture = picture; this.settings = settings; this.events = events;
  }

  static async create(host: HTMLElement, puzzle: Puzzle, picture: Drawable, settings: TableSettings, events: TableEvents,
    buildSheets: (req: import('./sheets').SheetRequest) => Promise<SheetResult<Drawable>>): Promise<PlayTable> {
    const t = new PlayTable(host, puzzle, picture, settings, events);
    await t.init(buildSheets);
    return t;
  }

  // ------------------------------------------------------------------ setup
  private async init(buildSheets: (req: import('./sheets').SheetRequest) => Promise<SheetResult<Drawable>>) {
    const p = this.puzzle;
    await this.app.init({
      resizeTo: this.host, antialias: true, backgroundAlpha: 0, autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2.5), preference: 'webgl', powerPreference: 'high-performance',
    });
    if (this.destroyed) { this.app.destroy(true); return; }
    const canvas = this.app.canvas;
    canvas.style.touchAction = 'none';
    canvas.style.display = 'block';
    this.host.appendChild(canvas);
    this.W = this.host.clientWidth; this.H = this.host.clientHeight;

    const firstSetup = p.order.length === p.N && p.tray.length === 0 && [...p.groups.values()].every((g) => g.x === 0 && g.y === 0 && !g.placed);
    if (firstSetup && this.settings.tray) for (const g of [...p.groups.values()]) p.putInTray(g);
    this.trayH = this.settings.tray ? this.trayHeight() : 0;
    this.table = this.computeTable();
    this.fit(false);
    if (this.settings.tray) this.fitBoard(false);

    // textures: piece and shadow sheets, built in a worker
    const maxTex = Math.min(4096, (this.app.renderer as unknown as { gl?: WebGLRenderingContext }).gl?.getParameter(0x0d33) ?? 4096);
    const mobile = matchMedia('(pointer: coarse)').matches;
    const pad = p.s * 0.44;
    const want = Math.min(window.devicePixelRatio || 1, 2) * this.cam.fitK * 2.4;
    const scale = chooseScale(p.cw, p.ch, pad, p.N, want, mobile ? 18e6 : 36e6);
    const res = await buildSheets({ picture: this.picture, paths: p.paths, cols: p.spec.cols, rows: p.spec.rows, cw: p.cw, ch: p.ch, pad, scale, maxSheet: maxTex, outline: this.settings.outline });
    if (this.destroyed) return;
    this.layout = res.layout;
    this.hues = res.hues;
    this.makeTextures(res, pad);

    // scene
    this.bg = new TilingSprite({ texture: Texture.from(surfaceCanvas(this.settings.surface)), width: 10, height: 10 });
    this.app.stage.addChild(this.bg, this.world, this.trayLayer, this.confettiLayer);
    this.ghost = new Sprite(Texture.from(this.picture as ImageBitmap));
    this.ghost.width = p.BW; this.ghost.height = p.BH; this.ghost.alpha = 0;
    this.finishSprite = new Sprite(this.ghost.texture);
    this.finishSprite.width = p.BW; this.finishSprite.height = p.BH; this.finishSprite.alpha = 0;
    this.world.addChild(this.boardG, this.ghost, this.placedLayer, this.looseLayer, this.finishSprite, this.fxLayer);
    this.drawBoard();
    this.applyCam();
    this.trayLayer.addChild(this.trayBg, this.trayItems);

    for (let i = 0; i < p.N; i++) this.paths2d[i] = this.toPath2D(i);
    for (const g of p.groups.values()) this.buildView(g);
    this.layoutTray();
    if (firstSetup && !this.settings.tray) this.introScatter();

    // input
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.keyHandler);
    this.resizeObs = new ResizeObserver(() => this.onResize());
    this.resizeObs.observe(this.host);
    this.app.ticker.add(() => this.tick());
    this.emitProgress();
  }

  private makeTextures(res: SheetResult<Drawable>, pad: number) {
    const L = res.layout, p = this.puzzle;
    const sheetTex = res.sheets.map((s) => Texture.from(s as ImageBitmap));
    const shadowTex = res.shadows.map((s) => Texture.from(s as ImageBitmap));
    const ew = p.cw + 2 * pad, eh = p.ch + 2 * pad;
    for (let i = 0; i < p.N; i++) {
      const k = Math.floor(i / L.perSheet), q = i % L.perSheet;
      const x = (q % L.perRow) * L.cellW, y = Math.floor(q / L.perRow) * L.cellH;
      this.pieceTex[i] = new Texture({ source: sheetTex[k].source, frame: new Rectangle(x, y, L.cellW, L.cellH) });
      const ss = L.shadowScale;
      this.shadowTex[i] = new Texture({ source: shadowTex[k].source, frame: new Rectangle(Math.floor(x * ss), Math.floor(y * ss), Math.floor(L.cellW * ss), Math.floor(L.cellH * ss)) });
      const sp = new Sprite(this.pieceTex[i]);
      sp.position.set(p.col(i) * p.cw - pad, p.row(i) * p.ch - pad);
      sp.width = ew; sp.height = eh;
      this.pieceSprites[i] = sp;
      const sh = new Sprite(this.shadowTex[i]);
      sh.width = ew; sh.height = eh; sh.tint = 0x000000;
      sh.position.set(p.col(i) * p.cw - pad, p.row(i) * p.ch - pad);
      this.shadowSprites[i] = sh;
    }
  }

  private toPath2D(i: number) {
    const path = new Path2D();
    tracePath(path, this.puzzle.paths[i]);
    return path;
  }

  private drawBoard() {
    const p = this.puzzle, g = this.boardG, dark = SURFACES.find((s) => s.id === this.settings.surface)?.dark ?? false;
    g.clear();
    const m = p.s * 0.06;
    // soft drop shadow under the board
    for (let k = 4; k >= 1; k--) g.roundRect(-m * k * 0.6, -m * k * 0.3, p.BW + m * k * 1.2, p.BH + m * k * 1.2, m * 2).fill({ color: 0x000000, alpha: 0.025 });
    g.roundRect(-m, -m, p.BW + 2 * m, p.BH + 2 * m, m).fill({ color: dark ? 0x000000 : 0xffffff, alpha: dark ? 0.22 : 0.45 });
    g.rect(0, 0, p.BW, p.BH).fill({ color: dark ? 0x000000 : 0x6b5a45, alpha: dark ? 0.28 : 0.1 });
    g.rect(0, 0, p.BW, p.BH).stroke({ color: dark ? 0xffffff : 0x000000, alpha: 0.12, width: Math.max(1, p.s * 0.008) });
  }

  private buildView(g: Group) {
    const v = new GroupView(g);
    this.views.set(g.id, v);
    this.viewOf.set(v.c, v);
    for (const i of g.pieces) { v.pieces.addChild(this.pieceSprites[i]); v.shadows.addChild(this.shadowSprites[i]); }
    if (g.placed) {
      v.shadows.visible = false;
      this.placedLayer.addChild(v.c);
    } else {
      this.looseLayer.addChild(v.c);
    }
    v.c.visible = !g.tray && !this.hiddenByFilter(g);
    this.syncView(v);
    this.updateShadow(v);
    return v;
  }

  private syncView(v: GroupView) {
    v.c.position.set(v.g.x, v.g.y);
    v.c.rotation = v.g.rot * Math.PI / 2;
  }

  private updateShadow(v: GroupView) {
    const s = this.puzzle.s;
    const lift = v.lifted ? 1 : 0;
    const dx = s * (0.028 + lift * 0.05), dy = s * (0.05 + lift * 0.09);
    // shadow offset is in world space; convert into the group's rotated frame
    const r = v.g.rot;
    const [lx, ly] = r === 0 ? [dx, dy] : r === 1 ? [dy, -dx] : r === 2 ? [-dx, -dy] : [-dy, dx];
    v.shadows.position.set(lx, ly);
    v.shadows.alpha = v.lifted ? 0.42 : 0.3;
    v.pieces.position.set(0, 0);
    if (v.lifted) {
      const [ux, uy] = r === 0 ? [0, -s * 0.03] : r === 1 ? [-s * 0.03, 0] : r === 2 ? [0, s * 0.03] : [s * 0.03, 0];
      v.pieces.position.set(ux, uy);
    }
  }

  private hiddenByFilter(g: Group) { return this.edgesOnly && !g.placed && !g.hasEdge; }

  private computeTable(): Rect {
    const p = this.puzzle;
    const avW = Math.max(200, this.W - this.insets.left - this.insets.right);
    const avH = Math.max(200, this.H - this.insets.top - this.insets.bottom - this.trayH);
    if (this.settings.tray) {
      // the tray holds the pieces: the table only needs a margin to sort pieces into
      const onTable = Math.min(p.N, Math.max(12, p.N * 0.12));
      return tableFor(p, avW / avH, onTable);
    }
    return tableFor(p, avW / avH, p.N);
  }

  private trayHeight() { return Math.round(Math.min(132, Math.max(96, this.H * 0.14))); }

  // ------------------------------------------------------------------ camera
  setInsets(i: Partial<typeof this.insets>) { Object.assign(this.insets, i); this.onResize(); }

  fit(animate = true) {
    const t = this.table;
    const avW = this.W - this.insets.left - this.insets.right;
    const avH = this.H - this.insets.top - this.insets.bottom - this.trayH;
    const k = Math.min(avW / t.w, avH / t.h) * 0.98;
    this.cam.fitK = k;
    const target = { k, x: this.insets.left + (avW - t.w * k) / 2 - t.x * k, y: this.insets.top + (avH - t.h * k) / 2 - t.y * k };
    this.setCam(target, animate);
  }

  fitBoard(animate = true) {
    const p = this.puzzle, m = p.s * 0.4;
    const avW = this.W - this.insets.left - this.insets.right, avH = this.H - this.insets.top - this.insets.bottom - this.trayH;
    const k = Math.min(avW / (p.BW + 2 * m), avH / (p.BH + 2 * m));
    this.setCam({ k, x: this.insets.left + (avW - p.BW * k) / 2, y: this.insets.top + (avH - p.BH * k) / 2 }, animate);
  }

  private setCam(to: { k: number; x: number; y: number }, animate: boolean) {
    if (animate && !this.settings.reduceMotion) this.camAnim = { t0: performance.now(), dur: 420, from: { k: this.cam.k, x: this.cam.x, y: this.cam.y }, to };
    else { this.camAnim = null; Object.assign(this.cam, to); this.applyCam(); }
  }

  zoomBy(f: number, sx = this.W / 2, sy = (this.H - this.trayH) / 2) {
    this.camAnim = null;
    const k2 = Math.max(this.cam.fitK * 0.5, Math.min(this.cam.fitK * 8, this.cam.k * f));
    const r = k2 / this.cam.k;
    this.cam.x = sx - (sx - this.cam.x) * r; this.cam.y = sy - (sy - this.cam.y) * r; this.cam.k = k2;
    this.clampCam();
    this.applyCam();
  }

  private clampCam() {
    // keep at least part of the table on screen
    const t = this.table, k = this.cam.k, m = 120;
    const minX = m - (t.x + t.w) * k, maxX = this.W - m - t.x * k;
    const minY = m - (t.y + t.h) * k, maxY = this.H - this.trayH - m - t.y * k;
    this.cam.x = Math.max(minX, Math.min(maxX, this.cam.x));
    this.cam.y = Math.max(minY, Math.min(maxY, this.cam.y));
  }

  private applyCam() {
    if (!this.bg) { this.world.scale.set(this.cam.k); this.world.position.set(this.cam.x, this.cam.y); return; }
    this.world.scale.set(this.cam.k);
    this.world.position.set(this.cam.x, this.cam.y);
    // the table surface moves with the camera but is drawn at screen size
    this.bg.width = this.W; this.bg.height = this.H;
    const ts = Math.max(0.35, Math.min(1.6, this.cam.k / this.cam.fitK)) * 0.6;
    this.bg.tileScale.set(ts);
    this.bg.tilePosition.set(this.cam.x, this.cam.y);
  }

  private toWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.cam.x) / this.cam.k, (sy - this.cam.y) / this.cam.k];
  }

  private onResize() {
    if (!this.layout) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.W = w; this.H = h;
    this.trayH = this.settings.tray ? this.trayHeight() : 0;
    this.table = this.computeTable();
    this.fit(false);
    if (this.settings.tray && !this.finished) this.fitBoard(false);
    this.layoutTray();
  }

  // ------------------------------------------------------------------ frame loop
  private tick() {
    const now = performance.now();
    const dt = Math.min(100, this.app.ticker.deltaMS);
    if (this.started && !this.finished && !this.paused && !document.hidden) this.puzzle.elapsed += dt;

    if (this.camAnim) {
      const a = this.camAnim, t = Math.min(1, (now - a.t0) / a.dur), e = EASE(t);
      this.cam.k = a.from.k + (a.to.k - a.from.k) * e;
      this.cam.x = a.from.x + (a.to.x - a.from.x) * e;
      this.cam.y = a.from.y + (a.to.y - a.from.y) * e;
      this.applyCam();
      if (t >= 1) this.camAnim = null;
    }
    for (const v of this.views.values()) if (v.anim) this.stepAnim(v, now);

    // drag near the edge of the screen pans the table
    if (this.drag) {
      const pt = this.pointers.get(this.drag.id);
      if (pt) {
        const edge = 36, speed = 9;
        let dx = 0, dy = 0;
        if (pt.x < edge) dx = speed; else if (pt.x > this.W - edge) dx = -speed;
        if (pt.y < this.insets.top + edge) dy = speed; else if (!this.settings.tray && pt.y > this.H - edge) dy = -speed;
        if (dx || dy) {
          this.cam.x += dx; this.cam.y += dy; this.clampCam(); this.applyCam();
          const [wx, wy] = this.toWorld(pt.x, pt.y);
          this.puzzle.move(this.drag.v.g, wx - this.drag.wx, wy - this.drag.wy);
          this.drag.wx = wx; this.drag.wy = wy;
          this.syncView(this.drag.v);
        }
      }
    }
    // tray inertia
    if (!this.trayPress && Math.abs(this.trayVel) > 0.1) {
      this.trayScroll += this.trayVel; this.trayVel *= 0.93; this.clampTray(); this.positionTrayItems();
    }
    // effects
    for (let k = this.flashes.length - 1; k >= 0; k--) {
      const f = this.flashes[k], t = (now - f.t0) / 600;
      if (t >= 1) { f.s.destroy(); this.flashes.splice(k, 1); continue; }
      f.s.alpha = 0.9 * (1 - t);
    }
    if (this.hintState) {
      const t = (now - this.hintState.t0) / 1000;
      this.hintState.marks.alpha = 0.35 + 0.3 * Math.sin(t * 6);
      const v = this.views.get(this.hintState.gid);
      if (v) v.pieces.alpha = 0.75 + 0.25 * Math.cos(t * 6);
      if (t > 6) this.clearHint();
    }
    this.ghost.alpha += ((this.peekOn ? 1 : this.ghostAlpha) - this.ghost.alpha) * 0.25;
    if (this.finished) this.stepFinish(now);
  }

  private stepAnim(v: GroupView, now: number) {
    const a = v.anim!, t = Math.min(1, (now - a.t0) / a.dur);
    if (t < 0) return;
    const e = EASE(t);
    const r = a.fr + (a.tr - a.fr) * e;
    if (a.px !== undefined) {
      const d = r - a.fr, cs = Math.cos(d), sn = Math.sin(d);
      const ox = a.fx - a.px, oy = a.fy - a.py!;
      v.c.position.set(a.px + ox * cs - oy * sn, a.py! + ox * sn + oy * cs);
    } else {
      v.c.position.set(a.fx + (a.tx - a.fx) * e, a.fy + (a.ty - a.fy) * e);
    }
    v.c.rotation = r;
    if (t >= 1) { v.anim = null; this.syncView(v); a.done?.(); }
  }

  /** Animate a view from where it is drawn now to where its group really is. */
  private animateTo(v: GroupView, dur: number, pivot?: [number, number], delay = 0, done?: () => void) {
    if (this.settings.reduceMotion) dur = Math.min(dur, 80);
    const tr0 = v.g.rot * Math.PI / 2;
    let fr = v.c.rotation;
    // shortest way round
    while (tr0 - fr > Math.PI) fr += Math.PI * 2;
    while (fr - tr0 > Math.PI) fr -= Math.PI * 2;
    v.anim = { t0: performance.now() + delay, dur, fx: v.c.x, fy: v.c.y, fr, tx: v.g.x, ty: v.g.y, tr: tr0, px: pivot?.[0], py: pivot?.[1], done };
  }

  // ------------------------------------------------------------------ input
  private onDown = (e: PointerEvent) => {
    if (this.finished) { this.startPan(e); return; }
    try { this.app.canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or already released pointer */ }
    this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (this.pointers.size === 2 && !this.drag) {
      this.pan = null; this.trayPress = null;
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }
    if (this.pointers.size > 1) return;
    const sx = e.offsetX, sy = e.offsetY;
    if (this.settings.tray && sy > this.H - this.trayH) {
      const item = this.trayItemAt(sx, sy);
      this.trayPress = { id: e.pointerId, x: sx, y: sy, scroll0: this.trayScroll, item, mode: 'press' };
      this.trayVel = 0;
      return;
    }
    const [wx, wy] = this.toWorld(sx, sy);
    const v = this.hit(wx, wy, e.pointerType !== 'mouse');
    if (v && e.button === 2 && this.puzzle.spec.rotation) { this.rotateView(v, wx, wy); return; }
    if (v) this.pickUp(v, e.pointerId, wx, wy, sx, sy, false);
    else this.startPan(e);
  };

  private startPan(e: PointerEvent) {
    this.pan = { id: e.pointerId, x: e.offsetX, y: e.offsetY, cx: this.cam.x, cy: this.cam.y, moved: false, t: performance.now() };
    this.camAnim = null;
  }

  private pickUp(v: GroupView, id: number, wx: number, wy: number, sx: number, sy: number, fromTray: boolean) {
    v.anim = null; this.syncView(v);
    this.puzzle.toFront(v.g);
    this.looseLayer.addChild(v.c); // on top
    v.lifted = true; this.updateShadow(v);
    this.drag = { v, id, wx, wy, sx, sy, t: performance.now(), moved: fromTray, fromTray };
    if (!this.started) { this.started = true; this.events.firstMove(); }
    if (this.lastHintGid !== v.g.id) { this.clearHint(); this.lastHintGid = -1; }
    sfx.pick();
    this.app.canvas.style.cursor = 'grabbing';
  }

  private onMove = (e: PointerEvent) => {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    const sx = e.offsetX, sy = e.offsetY;
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.cam.x += mx - this.pinch.mx; this.cam.y += my - this.pinch.my;
      this.zoomBy(d / this.pinch.d, mx, my);
      this.pinch = { d, mx, my };
      return;
    }
    if (this.drag && e.pointerId === this.drag.id) {
      const [wx, wy] = this.toWorld(sx, sy);
      this.puzzle.move(this.drag.v.g, wx - this.drag.wx, wy - this.drag.wy);
      this.drag.wx = wx; this.drag.wy = wy;
      if (Math.hypot(sx - this.drag.sx, sy - this.drag.sy) > 6) this.drag.moved = true;
      this.syncView(this.drag.v);
      this.trayHighlight(this.settings.tray && sy > this.H - this.trayH && this.drag.v.g.pieces.length === 1);
      return;
    }
    if (this.trayPress && e.pointerId === this.trayPress.id) {
      const tp = this.trayPress, dx = sx - tp.x, dy = sy - tp.y;
      if (tp.mode === 'press') {
        if (tp.item && dy < -14 && Math.abs(dy) > Math.abs(dx) * 0.8) { this.pullFromTray(tp.item, e.pointerId, sx, sy); this.trayPress = null; return; }
        if (Math.abs(dx) > 8) tp.mode = 'scroll';
      }
      if (tp.mode === 'scroll') {
        const prev = this.trayScroll;
        this.trayScroll = tp.scroll0 - dx;
        this.clampTray();
        this.trayVel = this.trayScroll - prev;
        this.positionTrayItems();
      }
      return;
    }
    if (this.pan && e.pointerId === this.pan.id) {
      if (Math.hypot(sx - this.pan.x, sy - this.pan.y) > 5) this.pan.moved = true;
      this.cam.x = this.pan.cx + sx - this.pan.x; this.cam.y = this.pan.cy + sy - this.pan.y;
      this.clampCam(); this.applyCam();
      return;
    }
    // hover cursor
    if (e.pointerType === 'mouse' && !this.finished) {
      const [wx, wy] = this.toWorld(sx, sy);
      this.app.canvas.style.cursor = this.hit(wx, wy, false) ? 'grab' : 'default';
    }
  };

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.pinch && this.pointers.size < 2) this.pinch = null;
    const sx = e.offsetX, sy = e.offsetY;
    if (this.drag && e.pointerId === this.drag.id) {
      const d = this.drag; this.drag = null;
      d.v.lifted = false; this.updateShadow(d.v);
      this.trayHighlight(false);
      this.app.canvas.style.cursor = 'grab';
      const quick = !d.moved && performance.now() - d.t < 350;
      if (quick && this.puzzle.spec.rotation) { this.rotateView(d.v, d.wx, d.wy); return; }
      if (this.settings.tray && sy > this.H - this.trayH && d.v.g.pieces.length === 1) { this.returnToTray(d.v, sx); return; }
      if (!quick) this.puzzle.moves++;
      this.drop(d.v);
      return;
    }
    if (this.trayPress && e.pointerId === this.trayPress.id) {
      const tp = this.trayPress; this.trayPress = null;
      if (tp.mode === 'press' && tp.item && this.puzzle.spec.rotation) {
        const g = this.puzzle.groups.get(tp.item.gid)!;
        g.rot = ((g.rot + 1) % 4) as Rot;
        sfx.rotate();
        this.layoutTray();
        this.events.changed();
      }
      return;
    }
    if (this.pan && e.pointerId === this.pan.id) {
      const p = this.pan; this.pan = null;
      if (!p.moved) {
        const now = performance.now();
        if (now - this.lastTap.t < 320 && Math.hypot(sx - this.lastTap.x, sy - this.lastTap.y) < 30) this.fit(true);
        this.lastTap = { t: now, x: sx, y: sy };
      }
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (this.settings.tray && e.offsetY > this.H - this.trayH) {
      this.trayScroll += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY);
      this.clampTray(); this.positionTrayItems();
      return;
    }
    if (this.drag && this.puzzle.spec.rotation) {
      this.rotateView(this.drag.v, this.drag.wx, this.drag.wy, e.deltaY > 0 ? 1 : -1);
      return;
    }
    const k = e.ctrlKey ? 0.012 : 0.0018;
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.6 && e.deltaMode === 0) {
      // two-finger trackpad scroll pans
      this.cam.x -= e.deltaX; this.cam.y -= e.deltaY; this.clampCam(); this.applyCam();
      return;
    }
    this.zoomBy(Math.exp(-dy * k), e.offsetX, e.offsetY);
  };

  private onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.closest?.('input,textarea,select,dialog,[role=dialog]')) return;
    const k = e.key;
    if (k === '+' || k === '=') this.zoomBy(1.25);
    else if (k === '-' || k === '_') this.zoomBy(0.8);
    else if (k === '0') this.fit(true);
    else if (k === 'ArrowLeft') { this.cam.x += 60; this.clampCam(); this.applyCam(); }
    else if (k === 'ArrowRight') { this.cam.x -= 60; this.clampCam(); this.applyCam(); }
    else if (k === 'ArrowUp') { this.cam.y += 60; this.clampCam(); this.applyCam(); }
    else if (k === 'ArrowDown') { this.cam.y -= 60; this.clampCam(); this.applyCam(); }
    else if ((k === 'r' || k === 'R') && this.drag && this.puzzle.spec.rotation) this.rotateView(this.drag.v, this.drag.wx, this.drag.wy, k === 'R' ? -1 : 1);
    else return;
    e.preventDefault();
  }

  /** Topmost loose group under a world point. Touch gets a little extra reach. */
  private hit(wx: number, wy: number, generous: boolean): GroupView | null {
    const p = this.puzzle, pad = p.s * 0.44, slack = generous ? p.s * 0.12 : 0;
    const kids = this.looseLayer.children;
    let near: GroupView | null = null;
    for (let n = kids.length - 1; n >= 0; n--) {
      const v = this.viewOf.get(kids[n] as Container);
      if (!v || !v.c.visible || v.g.placed || v.g.tray) continue;
      const [bx, by] = p.toBoard(v.g, wx, wy);
      for (const i of v.g.pieces) {
        const lx = bx - p.col(i) * p.cw, ly = by - p.row(i) * p.ch;
        if (lx < -pad || ly < -pad || lx > p.cw + pad || ly > p.ch + pad) continue;
        if (this.hitCtx.isPointInPath(this.paths2d[i], lx, ly)) return v;
        if (!near && slack && lx > -slack && ly > -slack && lx < p.cw + slack && ly < p.ch + slack) near = v;
      }
    }
    return near;
  }

  // ------------------------------------------------------------------ moves
  private rotateView(v: GroupView, wx: number, wy: number, dir: 1 | -1 = 1) {
    const before = { x: v.c.x, y: v.c.y, r: v.c.rotation };
    this.puzzle.rotate(v.g, wx, wy, dir);
    v.c.position.set(before.x, before.y); v.c.rotation = before.r;
    this.animateTo(v, 180, [wx, wy], 0, () => { this.updateShadow(v); if (!this.drag || this.drag.v !== v) this.drop(v); });
    this.updateShadow(v);
    sfx.rotate();
    this.events.changed();
  }

  private drop(v: GroupView) {
    const p = this.puzzle;
    // magnet distance: a fraction of a piece, but never less than ~16 screen pixels
    const tol = Math.min(p.s * 0.38, Math.max(p.s * 0.2, 16 / this.cam.k));
    const res = p.snap(v.g, tol);
    if (!res) { sfx.drop(); this.events.changed(); return; }
    const sv = this.views.get(res.survivor.id)!;
    for (const id of res.absorbed) {
      const ov = this.views.get(id);
      if (!ov) continue;
      // every view's local frame is the board frame, so sprites move across unchanged
      for (const sp of [...ov.pieces.children]) sv.pieces.addChild(sp);
      for (const sh of [...ov.shadows.children]) sv.shadows.addChild(sh);
      ov.c.destroy({ children: false });
      this.views.delete(id);
    }
    if (res.survivor.placed) {
      this.placedLayer.addChild(sv.c);
      sv.shadows.visible = false;
    }
    sv.c.visible = !this.hiddenByFilter(res.survivor);
    this.animateTo(sv, 110);
    this.updateShadow(sv);
    this.flash(res.survivor);
    if (res.placed && !res.joined) sfx.board(); else sfx.snap(res.joined);
    if (this.hintState && (res.absorbed.includes(this.hintState.gid) || res.survivor.id === this.hintState.gid)) this.clearHint();
    this.emitProgress();
    this.events.changed();
    this.checkDone();
  }

  private flash(g: Group) {
    const v = this.views.get(g.id);
    if (!v) return;
    for (const i of g.pieces.slice(-80)) {
      const s = new Sprite(this.pieceTex[i]);
      s.position.copyFrom(this.pieceSprites[i].position);
      s.width = this.pieceSprites[i].width; s.height = this.pieceSprites[i].height;
      s.tint = 0xffffff; s.blendMode = 'add'; s.alpha = 0.9;
      v.pieces.addChild(s);
      this.flashes.push({ s, t0: performance.now() });
    }
  }

  private checkDone() {
    const p = this.puzzle;
    if (this.finished) return;
    if (p.complete) { this.finish(); return; }
    if (p.groups.size === 1) {
      const g = [...p.groups.values()][0], v = this.views.get(g.id)!;
      p.placeGroup(g);
      this.placedLayer.addChild(v.c);
      v.shadows.visible = false;
      this.animateTo(v, 650, undefined, 0, () => this.finish());
    }
  }

  // ------------------------------------------------------------------ tray
  private trayItemAt(sx: number, _sy: number): TrayItem | null {
    const slot = this.trayH * 0.9;
    for (const it of this.trayList) if (Math.abs(sx - (it.x - this.trayScroll)) < slot / 2) return it;
    return null;
  }

  private layoutTray() {
    this.trayLayer.visible = this.settings.tray;
    if (!this.settings.tray) return;
    const p = this.puzzle;
    const H = this.trayH, y0 = this.H - H;
    this.trayBg.clear();
    this.trayBg.rect(0, y0 - 18, this.W, 18).fill({ color: 0x000000, alpha: 0.0 });
    for (let k = 0; k < 6; k++) this.trayBg.rect(0, y0 - k * 3, this.W, 3).fill({ color: 0x000000, alpha: 0.03 * (6 - k) / 6 });
    this.trayBg.rect(0, y0, this.W, H).fill({ color: 0x15130f, alpha: 0.82 });
    this.trayBg.rect(0, y0, this.W, 1).fill({ color: 0xffffff, alpha: 0.12 });
    for (const it of this.trayList) it.sprite.destroy();
    this.trayItems.removeChildren();
    this.trayList = [];
    const slot = H * 0.9, pad = p.s * 0.44;
    const scale = (slot * 0.92) / (Math.max(p.cw, p.ch) + 2 * pad);
    let x = slot * 0.6;
    for (const gid of p.tray) {
      const g = p.groups.get(gid)!;
      if (this.hiddenByFilter(g)) continue;
      const i = g.pieces[0];
      const s = new Sprite(this.pieceTex[i]);
      s.anchor.set(0.5);
      s.width = (p.cw + 2 * pad) * scale; s.height = (p.ch + 2 * pad) * scale;
      s.rotation = g.rot * Math.PI / 2;
      this.trayItems.addChild(s);
      this.trayList.push({ gid, sprite: s, x });
      x += slot * 0.86;
    }
    this.clampTray();
    this.positionTrayItems();
  }

  private clampTray() {
    const slot = this.trayH * 0.9;
    const max = Math.max(0, this.trayList.length * slot * 0.86 + slot * 0.4 - this.W);
    if (this.trayScroll < 0) { this.trayScroll = 0; this.trayVel = 0; }
    if (this.trayScroll > max) { this.trayScroll = max; this.trayVel = 0; }
  }

  private positionTrayItems() {
    const y = this.H - this.trayH / 2;
    for (const it of this.trayList) {
      const x = it.x - this.trayScroll;
      it.sprite.position.set(x, y);
      it.sprite.visible = x > -this.trayH && x < this.W + this.trayH;
    }
  }

  private trayHighlight(on: boolean) { this.trayBg.tint = on ? 0x9fd3ff : 0xffffff; }

  private pullFromTray(item: TrayItem, id: number, sx: number, sy: number) {
    const p = this.puzzle, g = p.groups.get(item.gid)!;
    p.takeFromTray(g);
    const [wx, wy] = this.toWorld(sx, sy);
    p.moveCentreTo(g, g.pieces[0], wx, wy - p.s * 0.2);
    const v = this.views.get(g.id)!;
    v.c.visible = true;
    this.syncView(v);
    this.layoutTray();
    this.pickUp(v, id, wx, wy, sx, sy, true);
    this.events.changed();
  }

  private returnToTray(v: GroupView, sx: number) {
    const p = this.puzzle;
    const slot = this.trayH * 0.9;
    const idx = Math.max(0, Math.round((sx + this.trayScroll - slot * 0.6) / (slot * 0.86)));
    // index in the visible list → index in the full tray
    const visible = this.trayList.map((t) => t.gid);
    const before = visible[idx];
    const full = before !== undefined ? p.tray.indexOf(before) : p.tray.length;
    p.putInTray(v.g, full);
    v.c.visible = false;
    sfx.tray();
    this.layoutTray();
    this.events.changed();
  }

  // ------------------------------------------------------------------ helpers for the HUD
  setGhost(on: boolean) { this.ghostAlpha = on ? 0.32 : 0; }
  peek(on: boolean) { this.peekOn = on; }
  setEdgesOnly(on: boolean) {
    this.edgesOnly = on;
    for (const v of this.views.values()) v.c.visible = !v.g.tray && !this.hiddenByFilter(v.g);
    this.layoutTray();
  }
  setSurface(id: string) {
    this.settings.surface = id;
    this.bg.texture = Texture.from(surfaceCanvas(id));
    this.drawBoard();
  }
  setPaused(on: boolean) { this.paused = on; }
  get isStarted() { return this.started; }
  markStarted() { this.started = true; }

  private introScatter() {
    // show the finished picture for a moment, then break it apart
    for (const v of this.views.values()) { v.c.position.set(0, 0); v.c.rotation = 0; }
    this.arrangeLoose('scatter', 650);
  }

  /** Keep the Puzzle's z-order in step with the drawing order. */
  private syncOrder() {
    this.puzzle.order = this.looseLayer.children.map((c) => this.viewOf.get(c as Container)?.g).filter((g): g is Group => !!g && !g.placed && !g.tray).map((g) => g.id);
  }

  tidy() { this.arrangeLoose('tidy'); }
  scatter() { this.arrangeLoose('scatter'); }
  sortColour() { this.arrangeLoose('colour'); }

  private arrangeLoose(mode: 'tidy' | 'scatter' | 'colour', delay = 0) {
    if (this.finished) return;
    if (this.settings.tray && mode !== 'scatter') {
      // in tray mode, sorting reorders the tray
      const p = this.puzzle;
      const key = (gid: number) => {
        const i = p.groups.get(gid)!.pieces[0];
        return mode === 'tidy' ? (p.isEdge[i] ? 0 : 1) * 1e6 + i : this.hues[i];
      };
      p.tray.sort((a, b) => key(a) - key(b));
      this.trayScroll = 0;
      this.layoutTray();
      this.events.changed();
      return;
    }
    const moves = arrange(this.puzzle, this.table, mode, this.rnd, this.hues);
    const n = moves.length, step = Math.min(8, 700 / Math.max(1, n));
    moves.forEach(({ g, cx, cy }, k) => {
      const v = this.views.get(g.id)!;
      this.puzzle.moveCentreTo(g, g.pieces[0], cx, cy);
      this.animateTo(v, 650, undefined, delay + (mode === 'scatter' ? k * step : k * step * 0.5));
      if (mode === 'scatter') this.looseLayer.addChild(v.c);
    });
    if (mode === 'scatter') this.syncOrder();
    this.events.changed();
  }

  /** Show which piece to move and where it goes. A second hint for the same piece moves it there. */
  hint() {
    if (this.finished) return;
    const p = this.puzzle;
    const h = p.hint();
    if (!h) return;
    const g = h.group;
    if (this.lastHintGid === g.id) {
      // second request: move it into place for the player
      this.clearHint();
      if (g.tray) { p.takeFromTray(g); const v0 = this.views.get(g.id)!; v0.c.visible = true; const [cx, cy] = this.trayWorldPos(g); p.moveCentreTo(g, g.pieces[0], cx, cy); this.syncView(v0); this.layoutTray(); }
      const v = this.views.get(g.id)!;
      g.x = h.x; g.y = h.y; g.rot = h.rot;
      this.puzzle.toFront(g); this.looseLayer.addChild(v.c);
      this.animateTo(v, 700, undefined, 0, () => this.drop(v));
      this.updateShadow(v);
      return;
    }
    this.clearHint();
    this.lastHintGid = g.id;
    p.hints++;
    this.events.hintUsed();
    sfx.hint();
    // ghost outline of the group at its destination
    const marks = new Container();
    const pad = p.s * 0.44;
    for (const i of g.pieces) {
      const s = new Sprite(this.pieceTex[i]);
      s.position.set(p.col(i) * p.cw - pad, p.row(i) * p.ch - pad);
      s.width = p.cw + 2 * pad; s.height = p.ch + 2 * pad;
      s.tint = 0xfff1c4; s.alpha = 0.8;
      marks.addChild(s);
    }
    marks.position.set(h.x, h.y); marks.rotation = h.rot * Math.PI / 2;
    this.fxLayer.addChild(marks);
    this.hintState = { gid: g.id, t0: performance.now(), marks };
    if (g.tray) {
      // scroll the tray to show the piece
      const it = this.trayList.find((t) => t.gid === g.id);
      if (it) { this.trayScroll = it.x - this.W / 2; this.clampTray(); this.positionTrayItems(); it.sprite.tint = 0xfff1c4; }
    } else {
      // make sure both the piece and its destination are on screen
      const box = groupBox(p, g, p.s);
      const [ax, ay] = [box.x * this.cam.k + this.cam.x, box.y * this.cam.k + this.cam.y];
      if (ax < 0 || ay < this.insets.top || ax > this.W || ay > this.H - this.trayH) this.fit(true);
    }
  }

  private trayWorldPos(g: Group): [number, number] {
    const it = this.trayList.find((t) => t.gid === g.id);
    const sx = it ? it.x - this.trayScroll : this.W / 2;
    return this.toWorld(sx, this.H - this.trayH * 1.2);
  }

  private clearHint() {
    if (!this.hintState) return;
    this.hintState.marks.destroy({ children: true });
    const v = this.views.get(this.hintState.gid);
    if (v) v.pieces.alpha = 1;
    for (const t of this.trayList) t.sprite.tint = 0xffffff;
    this.hintState = null;
  }

  private emitProgress() {
    const p = this.puzzle;
    this.events.progress({ progress: p.progress, placed: p.placedCount, total: p.N });
  }

  // ------------------------------------------------------------------ finish
  private finish() {
    this.finished = true;
    this.finishT0 = performance.now();
    this.clearHint();
    this.trayLayer.visible = false;
    this.trayH = 0;
    this.fitBoard(true);
    sfx.complete();
    window.setTimeout(() => this.burst(), 500);
    window.setTimeout(() => this.events.complete(), 3200);
  }

  private stepFinish(now: number) {
    const t = (now - this.finishT0 - 300) / 1100;
    this.finishSprite.alpha = Math.max(0, Math.min(1, EASE(Math.max(0, t))));
    if (this.fireworks && !this.fireworks.step(this.app.ticker.deltaMS / 1000)) {
      this.fireworks.destroy();
      this.fireworks = null;
    }
  }

  private burst() {
    if (this.settings.reduceMotion) return;
    this.fireworks = new Fireworks();
    this.fireworks.resize(this.W, this.H);
    this.confettiLayer.addChild(this.fireworks.layer);
    this.fireworks.show();
  }

  /** A share-ready image of the finished picture. */
  async snapshot(): Promise<Blob | null> {
    try {
      const cv = document.createElement('canvas');
      const pic = this.picture as ImageBitmap;
      cv.width = pic.width; cv.height = pic.height;
      cv.getContext('2d')!.drawImage(pic as CanvasImageSource, 0, 0);
      return await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.9));
    } catch { return null; }
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener('keydown', this.keyHandler);
    this.resizeObs?.disconnect();
    try {
      for (const t of this.pieceTex) t.destroy(false);
      this.app.destroy(true, { children: true, texture: true });
    } catch { /* already torn down */ }
  }
}

