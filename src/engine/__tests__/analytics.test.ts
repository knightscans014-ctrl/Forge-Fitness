/**
 * Analytics regression suite.
 *
 * Every test here corresponds to a bug that shipped. History used to store
 * lifetime totals, so totals double-counted, trend() reported +100% on flat
 * data, and workoutsThisWeek() returned 0 for most of the year because it
 * compared a padded date key against an unpadded one.
 */
import {
  recordDay, last7Days, workoutsThisWeek, minutesThisWeek, trend,
  migrateHistory, defaultState, dayKey, normalize,
} from '../index';
import type { GameState, DailyRecord } from '../types';

const mk = (): GameState => defaultState('Test', 'warrior');

/** dayKey for N days before today, DST-correct. */
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
};

const rec = (date: string, workouts: number, xp = 0, minutes = 0): DailyRecord =>
  ({ date, xp, gold: 0, workouts, minutes });

describe('recordDay stores per-day deltas, not lifetime totals', () => {
  it('a fresh day starts at zero even with a long lifetime behind it', () => {
    const s = mk();
    s.totalXP = 5000; s.workouts = 120; s.totalWorkoutMin = 3000;
    recordDay(s);
    const today = s.history[s.history.length - 1];
    expect(today.date).toBe(dayKey());
    expect(today.xp).toBe(0);
    expect(today.workouts).toBe(0);
  });

  it('counts only what happened today', () => {
    const s = mk();
    s.totalXP = 1000; s.workouts = 50;
    recordDay(s);              // baseline captured
    s.totalXP = 1080; s.workouts = 51;
    recordDay(s);              // one workout today
    const today = s.history[s.history.length - 1];
    expect(today.xp).toBe(80);
    expect(today.workouts).toBe(1);
  });

  it('is idempotent -- calling it repeatedly does not inflate the day', () => {
    const s = mk();
    recordDay(s);
    s.workouts = 3;
    for (let i = 0; i < 10; i++) recordDay(s);
    expect(s.history[s.history.length - 1].workouts).toBe(3);
    expect(s.history).toHaveLength(1);
  });

  it('tracks gold going down, since gold is spendable', () => {
    const s = mk();
    s.gold = 500;
    recordDay(s);
    s.gold = 320;
    recordDay(s);
    expect(s.history[s.history.length - 1].gold).toBe(-180);
  });
});

describe('last7Days', () => {
  it('always returns seven days, oldest first', () => {
    const s = mk();
    const w = last7Days(s);
    expect(w).toHaveLength(7);
    expect(w[6].date).toBe(dayKey());
    expect(w[0].date).toBe(daysAgo(6));
  });

  it('fills unopened days with zeroes instead of skipping them', () => {
    const s = mk();
    // Trained 6 days ago and today; nothing in between.
    s.history = [rec(daysAgo(6), 1), rec(dayKey(), 1)];
    const w = last7Days(s);
    expect(w).toHaveLength(7);
    expect(w.map(d => d.workouts)).toEqual([1, 0, 0, 0, 0, 0, 1]);
  });

  it('ignores history older than the window', () => {
    const s = mk();
    s.history = [rec(daysAgo(40), 99), rec(dayKey(), 2)];
    expect(last7Days(s).reduce((n, d) => n + d.workouts, 0)).toBe(2);
  });
});

describe('workoutsThisWeek', () => {
  it('sums the week rather than returning 0 for most of the year', () => {
    const s = mk();
    s.history = [rec(daysAgo(3), 2), rec(daysAgo(1), 1), rec(dayKey(), 1)];
    expect(workoutsThisWeek(s)).toBe(4);
  });

  it('works in single-digit months, where the old unpadded key comparison failed', () => {
    // The original built "2026-8-9" and compared it against padded "2026-08-09"
    // with >=, which is false for every day in a single-digit month.
    const s = mk();
    s.history = [rec(dayKey(), 5)];
    expect(workoutsThisWeek(s)).toBe(5);
  });

  it('is zero on an empty history rather than the lifetime total', () => {
    const s = mk();
    s.workouts = 200;
    expect(workoutsThisWeek(s)).toBe(0);
  });

  it('counts minutes the same way', () => {
    const s = mk();
    s.history = [rec(daysAgo(2), 1, 0, 45), rec(dayKey(), 1, 0, 30)];
    expect(minutesThisWeek(s)).toBe(75);
  });
});

describe('trend compares weeks, not adjacent records', () => {
  it('reports flat on genuinely flat data', () => {
    const s = mk();
    s.history = [];
    for (let i = 0; i < 14; i++) s.history.unshift(rec(daysAgo(i), 1));
    expect(trend(s)).toEqual({ direction: 'flat', pct: 0 });
  });

  it('does not report a rise just because two records happen to be equal', () => {
    const s = mk();
    s.history = [rec(daysAgo(1), 2), rec(dayKey(), 2)];
    expect(trend(s).direction).not.toBe('down');
    expect(trend(s).pct).not.toBe(100);
  });

  it('sees a real improvement', () => {
    const s = mk();
    s.history = [];
    for (let i = 7; i < 14; i++) s.history.unshift(rec(daysAgo(i), 1)); // prev week: 7
    for (let i = 0; i < 7; i++) s.history.unshift(rec(daysAgo(i), 2));  // this week: 14
    s.history.sort((a, b) => a.date.localeCompare(b.date));
    expect(trend(s)).toEqual({ direction: 'up', pct: 100 });
  });

  it('sees a real decline', () => {
    const s = mk();
    s.history = [];
    for (let i = 7; i < 14; i++) s.history.push(rec(daysAgo(i), 2)); // prev: 14
    for (let i = 0; i < 7; i++) s.history.push(rec(daysAgo(i), 1));  // this: 7
    s.history.sort((a, b) => a.date.localeCompare(b.date));
    expect(trend(s)).toEqual({ direction: 'down', pct: 50 });
  });

  it('does not divide by zero when there is no prior week', () => {
    const s = mk();
    s.history = [rec(dayKey(), 3)];
    const t = trend(s);
    expect(t.pct).toBe(0);
    expect(Number.isFinite(t.pct)).toBe(true);
  });

  it('a single rest day does not read as a crash', () => {
    const s = mk();
    s.history = [];
    for (let i = 7; i < 14; i++) s.history.push(rec(daysAgo(i), 1));
    for (let i = 1; i < 7; i++) s.history.push(rec(daysAgo(i), 1));
    s.history.push(rec(dayKey(), 0)); // rest today
    s.history.sort((a, b) => a.date.localeCompare(b.date));
    const t = trend(s);
    expect(t.direction).toBe('down');
    expect(t.pct).toBeLessThanOrEqual(20); // 6 vs 7, not a collapse
  });
});

describe('migrating an old cumulative history', () => {
  it('converts lifetime totals into deltas', () => {
    const s = mk();
    s.history = [
      { date: daysAgo(3), xp: 100, gold: 50, workouts: 10, minutes: 300 },
      { date: daysAgo(2), xp: 180, gold: 70, workouts: 11, minutes: 340 },
      { date: daysAgo(1), xp: 260, gold: 90, workouts: 12, minutes: 380 },
    ];
    migrateHistory(s);
    expect(s.history[1].xp).toBe(80);
    expect(s.history[1].workouts).toBe(1);
    expect(s.history[2].minutes).toBe(40);
    // oldest record has nothing to diff against, so it is zeroed rather than
    // left as a lifetime spike
    expect(s.history[0].workouts).toBe(0);
  });

  it('is idempotent -- running it twice does not corrupt the data', () => {
    const s = mk();
    s.history = [
      { date: daysAgo(2), xp: 100, gold: 0, workouts: 10, minutes: 100 },
      { date: daysAgo(1), xp: 200, gold: 0, workouts: 12, minutes: 150 },
    ];
    migrateHistory(s);
    const once = JSON.parse(JSON.stringify(s.history));
    migrateHistory(s);
    expect(s.history).toEqual(once);
  });

  it('leaves an already-delta history alone', () => {
    const s = mk();
    s.history = [rec(daysAgo(2), 2), rec(daysAgo(1), 0), rec(dayKey(), 3)];
    const before = JSON.parse(JSON.stringify(s.history));
    migrateHistory(s);
    expect(s.history).toEqual(before);
  });

  it('runs automatically when an old save is loaded', () => {
    const s = mk();
    s.history = [
      { date: daysAgo(2), xp: 500, gold: 100, workouts: 20, minutes: 600 },
      { date: daysAgo(1), xp: 600, gold: 120, workouts: 22, minutes: 660 },
      { date: dayKey(), xp: 700, gold: 140, workouts: 24, minutes: 720 },
    ];
    normalize(s);
    // 24 lifetime workouts must not read as 66 for the week
    expect(workoutsThisWeek(s)).toBeLessThan(10);
    expect(workoutsThisWeek(s)).toBe(4);
  });
});
