import { describe, expect, it } from 'vitest';
import { dailyPuzzle, levelOf, newProfile, recordCompletion, streakAlive, xpFor, xpForLevel, formatTime } from '../../src/data/progress';
import { packs } from '../../src/art/catalog';

describe('progression', () => {
  it('levels up as experience grows', () => {
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(xpForLevel(1)).level).toBe(2);
    const l = levelOf(xpForLevel(4) + 5);
    expect(l.level).toBe(5);
    expect(l.into).toBe(5);
  });

  it('rewards bigger and harder puzzles and charges for hints', () => {
    expect(xpFor(500, false, 0, false)).toBeGreaterThan(xpFor(100, false, 0, false));
    expect(xpFor(100, true, 0, false)).toBeGreaterThan(xpFor(100, false, 0, false));
    expect(xpFor(100, false, 5, false)).toBeLessThan(xpFor(100, false, 0, false));
    expect(xpFor(100, false, 0, true)).toBe(xpFor(100, false, 0, false) + 50);
  });

  it('records completions, best times and achievements', () => {
    const p = newProfile();
    const r1 = recordCompletion(p, { pictureId: 'golden-hour/1', pieces: 48, rotation: false, hints: 0, ms: 170000, when: new Date('2026-01-01T15:00:00') });
    expect(r1.newAchievements.map((a) => a.id)).toEqual(expect.arrayContaining(['first', 'speed']));
    expect(p.best['golden-hour/1@48']).toBe(170000);
    const r2 = recordCompletion(p, { pictureId: 'golden-hour/1', pieces: 48, rotation: false, hints: 0, ms: 150000 });
    expect(r2.newBest).toBe(true);
    expect(r2.previousBest).toBe(170000);
  });

  it('counts daily streaks across consecutive days and resets after a gap', () => {
    const p = newProfile();
    for (const d of ['2026-03-01', '2026-03-02', '2026-03-03']) recordCompletion(p, { pictureId: 'golden-hour/1', pieces: 70, rotation: false, hints: 0, ms: 1, daily: d });
    expect(p.streak.count).toBe(3);
    expect(p.achievements.streak3).toBeTruthy();
    expect(streakAlive(p, '2026-03-04')).toBe(3);
    expect(streakAlive(p, '2026-03-06')).toBe(0);
    recordCompletion(p, { pictureId: 'golden-hour/1', pieces: 70, rotation: false, hints: 0, ms: 1, daily: '2026-03-06' });
    expect(p.streak.count).toBe(1);
    expect(p.streak.best).toBe(3);
  });

  it('awards the pack achievement when every picture is done', () => {
    const p = newProfile();
    const pk = packs[0];
    let last;
    for (const pic of pk.pictures) last = recordCompletion(p, { pictureId: pic.id, pieces: 24, rotation: false, hints: 0, ms: 1 });
    expect(last!.newAchievements.map((a) => a.id)).toContain('pack');
  });

  it('picks the same daily puzzle for everyone on a date', () => {
    const a = dailyPuzzle('2026-11-15'), b = dailyPuzzle('2026-11-15'), c = dailyPuzzle('2026-11-16');
    expect(a).toEqual(b);
    expect(a.pictureId === c.pictureId && a.seed === c.seed).toBe(false);
  });

  it('formats times', () => {
    expect(formatTime(65000)).toBe('1:05');
    expect(formatTime(3725000)).toBe('1:02:05');
  });

  it('has unique picture ids and credits for every photo', () => {
    const pics = packs.flatMap((p) => p.pictures);
    expect(packs.length).toBe(12);
    expect(pics.length).toBe(122);
    expect(new Set(pics.map((x) => x.id)).size).toBe(pics.length);
    for (const p of pics.filter((x) => x.src)) { expect(p.credit).toMatch(/CC BY/); expect(p.source).toMatch(/^https:\/\/commons\.wikimedia\.org\//); }
  });

  it('keeps the daily puzzle gentle', () => {
    for (const d of ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']) {
      expect(dailyPuzzle(d, 0).pieces).toBeLessThanOrEqual(40);
      expect(dailyPuzzle(d, 0).pictureId.startsWith('banff/')).toBe(true);
      expect(dailyPuzzle(d, 10).pieces).toBeLessThanOrEqual(110);
      expect(['masterpiece', 'glass', 'modern', 'desert', 'night-skies']).not.toContain(dailyPuzzle(d).pictureId.split('/')[0]);
    }
  });
});
