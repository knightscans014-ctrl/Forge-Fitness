/**
 * QUEST TIMERS — the clock that makes a workout quest mean something.
 *
 * A daily quest used to be one tap: press Complete, collect the XP. For a
 * quest that says "Lift for 20+ min" that is an honour system with no honour
 * in it. Workout quests now have to be *run*: you start the timer, you train,
 * and the quest unlocks when the clock says you did the minutes.
 *
 * Two rules shape everything here.
 *
 * 1. NOT EVERY QUEST IS TIMED. `Quest.min` is overloaded across the pool -- it
 *    is minutes for "25 min of yoga", a target count for "Reach 8,000 steps"
 *    (min: 8000) and "Log 2L of water" (min: 2), and a plain flag (min: 1) for
 *    "End your shower cold". A countdown only makes sense for the first kind,
 *    so `timedQuest()` decides, and everything else keeps its instant button.
 *
 * 2. THE CLOCK IS THE WALL CLOCK. Nothing here counts ticks. State is a start
 *    timestamp plus accumulated paused time, and elapsed is always derived
 *    from `now`. A locked phone, a closed app, a reboot mid-set: on reopen we
 *    recompute from the timestamps and the answer is still right. This is the
 *    same approach LiveSession already takes, for the same reason.
 */
import { GameState } from './types';
import { DAILY_POOL, Quest } from './content';

/** A timer only ever exists for one quest at a time. */
export interface QuestTimer {
  questId: string;
  /** Epoch ms when the timer was first started. */
  started: number;
  /** Total ms spent paused, subtracted from elapsed. */
  pausedMs: number;
  /** Epoch ms when the current pause began, or 0 when running. */
  pausedAt: number;
  /** Minutes required, copied from the quest so content edits can't strand a running timer. */
  goalMin: number;
}

/** Quest types that describe time spent training, rather than a count or a flag. */
const TIMED_TYPES = ['strength', 'cardio', 'mobility', 'meditation', 'recovery'];

/**
 * Shortest quest worth a countdown, and the longest that is plausibly a single
 * session. The upper bound is what keeps "2,000m on the rower" (type cardio,
 * min: 2000 -- metres, not minutes) from becoming a 33-hour timer.
 */
export const MIN_TIMED = 2;
export const MAX_TIMED = 180;

/** Does this quest get a timer, or the old instant button? */
export function timedQuest(q: Quest): boolean {
  return TIMED_TYPES.includes(q.type) && q.min >= MIN_TIMED && q.min <= MAX_TIMED;
}

/** Milliseconds of credited training, ignoring time spent paused. */
export function timerElapsedMs(t: QuestTimer, now: number): number {
  const paused = t.pausedMs + (t.pausedAt ? now - t.pausedAt : 0);
  return Math.max(0, now - t.started - paused);
}

/** Whole minutes credited so far. */
export function timerMinutes(t: QuestTimer, now: number): number {
  return Math.floor(timerElapsedMs(t, now) / 60_000);
}

/** Has the timer met its goal? */
export function timerDone(t: QuestTimer, now: number): boolean {
  return timerMinutes(t, now) >= t.goalMin;
}

/** Whole seconds left, floored at zero. */
export function timerRemainingSec(t: QuestTimer, now: number): number {
  const left = t.goalMin * 60_000 - timerElapsedMs(t, now);
  return Math.max(0, Math.ceil(left / 1000));
}

export function timerRunning(t: QuestTimer): boolean {
  return t.pausedAt === 0;
}

/** mm:ss for the UI. Hours are folded into minutes -- 90:00 not 1:30:00. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Begin a quest timer. Refuses if the quest is untimed, already done today, or
 * another timer is already running -- you can only train one thing at a time,
 * and allowing two would let a player bank two quests off one session.
 */
export function startQuestTimer(s: GameState, questId: string, now = Date.now()): { ok: boolean; reason?: string } {
  const q = DAILY_POOL.find(x => x.id === questId);
  if (!q) return { ok: false, reason: 'Unknown quest.' };
  if (!timedQuest(q)) return { ok: false, reason: 'This quest is not timed.' };
  if (s.questsDone.includes(questId)) return { ok: false, reason: 'Already completed today.' };
  if (s.questTimer) {
    return s.questTimer.questId === questId
      ? { ok: false, reason: 'Timer already running.' }
      : { ok: false, reason: 'Another quest timer is already running.' };
  }
  s.questTimer = { questId, started: now, pausedMs: 0, pausedAt: 0, goalMin: q.min };
  return { ok: true };
}

export function pauseQuestTimer(s: GameState, now = Date.now()): boolean {
  const t = s.questTimer;
  if (!t || t.pausedAt) return false;
  t.pausedAt = now;
  return true;
}

export function resumeQuestTimer(s: GameState, now = Date.now()): boolean {
  const t = s.questTimer;
  if (!t || !t.pausedAt) return false;
  t.pausedMs += now - t.pausedAt;
  t.pausedAt = 0;
  return true;
}

/** Abandon without credit. */
export function cancelQuestTimer(s: GameState): void {
  s.questTimer = null;
}
