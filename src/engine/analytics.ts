// Progress analytics: rolling daily history + derived insights.
//
// Records store PER-DAY deltas, not lifetime totals. They used to store
// lifetime totals, which quietly broke every number derived from them: totals
// double-counted, trend() reported a 100% rise on flat data, and
// workoutsThisWeek() returned 0 for most of the year. Saves written under the
// old scheme are converted in migrateHistory() below.

import { GameState, DailyRecord } from './types';
import { dayKey, yesterdayKey } from './state';

const MAX_HISTORY = 90;

const blank = (date: string): DailyRecord => ({ date, xp: 0, gold: 0, workouts: 0, minutes: 0 });

/**
 * Fold today's progress into history. Safe to call on every mutation.
 *
 * Deltas are derived by subtracting a baseline captured at the day's first
 * call, rather than by diffing against yesterday's record. Diffing breaks the
 * moment a day is missing from history -- and days go missing whenever the app
 * is not opened, which is most days for most people.
 */
export function recordDay(s: GameState): void {
  if (!Array.isArray(s.history)) s.history = [];
  const today = dayKey();
  let cur = s.history[s.history.length - 1];

  if (!cur || cur.date !== today) {
    // A new day: everything accumulated so far belongs to previous days.
    s.histBase = { xp: s.totalXP, gold: s.gold, workouts: s.workouts, minutes: s.totalWorkoutMin };
    cur = blank(today);
    s.history.push(cur);
    if (s.history.length > MAX_HISTORY) s.history = s.history.slice(-MAX_HISTORY);
  }

  // A save restored mid-day, or written before histBase existed, has no
  // baseline. Adopting current totals means today reads 0 rather than
  // inheriting a lifetime -- understating one day beats overstating every day.
  if (!s.histBase) {
    s.histBase = { xp: s.totalXP, gold: s.gold, workouts: s.workouts, minutes: s.totalWorkoutMin };
  }

  const b = s.histBase;
  // xp / workouts / minutes only ever climb, so a negative delta means the
  // baseline is stale rather than that the player went backwards.
  cur.xp = Math.max(0, s.totalXP - b.xp);
  cur.workouts = Math.max(0, s.workouts - b.workouts);
  cur.minutes = Math.max(0, s.totalWorkoutMin - b.minutes);
  // Gold is spendable, so a negative delta here is real and worth keeping.
  cur.gold = s.gold - b.gold;
}

/**
 * The last seven calendar days, oldest first, always exactly seven entries.
 *
 * Days the app was not opened are filled with zeroes rather than skipped. A
 * chart that omits missing days silently redraws a four-day gap as continuous
 * activity, which flatters the player and misinforms them.
 */
export function last7Days(s: GameState): DailyRecord[] {
  const byDate = new Map<string, DailyRecord>();
  for (const r of s.history || []) if (r && r.date) byDate.set(r.date, r);

  const out: DailyRecord[] = [];
  let k = dayKey();
  for (let i = 0; i < 7; i++) {
    out.unshift(byDate.get(k) || blank(k));
    k = yesterdayKey(new Date(k + 'T12:00:00'));
  }
  return out;
}

/** Workouts logged in the last seven calendar days. */
export function workoutsThisWeek(s: GameState): number {
  return last7Days(s).reduce((n, r) => n + (r.workouts || 0), 0);
}

/** Minutes trained in the last seven calendar days. */
export function minutesThisWeek(s: GameState): number {
  return last7Days(s).reduce((n, r) => n + (r.minutes || 0), 0);
}

/**
 * This week against the week before it.
 *
 * Compares seven-day sums, not the two most recent records. The old version
 * compared the last two entries, so a single rest day read as a crash and any
 * two consecutive equal days read as a 100% rise.
 */
export function trend(s: GameState): { direction: 'up' | 'down' | 'flat'; pct: number } {
  const byDate = new Map<string, DailyRecord>();
  for (const r of s.history || []) if (r && r.date) byDate.set(r.date, r);

  const sums = [0, 0];
  let k = dayKey();
  for (let i = 0; i < 14; i++) {
    const rec = byDate.get(k);
    if (rec) sums[i < 7 ? 0 : 1] += rec.workouts || 0;
    k = yesterdayKey(new Date(k + 'T12:00:00'));
  }
  const [cur, prev] = sums;

  if (cur === prev) return { direction: 'flat', pct: 0 };
  // With no prior week there is no baseline to be a percentage of. Reporting
  // "up 300%" against zero is noise dressed as insight.
  if (prev === 0) return { direction: 'up', pct: 0 };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return pct >= 0 ? { direction: 'up', pct } : { direction: 'down', pct: Math.abs(pct) };
}

/**
 * Convert a history written as lifetime totals into per-day deltas.
 *
 * Detection is structural rather than versioned: cumulative history is
 * non-decreasing in `workouts` AND starts above zero, which a delta history
 * essentially never does. Called once from normalize(); idempotent, because a
 * converted history no longer matches the pattern.
 */
export function migrateHistory(s: GameState): void {
  const h = s.history;
  if (!Array.isArray(h) || h.length < 2) return;

  let nonDecreasing = true;
  for (let i = 1; i < h.length; i++) {
    if (!h[i] || !h[i - 1]) return;
    if (h[i].workouts < h[i - 1].workouts || h[i].xp < h[i - 1].xp) { nonDecreasing = false; break; }
  }
  const looksCumulative = nonDecreasing && (h[0].xp > 0 || h[0].workouts > 0);
  if (!looksCumulative) return;

  for (let i = h.length - 1; i > 0; i--) {
    h[i] = {
      date: h[i].date,
      xp: Math.max(0, h[i].xp - h[i - 1].xp),
      gold: h[i].gold - h[i - 1].gold,
      workouts: Math.max(0, h[i].workouts - h[i - 1].workouts),
      minutes: Math.max(0, h[i].minutes - h[i - 1].minutes),
    };
  }
  // The oldest record has nothing to diff against; its "delta" is unknowable,
  // and keeping a lifetime total there would spike every chart's left edge.
  h[0] = blank(h[0].date);
}
