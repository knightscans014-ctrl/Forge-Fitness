// Goals as story arcs, plus the weekly review that makes them legible.
//
// The design problem here is the obvious one: an app that hands out XP for
// losing weight is an app that rewards starving. So none of this pays out for
// raw kilograms. It pays out for *rate held inside a sensible band*, for
// weeks of logging, for protein hit while cutting, for strength kept while
// the scale moves. Those are the things that actually predict keeping it.
//
// A cut arc that celebrated "lost 10kg" would be a bug with a nice icon.

import type { GameState, BodyGoal } from './types';
import { dayKey } from './state';
import { proteinHit, calorieHit } from './foods';
import { macroTargets } from './body';
import { setsOn, volumeOn, overloadToday } from './training';

/**
 * Sensible weekly rate of weight change, in kg/week, per goal.
 *
 * Cut: roughly 0.25-1.0% of bodyweight a week is the usual clinical range;
 * below that is noise, above it costs muscle. Bulk: slower, because the
 * surplus above about 0.5kg/week is mostly fat. Recomp: the scale is
 * supposed to sit still, so the band straddles zero.
 *
 * These are floors and ceilings for *credit*, not medical advice, and the UI
 * says so.
 */
export const RATE_BAND: Record<BodyGoal, { min: number; max: number }> = {
  cut: { min: -1.0, max: -0.2 },
  recomp: { min: -0.25, max: 0.25 },
  bulk: { min: 0.1, max: 0.5 },
};

/**
 * Weekly rate of weight change in kg/week, by least-squares fit over the
 * last `days` of weigh-ins.
 *
 * A fit rather than first-vs-last because daily weight is mostly water: one
 * salty dinner at either end of the window can invent or erase a kilogram.
 * Returns null until there are enough points spread over enough days for the
 * number to mean anything.
 */
export function weeklyRate(s: GameState, days = 21): number | null {
  const log = Array.isArray(s.weightLog) ? s.weightLog : [];
  if (log.length < 3) return null;

  const cutoff = dayKey(new Date(Date.now() - days * 86400000));
  const pts = log.filter(e => e.date >= cutoff);
  if (pts.length < 3) return null;

  // x in days from the first point, y in kg.
  const t0 = Date.parse(pts[0].date + 'T00:00:00Z');
  const xs = pts.map(e => (Date.parse(e.date + 'T00:00:00Z') - t0) / 86400000);
  const ys = pts.map(e => e.kg);
  const span = xs[xs.length - 1] - xs[0];
  if (span < 6) return null; // less than a week of spread proves nothing

  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return Math.round((num / den) * 7 * 100) / 100;
}

export type RateVerdict = 'no-data' | 'on-track' | 'too-slow' | 'too-fast' | 'wrong-way';

/**
 * Is the scale moving the way this goal wants, at a rate worth crediting?
 *
 * 'too-fast' is deliberately a distinct verdict from 'on-track' rather than a
 * bonus tier. Dropping 2kg a week is not winning harder.
 */
export function rateVerdict(s: GameState): RateVerdict {
  const goal = s.body?.goal;
  if (!goal) return 'no-data';
  const r = weeklyRate(s);
  if (r === null) return 'no-data';
  const band = RATE_BAND[goal];

  if (goal === 'recomp') {
    return Math.abs(r) <= band.max ? 'on-track' : 'too-fast';
  }
  if (goal === 'cut') {
    if (r > 0.15) return 'wrong-way';
    if (r > band.max) return 'too-slow';
    if (r < band.min) return 'too-fast';
    return 'on-track';
  }
  // bulk
  if (r < -0.15) return 'wrong-way';
  if (r < band.min) return 'too-slow';
  if (r > band.max) return 'too-fast';
  return 'on-track';
}

/** One line of plain guidance for the current verdict. */
export function rateAdvice(s: GameState): string {
  const goal = s.body?.goal;
  const r = weeklyRate(s);
  switch (rateVerdict(s)) {
    case 'no-data':
      return 'Weigh in a few more times — a week of data before this means anything.';
    case 'on-track':
      return goal === 'recomp'
        ? 'Weight holding steady. That is the job — let training change the shape.'
        : `Moving ${r! > 0 ? 'up' : 'down'} at ${Math.abs(r!)}kg a week. That is a rate you can hold.`;
    case 'too-slow':
      return goal === 'cut'
        ? 'Barely moving. Tighten the food log before you cut calories further.'
        : 'Not gaining. Add a few hundred calories rather than another session.';
    case 'too-fast':
      return goal === 'cut'
        ? 'Dropping faster than 1kg a week. Eat a bit more — past this you are shedding muscle.'
        : goal === 'bulk'
          ? 'Gaining faster than 0.5kg a week. Most of the extra is fat; ease the surplus.'
          : 'The scale is drifting. Recomp wants it flat.';
    case 'wrong-way':
      return goal === 'cut'
        ? 'Going up, not down. Check portions before changing anything else.'
        : 'Going down, not up. You are under-eating for this goal.';
  }
}

/**
 * Consecutive weeks, counting back from this one, in which the rate stayed
 * inside the band. Feeds the goal arcs, which reward held rate rather than
 * total loss.
 */
export function weeksOnTrack(s: GameState): number {
  const goal = s.body?.goal;
  const log = Array.isArray(s.weightLog) ? s.weightLog : [];
  if (!goal || log.length < 4) return 0;
  const band = RATE_BAND[goal];

  let weeks = 0;
  for (let w = 0; w < 52; w++) {
    const end = Date.now() - w * 7 * 86400000;
    const start = end - 14 * 86400000;
    const a = dayKey(new Date(start)), b = dayKey(new Date(end));
    const pts = log.filter(e => e.date >= a && e.date <= b);
    if (pts.length < 3) break;

    const t0 = Date.parse(pts[0].date + 'T00:00:00Z');
    const xs = pts.map(e => (Date.parse(e.date + 'T00:00:00Z') - t0) / 86400000);
    const ys = pts.map(e => e.kg);
    if (xs[xs.length - 1] - xs[0] < 6) break;
    const n = xs.length;
    const mx = xs.reduce((p, c) => p + c, 0) / n;
    const my = ys.reduce((p, c) => p + c, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
    if (den === 0) break;
    const rate = (num / den) * 7;

    const ok = goal === 'recomp'
      ? Math.abs(rate) <= band.max
      : rate >= band.min && rate <= band.max;
    if (!ok) break;
    weeks++;
  }
  return weeks;
}

/** Days on which a meal was logged at all. The habit underneath the numbers. */
export function daysLogged(s: GameState, within = 3650): number {
  const cutoff = dayKey(new Date(Date.now() - within * 86400000));
  return new Set((s.meals || []).filter(m => m.date >= cutoff).map(m => m.date)).size;
}

/** Days on which the protein target was met. */
export function proteinDays(s: GameState): number {
  const t = macroTargets(s.body);
  if (!t) return 0;
  const days = new Set((s.meals || []).map(m => m.date));
  let n = 0;
  days.forEach(d => { if (proteinHit(s, t, d)) n++; });
  return n;
}

/** Days on which the calorie target was met. */
export function calorieDays(s: GameState): number {
  const t = macroTargets(s.body);
  if (!t) return 0;
  const days = new Set((s.meals || []).map(m => m.date));
  let n = 0;
  days.forEach(d => { if (calorieHit(s, t, d)) n++; });
  return n;
}

/** Total sessions in which at least one lift beat a previous best. */
export function overloadDays(s: GameState): number {
  const days = new Set((s.sets || []).map(e => e.date));
  let n = 0;
  days.forEach(d => { if (overloadToday(s, d).length > 0) n++; });
  return n;
}

// ---- Weekly review -------------------------------------------------------

export interface WeeklyReview {
  /** ISO dates of the seven days covered, oldest first. */
  days: string[];
  /** Days in the window with at least one logged set. */
  workouts: number;
  sets: number;
  volume: number;
  prs: number;
  mealsLogged: number;
  proteinDays: number;
  calorieDays: number;
  weightChange: number | null;
  rate: number | null;
  verdict: RateVerdict;
  advice: string;
  /** The single most useful sentence for the week just gone. */
  headline: string;
}

/**
 * A look back at the last seven days.
 *
 * Deliberately built from the raw logs rather than from `s.history`, which
 * stores lifetime totals and double-counts (see the deferred analytics bug).
 * When that is fixed this can move over; until then, this is the honest one.
 */
export function weeklyReview(s: GameState, endDate?: string): WeeklyReview {
  const end = endDate || dayKey();
  // Parse as *local* noon, not UTC midnight. dayKey() is local, so building
  // the window from UTC midnight shifted every date a day backwards for any
  // timezone west of Greenwich. Noon also keeps the arithmetic clear of DST
  // transitions, which are at most an hour and cannot reach it.
  const [ey, em, ed] = end.split('-').map(Number);
  const endMs = new Date(ey, em - 1, ed, 12).getTime();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(dayKey(new Date(endMs - i * 86400000)));

  let sets = 0, volume = 0, prs = 0, workouts = 0;
  for (const d of days) {
    const daySets = setsOn(s, d);
    sets += daySets.length;
    volume += volumeOn(s, d);
    prs += overloadToday(s, d).length;
    if (daySets.length > 0) workouts++;
  }

  // Only the set log is counted. `s.activities` stores a clock time but no
  // date, so it cannot be attributed to a day without guessing -- and a
  // review that guesses is worse than one that undercounts.

  const t = macroTargets(s.body);
  const mealDays = new Set((s.meals || []).filter(m => days.includes(m.date)).map(m => m.date));
  let pDays = 0, cDays = 0;
  mealDays.forEach(d => {
    if (t && proteinHit(s, t, d)) pDays++;
    if (t && calorieHit(s, t, d)) cDays++;
  });

  const log = (s.weightLog || []).filter(e => days.includes(e.date));
  const weightChange = log.length >= 2
    ? Math.round((log[log.length - 1].kg - log[0].kg) * 10) / 10
    : null;

  const rate = weeklyRate(s);
  const verdict = rateVerdict(s);

  // The headline picks the one thing most worth saying. Order matters: a
  // dangerous rate outranks a nice PR count.
  let headline: string;
  if (verdict === 'too-fast') headline = 'Ease off — you are moving faster than is useful.';
  else if (workouts === 0 && mealDays.size === 0) headline = 'Nothing logged this week. Start with one set.';
  else if (prs >= 3) headline = `${prs} lifts beaten this week. That is real progress.`;
  else if (workouts >= 4) headline = `${workouts} sessions. Consistency is doing the work.`;
  else if (pDays >= 5) headline = `Protein hit ${pDays} days out of 7. Hard part handled.`;
  else if (verdict === 'on-track') headline = 'On track. Keep the routine exactly as it is.';
  else if (workouts > 0) headline = `${workouts} session${workouts === 1 ? '' : 's'} logged. Build on it.`;
  else headline = 'Food logged, training light. Get one session in next week.';

  return {
    days,
    workouts,
    sets,
    volume,
    prs,
    mealsLogged: mealDays.size,
    proteinDays: pDays,
    calorieDays: cDays,
    weightChange,
    rate,
    verdict,
    advice: rateAdvice(s),
    headline,
  };
}

/** Weight points for the last `days`, for the trend chart. */
export function weightSeries(s: GameState, days = 90): { date: string; kg: number }[] {
  const cutoff = dayKey(new Date(Date.now() - days * 86400000));
  return (s.weightLog || []).filter(e => e.date >= cutoff);
}

/** Daily training volume for the last `days`, including zero days. */
export function volumeSeries(s: GameState, days = 28): { date: string; volume: number }[] {
  const out: { date: string; volume: number }[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = dayKey(new Date(now - i * 86400000));
    out.push({ date: d, volume: volumeOn(s, d) });
  }
  return out;
}
