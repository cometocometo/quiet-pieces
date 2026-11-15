/**
 * Picture service: hands out ready-to-draw pictures and thumbnails.
 * Order of lookup: memory → on-device cache → draw in the worker (then cache).
 */
import { getImage, putImage, listUserPics, putUserPic, deleteUserPic } from '../data/db';
import { picture, registerUserPicture, userPictures, type Picture } from './catalog';
import { drawRecipe } from './render';
import type { SheetRequest, SheetResult } from '../engine/sheets';
import { buildPieceSheetsCanvas } from '../engine/sheets';

const supportsWorker = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' &&
  (() => { try { return !!new OffscreenCanvas(1, 1).getContext('2d'); } catch { return false; } })();

let worker: Worker | null = null;
let jobId = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: unknown) => void }>();

function getWorker(): Worker | null {
  if (!supportsWorker) return null;
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const p = pending.get(e.data.job);
      if (!p) return;
      pending.delete(e.data.job);
      e.data.ok ? p.resolve(e.data) : p.reject(new Error(e.data.error));
    };
    worker.onerror = () => { for (const p of pending.values()) p.reject(new Error('worker failed')); pending.clear(); worker = null; };
  }
  return worker;
}

function run<T>(msg: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> {
  const w = getWorker()!;
  const job = ++jobId;
  return new Promise<T>((resolve, reject) => {
    pending.set(job, { resolve, reject });
    w.postMessage({ ...msg, job }, transfer);
  });
}

export type Drawable = ImageBitmap | HTMLCanvasElement | OffscreenCanvas;

/** Full-size picture resolution, chosen for the device. */
export function fullSize(aspect: number): [number, number] {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const long = mem <= 2 ? 1600 : mem <= 4 ? 2000 : 2400;
  return aspect >= 1 ? [long, Math.round(long / aspect)] : [Math.round(long * aspect), long];
}
export const THUMB_W = 480;
export const CARD_W = 1280;

const memory = new Map<string, Promise<Drawable>>();
const MEMORY_KEEP = 3; // full-size pictures kept in memory
const bigKeys: string[] = [];

async function produce(pic: Picture, w: number, h: number, cacheKey: string): Promise<Drawable> {
  const cached = await getImage(cacheKey);
  if (cached) {
    try { return await createImageBitmap(cached); } catch { /* fall through and redraw */ }
  }
  if (pic.recipe) {
    if (supportsWorker) {
      const res = await run<{ bitmap: ImageBitmap; blob: Blob | null }>({ t: 'pic', recipe: pic.recipe, w, h, encode: true });
      if (res.blob) void putImage(cacheKey, res.blob);
      return res.bitmap;
    }
    await new Promise((r) => setTimeout(r)); // let the UI paint first
    return drawRecipe(pic.recipe, w, h);
  }
  // Image files (photos, licensed art) and the player's own photos.
  const url = pic.src ? (w <= THUMB_W && pic.thumb ? pic.thumb : pic.src) : null;
  const blob = url ? await (await fetch(url)).blob() : (await listUserPics()).find((u) => u.id === pic.id)?.blob;
  if (!blob) throw new Error(`Picture not found: ${pic.id}`);
  const bmp = await createImageBitmap(blob);
  if (bmp.width <= w && bmp.height <= h) return bmp;
  const k = Math.min(w / bmp.width, h / bmp.height);
  return createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * k), resizeHeight: Math.round(bmp.height * k), resizeQuality: 'high' });
}

export function loadPicture(id: string, kind: 'full' | 'card' | 'thumb' = 'full'): Promise<Drawable> {
  const pic = picture(id);
  if (!pic) return Promise.reject(new Error(`Unknown picture ${id}`));
  const tw = kind === 'card' ? CARD_W : THUMB_W;
  const [w, h] = kind === 'full' ? fullSize(pic.aspect) : [tw, Math.round(tw / pic.aspect)];
  const key = `${id}@${w}x${h}`;
  let p = memory.get(key);
  if (!p) {
    p = produce(pic, w, h, key);
    memory.set(key, p);
    p.catch(() => memory.delete(key));
    // keep only a few large pictures in memory; thumbnails are small
    if (kind !== 'thumb') {
      bigKeys.push(key);
      while (bigKeys.length > MEMORY_KEEP * 2) memory.delete(bigKeys.shift()!);
    }
  }
  return p;
}

/** Warm the cache in idle time so thumbnails appear instantly later. */
export function prefetchThumbs(ids: string[]) {
  let i = 0;
  const step = () => {
    if (i >= ids.length) return;
    void loadPicture(ids[i++], 'thumb').finally(() => (window.requestIdleCallback ?? setTimeout)(step));
  };
  step();
}

export async function buildSheets(req: SheetRequest): Promise<SheetResult<Drawable>> {
  if (supportsWorker) {
    const pic = await createImageBitmap(req.picture as ImageBitmap);
    return run<SheetResult>({ t: 'sheets', ...req, picture: pic }, [pic]);
  }
  await new Promise((r) => setTimeout(r));
  return buildPieceSheetsCanvas(req) as SheetResult<Drawable>;
}

// ---- the player's own pictures
export async function loadUserPictures() {
  for (const r of await listUserPics()) {
    registerUserPicture({ id: r.id, pack: 'mine', title: r.title, aspect: r.aspect });
  }
}

export async function importUserPicture(file: File): Promise<Picture> {
  const bmp = await createImageBitmap(file);
  // Crop very wide or tall photos to a playable shape, scale to at most 2400 px.
  let sw = bmp.width, sh = bmp.height, sx = 0, sy = 0;
  const a = sw / sh;
  if (a > 2) { sw = sh * 2; sx = (bmp.width - sw) / 2; }
  if (a < 0.5) { sh = sw * 2; sy = (bmp.height - sh) / 2; }
  const k = Math.min(1, 2400 / Math.max(sw, sh));
  const w = Math.round(sw * k), h = Math.round(sh * k);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d')!.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  const blob: Blob = await new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.9));
  const id = `mine/${Date.now().toString(36)}`;
  const title = file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'My picture';
  await putUserPic({ id, title, aspect: w / h, blob, createdAt: Date.now() });
  const pic: Picture = { id, pack: 'mine', title, aspect: w / h };
  registerUserPicture(pic);
  return pic;
}

export async function removeUserPicture(id: string) {
  await deleteUserPic(id);
  userPictures.delete(id);
  for (const k of [...memory.keys()]) if (k.startsWith(id + '@')) memory.delete(k);
}
