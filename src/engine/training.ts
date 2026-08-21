// Set logging and progressive overload.
//
// The point of this module is that `q_st14` -- "beat a past lift by 1 rep or
// 2.5kg" -- stops being an honour-system tick and becomes something the app
// can actually prove, the same way the workout timers and the food log did.
//
// Everything here is derived from the set log. There is no separate "personal
// best" field to drift out of sync with reality.

import type { GameState, SetEntry, PersonalBest } from './types';
import { EXERCISES } from './exercises';
import type { Exercise } from './exercises';
import { dayKey } from './state';

const MAX_SETS = 4000;
const MAX_WEIGHT = 500;   // kg. Above this is a typo, not a deadlift.
const MAX_REPS = 500;     // plank seconds and carry steps live here too.

export function exerciseById(id: string): Exercise | null {
  return EXERCISES.find(x => x.id === id) || null;
}

/**
 * Estimated one-rep max, Epley. Used to compare sets that are not directly
 * comparable -- 100kg x 5 against 110kg x 3 -- so overload can be detected
 * across a change in rep range rather than only within one.
 *
 * Deliberately not shown to the user as a number to chase: it is a comparison
 * device, and past about ten reps it is fiction.
 */
export function e1rm(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Volume for one set. Bodyweight movements have no external load to multiply. */
export function setVolume(e: SetEntry): number {
  return e.weight > 0 ? Math.round(e.weight * e.reps) : 0;
}

/**
 * Log one set. Returns the entry, or null if the numbers are not real.
 *
 * Bodyweight movements are allowed weight 0 -- that is the normal case -- but
 * everything else must carry load, because "0kg x 8" on a bench press is a
 * mis-tap, and letting it through would poison the personal-best comparison.
 */
export function logSet(
  s: GameState,
  exerciseId: string,
  weight: number,
  reps: number,
  when?: string,
): SetEntry | null {
  const ex = exerciseById(exerciseId);
  if (!ex) return null;

  weight = Math.round(weight * 10) / 10;
  reps = Math.floor(reps);

  if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT) return null;
  if (!Number.isFinite(reps) || reps <= 0 || reps > MAX_REPS) return null;
  if (!ex.bodyweight && weight <= 0) return null;

  const entry: SetEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: when || dayKey(),
    exerciseId,
    name: ex.name,
    weight,
    reps,
  };

  if (!Array.isArray(s.sets)) s.sets = [];
  s.sets.push(entry);
  if (s.sets.length > MAX_SETS) s.sets = s.sets.slice(-MAX_SETS);
  return entry;
}

export function removeSet(s: GameState, id: string): void {
  if (!Array.isArray(s.sets)) { s.sets = []; return; }
  s.sets = s.sets.filter(e => e.id !== id);
}

/** Every set logged on a given day, oldest first. */
export function setsOn(s: GameState, date?: string): SetEntry[] {
  const d = date || dayKey();
  return (s.sets || []).filter(e => e.date === d);
}

/** Every set for one exercise, oldest first. */
export function setsFor(s: GameState, exerciseId: string): SetEntry[] {
  return (s.sets || []).filter(e => e.exerciseId === exerciseId);
}

/**
 * The best set ever recorded for an exercise, by estimated 1RM for loaded
 * movements and by reps for bodyweight ones.
 *
 * Excludes today by default. A best you set twenty minutes ago is not a
 * benchmark to beat, it is the thing you are currently doing, and comparing
 * against it would make the overload quest unwinnable within a session.
 */
export function personalBest(s: GameState, exerciseId: string, opts?: { includeToday?: boolean }): PersonalBest | null {
  const ex = exerciseById(exerciseId);
  if (!ex) return null;
  const today = dayKey();
  const history = setsFor(s, exerciseId).filter(e => opts?.includeToday || e.date !== today);
  if (history.length === 0) return null;

  let best = history[0];
  for (const e of history) {
    const better = ex.bodyweight
      ? (e.reps > best.reps || (e.reps === best.reps && e.weight > best.weight))
      : (e1rm(e.weight, e.reps) > e1rm(best.weight, best.reps));
    if (better) best = e;
  }
  return {
    exerciseId,
    name: ex.name,
    weight: best.weight,
    reps: best.reps,
    e1rm: e1rm(best.weight, best.reps),
    date: best.date,
  };
}

/** Personal bests across every exercise the player has ever logged. */
export function allPersonalBests(s: GameState): PersonalBest[] {
  const ids = Array.from(new Set((s.sets || []).map(e => e.exerciseId)));
  return ids
    .map(id => personalBest(s, id, { includeToday: true }))
    .filter((p): p is PersonalBest => p !== null)
    .sort((a, b) => b.e1rm - a.e1rm || a.name.localeCompare(b.name));
}

export interface OverloadHit {
  exerciseId: string;
  name: string;
  /** How it was beaten, in words, for the UI to show. */
  how: string;
  prev: { weight: number; reps: number };
  now: { weight: number; reps: number };
}

/**
 * Did any set logged today beat that exercise's previous best?
 *
 * "Beat" means one of:
 *   - loaded: more weight for at least the same reps, the same weight for
 *     more reps, or a higher estimated 1RM;
 *   - bodyweight: more reps at the same or greater added load.
 *
 * A first-ever set of an exercise does not count. Overload is by definition
 * relative to something, and letting day one count would hand out the elite
 * quest for turning up.
 */
export function overloadToday(s: GameState, date?: string): OverloadHit[] {
  const d = date || dayKey();
  const hits: OverloadHit[] = [];
  const seen = new Set<string>();

  for (const e of setsOn(s, d)) {
    if (seen.has(e.exerciseId)) continue;
    const ex = exerciseById(e.exerciseId);
    if (!ex) continue;

    // Best from strictly before today, so the comparison is against history.
    const prior = setsFor(s, e.exerciseId).filter(x => x.date < d);
    if (prior.length === 0) continue;

    let best = prior[0];
    for (const x of prior) {
      const better = ex.bodyweight
        ? (x.reps > best.reps || (x.reps === best.reps && x.weight > best.weight))
        : (e1rm(x.weight, x.reps) > e1rm(best.weight, best.reps));
      if (better) best = x;
    }

    // Now check every set today against that benchmark.
    for (const t of setsOn(s, d).filter(x => x.exerciseId === e.exerciseId)) {
      let how = '';
      if (ex.bodyweight) {
        if (t.weight >= best.weight && t.reps > best.reps) {
          how = `${t.reps} reps, up from ${best.reps}`;
        }
      } else if (t.weight > best.weight && t.reps >= best.reps) {
        how = `${t.weight}kg for ${t.reps}, up from ${best.weight}kg`;
      } else if (t.weight === best.weight && t.reps > best.reps) {
        how = `${t.reps} reps at ${t.weight}kg, up from ${best.reps}`;
      } else if (e1rm(t.weight, t.reps) > e1rm(best.weight, best.reps)) {
        how = `${t.weight}kg x ${t.reps} beats ${best.weight}kg x ${best.reps}`;
      }
      if (how) {
        hits.push({
          exerciseId: e.exerciseId,
          name: ex.name,
          how,
          prev: { weight: best.weight, reps: best.reps },
          now: { weight: t.weight, reps: t.reps },
        });
        seen.add(e.exerciseId);
        break;
      }
    }
  }
  return hits;
}

/** Total external load moved on a day. The honest measure of a session. */
export function volumeOn(s: GameState, date?: string): number {
  return setsOn(s, date).reduce((n, e) => n + setVolume(e), 0);
}

/** Total volume for one exercise across all time. */
export function volumeFor(s: GameState, exerciseId: string): number {
  return setsFor(s, exerciseId).reduce((n, e) => n + setVolume(e), 0);
}

/**
 * Exercises the player has logged before, most recent first. Feeds the
 * "recent" shortcut list, because people repeat lifts far more than they
 * discover new ones.
 */
export function recentExercises(s: GameState, limit = 8): Exercise[] {
  const out: Exercise[] = [];
  const seen = new Set<string>();
  const log = s.sets || [];
  for (let i = log.length - 1; i >= 0 && out.length < limit; i--) {
    const id = log[i].exerciseId;
    if (seen.has(id)) continue;
    seen.add(id);
    const ex = exerciseById(id);
    if (ex) out.push(ex);
  }
  return out;
}

/** Search the library by name, muscle, or equipment. */
export function searchExercises(q: string, limit = 40): Exercise[] {
  const term = q.trim().toLowerCase();
  const pool = term
    ? EXERCISES.filter(e =>
      e.name.toLowerCase().includes(term) ||
      e.equipment.includes(term) ||
      e.muscles.some(m => m.includes(term)))
    : EXERCISES;
  // Compounds first: they are what the session should be built around.
  return [...pool]
    .sort((a, b) => Number(b.compound) - Number(a.compound) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/**
 * Strength quests the set log can verify on its own.
 *
 * Only `q_st14` qualifies today: it is the one quest in the pool that makes a
 * claim about measurable progress rather than about effort or intent. "Lift
 * for 20 minutes" is the timer's job; "beat a past lift" is this module's.
 *
 * Keyed by quest id, which is a permanent save key -- append only.
 */
export const VERIFIED_TRAINING: Record<string, (s: GameState) => boolean> = {
  q_st14: s => overloadToday(s).length > 0,
};

/**
 * Is this quest one the set log verifies, and has it been earned today?
 * null means the quest is not verifiable this way, so the caller should
 * leave it alone.
 */
export function trainingQuestMet(s: GameState, qid: string): boolean | null {
  const check = VERIFIED_TRAINING[qid];
  if (!check) return null;
  return check(s);
}
