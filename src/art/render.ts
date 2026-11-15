/** Draw a picture from the catalog onto a canvas. Runs in a worker or on the main thread. */
import { mulberry32 } from '../engine/rng';
import { Noise, type Ctx2D, type Gen } from './lib';
import { GENERATORS } from './generators';

export interface PictureRecipe { gen: string; seed: number; v: number }

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

export function makeCanvas(w: number, h: number): { canvas: AnyCanvas; c: Ctx2D } {
  const canvas: AnyCanvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const c = canvas.getContext('2d') as Ctx2D;
  return { canvas, c };
}

export function drawRecipe(r: PictureRecipe, W: number, H: number): AnyCanvas {
  const { canvas, c } = makeCanvas(W, H);
  const gen = GENERATORS[r.gen];
  if (!gen) throw new Error(`Unknown picture generator: ${r.gen}`);
  const g: Gen = { c, W, H, rnd: mulberry32(r.seed), v: r.v, noise: new Noise(r.seed * 7 + 1), makeCanvas };
  c.save();
  gen(g);
  c.restore();
  return canvas;
}
