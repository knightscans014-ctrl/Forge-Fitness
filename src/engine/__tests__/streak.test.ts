/**
 * Streaks must tolerate rest days.
 *
 * The original reset the streak to 1 on any missed day. That is bad training
 * advice -- it rewards training through fatigue to protect a number -- and it
 * is the main reason streak features get abandoned.
 */
import { defaultState, bumpStreak, streakStatus, dayKey, STREAK_GRACE_DAYS } from '../index';
import type { GameState } from '../types';

const mk = (): GameState => defaultState('Test', 'warrior');
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
};

describe('bumpStreak', () => {
  it('starts a streak at 1', () => {
    const s = mk();
    s.lastActiveDay = '';
    bumpStreak(s);
    expect(s.streak).toBe(1);
  });

  it('increments on consecutive days', () => {
    const s = mk();
    s.streak = 4;
    s.lastActiveDay = daysAgo(1);
    bumpStreak(s);
    expect(s.streak).toBe(5);
  });

  it('survives a single rest day', () => {
    const s = mk();
    s.streak = 10;
    s.lastActiveDay = daysAgo(2); // trained, rested, training again
    bumpStreak(s);
    expect(s.streak).toBe(11);
  });

  it('breaks after more rest than the grace period allows', () => {
    const s = mk();
    s.streak = 10;
    s.lastActiveDay = daysAgo(2 + STREAK_GRACE_DAYS);
    bumpStreak(s);
    expect(s.streak).toBe(1);
  });

  it('is idempotent within a day -- training twice is not a two-day streak', () => {
    const s = mk();
    s.streak = 3;
    s.lastActiveDay = daysAgo(1);
    bumpStreak(s);
    bumpStreak(s);
    bumpStreak(s);
    expect(s.streak).toBe(4);
  });

  it('records a best streak', () => {
    const s = mk();
    s.streak = 9; s.bestStreak = 9;
    s.lastActiveDay = daysAgo(1);
    bumpStreak(s);
    expect(s.bestStreak).toBe(10);
  });

  it('does not lower bestStreak when a streak breaks', () => {
    const s = mk();
    s.streak = 30; s.bestStreak = 30;
    s.lastActiveDay = daysAgo(60);
    bumpStreak(s);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(30);
  });

  it('handles a corrupt lastActiveDay without crashing or inflating', () => {
    const s = mk();
    s.streak = 5;
    s.lastActiveDay = 'not-a-date';
    bumpStreak(s);
    expect(s.streak).toBe(1);
  });
});

describe('streakStatus warns instead of silently resetting', () => {
  it('is null with no streak', () => {
    const s = mk();
    s.streak = 0;
    expect(streakStatus(s)).toBeNull();
  });

  it('is safe on a day already trained', () => {
    const s = mk();
    s.streak = 3; s.lastActiveDay = dayKey();
    expect(streakStatus(s)).toEqual({ alive: true, atRisk: false, daysIdle: 0 });
  });

  it('flags the last day the streak can be saved', () => {
    const s = mk();
    s.streak = 3; s.lastActiveDay = daysAgo(1 + STREAK_GRACE_DAYS);
    const st = streakStatus(s)!;
    expect(st.alive).toBe(true);
    expect(st.atRisk).toBe(true);
  });

  it('reports a dead streak as dead', () => {
    const s = mk();
    s.streak = 3; s.lastActiveDay = daysAgo(10);
    expect(streakStatus(s)!.alive).toBe(false);
  });
});
