/**
 * Player progression: experience and levels, daily streaks, achievements and
 * records. Pure functions over a Profile object, so they are easy to test.
 */
import { allPictures, packs, picture } from '../art/catalog';
import { chooseGrid } from '../engine/geometry';
import { hashString } from '../engine/rng';

export interface Profile {
  xp: number;
  completed: number;
  piecesPlaced: number;
  totalTime: number;
  /** Best time in ms per `pictureId@pieces[r]`. */
  best: Record<string, number>;
  /** Largest piece count finished per picture. */
  done: Record<string, number>;
  streak: { count: number; best: number; last: string };
  daily: Record<string, number>; // date → ms taken
  achievements: Record<string, number>; // id → when earned
  favourites: string[];
  usedOwnPhoto?: boolean;
}

export const newProfile = (): Profile => ({
  xp: 0, completed: 0, piecesPlaced: 0, totalTime: 0, best: {}, done: {},
  streak: { count: 0, best: 0, last: '' }, daily: {}, achievements: {}, favourites: [],
});

// ---------------------------------------------------------------- levels
export const xpForLevel = (n: number) => Math.round(120 * Math.pow(n, 1.55));
export function levelOf(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  while (xp >= xpForLevel(level)) level++;
  const prev = level === 1 ? 0 : xpForLevel(level - 1);
  return { level, into: xp - prev, need: xpForLevel(level) - prev };
}
export const TITLES = ['Beginner', 'Edge Finder', 'Sorter', 'Corner Keeper', 'Pattern Spotter', 'Steady Hand', 'Puzzler', 'Collector', 'Connoisseur', 'Master Puzzler', 'Grandmaster'];
export const titleFor = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 3))];

export function xpFor(pieces: number, rotation: boolean, hints: number, daily: boolean): number {
  let xp = pieces * (rotation ? 1.6 : 1);
  xp *= 1 + Math.log10(Math.max(10, pieces)) * 0.15;
  xp = Math.max(10, xp - hints * Math.max(2, pieces * 0.02));
  if (daily) xp += 50;
  return Math.round(xp);
}

// ---------------------------------------------------------------- dates
export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayDiff(a: string, b: string) {
  const pa = new Date(a + 'T12:00:00'), pb = new Date(b + 'T12:00:00');
  return Math.round((pb.getTime() - pa.getTime()) / 86400000);
}

// ---------------------------------------------------------------- daily puzzle
/** Piece counts by weekday (Sun..Sat): easy on weekdays, a bigger one at the weekend. */
const DAILY_PIECES = [100, 48, 48, 60, 48, 70, 80];
/** New players get a gentle daily puzzle until they have finished a few. */
const DAILY_STARTER_PIECES = 36;
/** Packs whose pictures have clear, varied regions: good for a relaxed daily. */
const DAILY_PACKS = ['banff', 'golden-hour', 'coastlines', 'countryside', 'little-towns', 'under-the-sea', 'garden'];
export function dailyPuzzle(date = today(), completed = Infinity) {
  // first puzzles are always real photographs: that is what new players came for
  const packsToday = completed < 3 ? ['banff'] : DAILY_PACKS;
  const pool = allPictures().filter((p) => packsToday.includes(p.pack));
  const pics = pool.length ? pool : allPictures();
  const h = hashString('daily:' + date);
  const pic = pics[h % pics.length];
  const day = new Date(date + 'T12:00:00').getDay();
  const pieces = completed < 3 ? DAILY_STARTER_PIECES : DAILY_PIECES[day];
  const { cols, rows } = chooseGrid(pieces, pic.aspect);
  return { date, pictureId: pic.id, pieces: cols * rows, cols, rows, seed: h % 1_000_000, rotation: false };
}
export function streakAlive(p: Profile, date = today()) {
  return p.streak.last && dayDiff(p.streak.last, date) <= 1 ? p.streak.count : 0;
}

// ---------------------------------------------------------------- achievements
export interface Achievement { id: string; title: string; text: string; icon: string }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'First Piece of the Puzzle', text: 'Finish your first puzzle.', icon: '🧩' },
  { id: 'five', title: 'Getting the Hang of It', text: 'Finish 5 puzzles.', icon: '🖐️' },
  { id: 'twentyfive', title: 'Regular', text: 'Finish 25 puzzles.', icon: '☕' },
  { id: 'hundred', title: 'Centurion', text: 'Finish 100 puzzles.', icon: '🏛️' },
  { id: 'pieces1k', title: 'A Thousand Clicks', text: 'Place 1,000 pieces in total.', icon: '✨' },
  { id: 'pieces10k', title: 'Ten Thousand', text: 'Place 10,000 pieces in total.', icon: '🌟' },
  { id: 'big300', title: 'Going Big', text: 'Finish a puzzle with 300 or more pieces.', icon: '🗻' },
  { id: 'big500', title: 'Half a Thousand', text: 'Finish a puzzle with 500 or more pieces.', icon: '🏔️' },
  { id: 'big1000', title: 'The Thousand', text: 'Finish a 1,000-piece puzzle.', icon: '👑' },
  { id: 'rotation', title: 'Turn, Turn, Turn', text: 'Finish a puzzle with piece rotation on.', icon: '🔄' },
  { id: 'speed', title: 'Quick Hands', text: 'Finish 48 or more pieces in under 3 minutes.', icon: '⚡' },
  { id: 'nohints', title: 'No Help Needed', text: 'Finish 200+ pieces without a hint.', icon: '🦉' },
  { id: 'daily', title: 'Daily Habit', text: 'Finish a daily puzzle.', icon: '📅' },
  { id: 'streak3', title: 'Three in a Row', text: 'Keep a 3-day daily streak.', icon: '🔥' },
  { id: 'streak7', title: 'A Whole Week', text: 'Keep a 7-day daily streak.', icon: '🔥' },
  { id: 'streak30', title: 'Devoted', text: 'Keep a 30-day daily streak.', icon: '💎' },
  { id: 'pack', title: 'Collector', text: 'Finish every picture in a pack.', icon: '📚' },
  { id: 'night', title: 'Night Owl', text: 'Finish a puzzle between midnight and 4 am.', icon: '🌙' },
  { id: 'photo', title: 'Made It Mine', text: 'Finish a puzzle made from your own photo.', icon: '📷' },
  { id: 'level10', title: 'Seasoned', text: 'Reach level 10.', icon: '🎖️' },
];

export interface CompletionInput {
  pictureId: string;
  pieces: number;
  rotation: boolean;
  hints: number;
  ms: number;
  daily?: string;
  when?: Date;
}

export interface CompletionResult {
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  newBest: boolean;
  previousBest?: number;
  newAchievements: Achievement[];
  streak: number;
}

/** Record a finished puzzle. Mutates and returns the profile. */
export function recordCompletion(p: Profile, c: CompletionInput): CompletionResult {
  const levelBefore = levelOf(p.xp).level;
  const xpGained = xpFor(c.pieces, c.rotation, c.hints, !!c.daily);
  p.xp += xpGained;
  p.completed++;
  p.piecesPlaced += c.pieces;
  p.totalTime += c.ms;
  const key = `${c.pictureId}@${c.pieces}${c.rotation ? 'r' : ''}`;
  const previousBest = p.best[key];
  const newBest = previousBest === undefined || c.ms < previousBest;
  if (newBest) p.best[key] = c.ms;
  p.done[c.pictureId] = Math.max(p.done[c.pictureId] ?? 0, c.pieces);
  if (c.daily) {
    p.daily[c.daily] = c.ms;
    const gap = p.streak.last ? dayDiff(p.streak.last, c.daily) : 99;
    if (gap === 0) { /* already counted today */ }
    else if (gap === 1) p.streak.count++;
    else p.streak.count = 1;
    p.streak.last = c.daily > p.streak.last ? c.daily : p.streak.last;
    p.streak.best = Math.max(p.streak.best, p.streak.count);
  }
  const earned: Achievement[] = [];
  const give = (id: string, cond: boolean) => {
    if (cond && !p.achievements[id]) { p.achievements[id] = Date.now(); earned.push(ACHIEVEMENTS.find((a) => a.id === id)!); }
  };
  const hour = (c.when ?? new Date()).getHours();
  give('first', p.completed >= 1);
  give('five', p.completed >= 5);
  give('twentyfive', p.completed >= 25);
  give('hundred', p.completed >= 100);
  give('pieces1k', p.piecesPlaced >= 1000);
  give('pieces10k', p.piecesPlaced >= 10000);
  give('big300', c.pieces >= 300);
  give('big500', c.pieces >= 500);
  give('big1000', c.pieces >= 950);
  give('rotation', c.rotation);
  give('speed', c.pieces >= 48 && c.ms < 180000);
  give('nohints', c.pieces >= 200 && c.hints === 0);
  give('daily', !!c.daily);
  give('streak3', p.streak.count >= 3);
  give('streak7', p.streak.count >= 7);
  give('streak30', p.streak.count >= 30);
  give('night', hour < 4);
  give('photo', c.pictureId.startsWith('mine/'));
  const pk = picture(c.pictureId)?.pack;
  const packDef = packs.find((x) => x.id === pk);
  give('pack', !!packDef && packDef.pictures.every((x) => p.done[x.id]));
  const levelAfter = levelOf(p.xp).level;
  give('level10', levelAfter >= 10);
  return { xpGained, levelBefore, levelAfter, newBest: newBest && previousBest !== undefined, previousBest, newAchievements: earned, streak: p.streak.count };
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
}
