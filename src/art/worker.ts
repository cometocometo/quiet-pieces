/// <reference lib="webworker" />
/**
 * Background worker: draws pictures and cuts piece textures off the main
 * thread so the interface never stutters.
 */
import { drawRecipe, type PictureRecipe } from './render';
import { buildPieceSheets, type SheetRequest } from '../engine/sheets';

export type WorkerRequest =
  | { t: 'pic'; job: number; recipe: PictureRecipe; w: number; h: number; encode: boolean }
  | ({ t: 'sheets'; job: number } & SheetRequest);

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const m = e.data;
  try {
    if (m.t === 'pic') {
      const canvas = drawRecipe(m.recipe, m.w, m.h) as OffscreenCanvas;
      const blob = m.encode ? await canvas.convertToBlob({ type: 'image/webp', quality: 0.92 }) : null;
      const bitmap = canvas.transferToImageBitmap();
      self.postMessage({ job: m.job, ok: true, bitmap, blob }, [bitmap]);
    } else if (m.t === 'sheets') {
      const out = buildPieceSheets(m);
      self.postMessage({ job: m.job, ok: true, ...out }, [...out.sheets, ...out.shadows]);
    }
  } catch (err) {
    self.postMessage({ job: m.job, ok: false, error: String(err) });
  }
};
