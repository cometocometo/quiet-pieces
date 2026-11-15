/**
 * On-device storage (IndexedDB). Everything the game remembers lives here:
 * puzzles in progress, rendered pictures, the player's own photos, profile and
 * settings. Every call fails soft: private browsing or blocked storage means
 * the game still runs, it just forgets on reload.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SavedPuzzle } from '../engine/puzzle';

export interface SaveRecord {
  id: string;
  pictureId: string;
  pieces: number;
  rotation: boolean;
  progress: number;
  createdAt: number;
  updatedAt: number;
  daily?: string;
  data: SavedPuzzle;
}

export interface UserPictureRecord {
  id: string;
  title: string;
  aspect: number;
  blob: Blob;
  createdAt: number;
}

interface Schema extends DBSchema {
  images: { key: string; value: { key: string; blob: Blob; at: number } };
  saves: { key: string; value: SaveRecord; indexes: { updatedAt: number } };
  kv: { key: string; value: unknown };
  userPics: { key: string; value: UserPictureRecord };
}

let dbp: Promise<IDBPDatabase<Schema> | null> | null = null;

function db(): Promise<IDBPDatabase<Schema> | null> {
  dbp ??= openDB<Schema>('quiet-pieces', 1, {
    upgrade(d) {
      d.createObjectStore('images', { keyPath: 'key' });
      d.createObjectStore('saves', { keyPath: 'id' }).createIndex('updatedAt', 'updatedAt');
      d.createObjectStore('kv');
      d.createObjectStore('userPics', { keyPath: 'id' });
    },
  }).catch(() => null);
  return dbp;
}

async function safe<T>(fn: (d: IDBPDatabase<Schema>) => Promise<T>, fallback: T): Promise<T> {
  try {
    const d = await db();
    return d ? await fn(d) : fallback;
  } catch {
    return fallback;
  }
}

// ---- rendered picture cache
const IMAGE_CACHE_LIMIT = 160;
export const getImage = (key: string) => safe(async (d) => (await d.get('images', key))?.blob ?? null, null as Blob | null);
export const putImage = (key: string, blob: Blob) => safe(async (d) => {
  await d.put('images', { key, blob, at: Date.now() });
  // keep the cache bounded: drop the oldest entries
  const count = await d.count('images');
  if (count > IMAGE_CACHE_LIMIT) {
    const all = await d.getAll('images');
    all.sort((a, b) => a.at - b.at);
    const tx = d.transaction('images', 'readwrite');
    for (const r of all.slice(0, count - IMAGE_CACHE_LIMIT)) void tx.store.delete(r.key);
    await tx.done;
  }
}, undefined);

// ---- saves
export const listSaves = () => safe(async (d) => (await d.getAllFromIndex('saves', 'updatedAt')).reverse(), [] as SaveRecord[]);
export const getSave = (id: string) => safe((d) => d.get('saves', id), undefined as SaveRecord | undefined);
export const putSave = (rec: SaveRecord) => safe((d) => d.put('saves', rec).then(() => undefined), undefined);
export const deleteSave = (id: string) => safe((d) => d.delete('saves', id), undefined);

// ---- key/value (profile, settings, entitlements)
export const kvGet = <T>(key: string) => safe(async (d) => (await d.get('kv', key)) as T | undefined, undefined as T | undefined);
export const kvSet = (key: string, value: unknown) => safe((d) => d.put('kv', value, key).then(() => undefined), undefined);

// ---- the player's own pictures
export const listUserPics = () => safe((d) => d.getAll('userPics'), [] as UserPictureRecord[]);
export const putUserPic = (r: UserPictureRecord) => safe((d) => d.put('userPics', r).then(() => undefined), undefined);
export const deleteUserPic = (id: string) => safe((d) => d.delete('userPics', id), undefined);

export async function clearAll() {
  await safe(async (d) => {
    for (const s of ['images', 'saves', 'kv', 'userPics'] as const) await d.clear(s);
  }, undefined);
}
