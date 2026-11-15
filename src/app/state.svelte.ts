/**
 * App-wide state: current screen, settings, profile and saved puzzles.
 * Screens are reflected in the URL hash so the browser (and Android) back
 * button works as expected.
 */
import { picture } from '../art/catalog';
import { loadUserPictures } from '../art/pictures';
import { setHaptics, setVolumes } from '../audio/audio';
import { chooseGrid, type PieceStyle } from '../engine/geometry';
import { Puzzle } from '../engine/puzzle';
import { loadEntitlements } from '../data/commerce';
import { deleteSave, kvGet, kvSet, listSaves, putSave, type SaveRecord } from '../data/db';
import { newProfile, type Profile } from '../data/progress';
import { track } from '../data/analytics';

export type Screen =
  | { name: 'home' }
  | { name: 'pack'; id: string }
  | { name: 'play'; save: string }
  | { name: 'profile' }
  | { name: 'settings' };

export interface Settings {
  music: number;
  sfx: number;
  haptics: boolean;
  theme: 'system' | 'light' | 'dark';
  reduceMotion: boolean;
  showTimer: boolean;
  outline: boolean;
  surface: string;
  tray: 'auto' | 'on' | 'off';
  pieces: number;
  rotation: boolean;
  style: PieceStyle;
  seenIntro: boolean;
}

const defaults = (): Settings => ({
  music: 0.4, sfx: 0.8, haptics: true, theme: 'system',
  reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  showTimer: true, outline: false, surface: 'linen', tray: 'auto',
  pieces: matchMedia('(pointer: coarse)').matches ? 48 : 120, rotation: false, style: 'classic', seenIntro: false,
});

export const app = $state({
  ready: false,
  screen: { name: 'home' } as Screen,
  settings: defaults(),
  profile: newProfile(),
  saves: [] as SaveRecord[],
  /** Picture chosen for the setup sheet (null = closed). */
  setup: null as null | { pictureId: string; daily?: string },
  toast: null as null | { text: string; id: number },
});

// ---------------------------------------------------------------- navigation
function parse(hash: string): Screen {
  const [, a, b] = hash.replace(/^#\/?/, '/').split('/');
  if (a === 'pack' && b) return { name: 'pack', id: decodeURIComponent(b) };
  if (a === 'play' && b) return { name: 'play', save: decodeURIComponent(b) };
  if (a === 'profile') return { name: 'profile' };
  if (a === 'settings') return { name: 'settings' };
  return { name: 'home' };
}
function toHash(s: Screen) {
  switch (s.name) {
    case 'pack': return `#/pack/${encodeURIComponent(s.id)}`;
    case 'play': return `#/play/${encodeURIComponent(s.save)}`;
    case 'home': return '#/';
    default: return `#/${s.name}`;
  }
}
let depth = 0; // screens pushed by the app, so Back never leaves the game
export function go(s: Screen, replace = false) {
  app.setup = null;
  const h = toHash(s);
  if (location.hash !== h) {
    if (replace) history.replaceState({ d: depth }, '', h);
    else { depth++; history.pushState({ d: depth }, '', h); }
  }
  app.screen = s;
  window.scrollTo({ top: 0 });
}
export function back() {
  if (depth > 0) history.back();
  else go({ name: 'home' }, true);
}
window.addEventListener('popstate', (e) => { depth = (e.state as { d?: number } | null)?.d ?? 0; app.setup = null; app.screen = parse(location.hash); });

// ---------------------------------------------------------------- settings
export async function saveSettings() {
  await kvSet('settings', $state.snapshot(app.settings));
  applySettings();
}
export function applySettings() {
  const s = app.settings;
  const dark = s.theme === 'dark' || (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141311' : '#f6f2eb');
  setVolumes(s.sfx, s.music);
  setHaptics(s.haptics);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applySettings);

export async function saveProfile() { await kvSet('profile', $state.snapshot(app.profile)); }

export function toast(text: string) {
  const id = Date.now();
  app.toast = { text, id };
  setTimeout(() => { if (app.toast?.id === id) app.toast = null; }, 2600);
}

// ---------------------------------------------------------------- puzzles
export async function refreshSaves() { app.saves = await listSaves(); }
export const saveFor = (pictureId: string, daily?: string) => app.saves.find((s) => s.pictureId === pictureId && (daily ? s.daily === daily : !s.daily));

export async function startPuzzle(o: { pictureId: string; pieces: number; rotation: boolean; style: PieceStyle; daily?: { date: string; seed: number; cols: number; rows: number } }) {
  const pic = picture(o.pictureId);
  if (!pic) return;
  const grid = o.daily ? { cols: o.daily.cols, rows: o.daily.rows } : chooseGrid(o.pieces, pic.aspect);
  const puzzle = Puzzle.create({
    pictureId: pic.id, aspect: pic.aspect, cols: grid.cols, rows: grid.rows,
    seed: o.daily?.seed ?? Math.floor(Math.random() * 2 ** 31), style: o.style, rotation: o.rotation,
  });
  // one save per picture (and one per daily): starting again replaces it
  const old = saveFor(pic.id, o.daily?.date);
  if (old) await deleteSave(old.id);
  const rec: SaveRecord = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    pictureId: pic.id, pieces: puzzle.N, rotation: o.rotation, progress: 0,
    createdAt: Date.now(), updatedAt: Date.now(), daily: o.daily?.date, data: puzzle.serialize(),
  };
  await putSave(rec);
  await refreshSaves();
  track('puzzle_start', { picture: pic.id, pieces: puzzle.N, rotation: o.rotation, daily: !!o.daily });
  go({ name: 'play', save: rec.id });
}

export async function boot() {
  const [settings, profile] = await Promise.all([kvGet<Partial<Settings>>('settings'), kvGet<Profile>('profile')]);
  if (settings) Object.assign(app.settings, settings);
  if (profile) app.profile = { ...newProfile(), ...profile };
  await Promise.all([refreshSaves(), loadUserPictures(), loadEntitlements()]);
  applySettings();
  app.screen = parse(location.hash);
  if (app.screen.name === 'play' && !app.saves.find((s) => s.id === (app.screen as { save: string }).save)) go({ name: 'home' }, true);
  app.ready = true;
}
