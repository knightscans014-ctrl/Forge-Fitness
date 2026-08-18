/**
 * @jest-environment node
 */
// Streak handling across daylight saving time.
//
// This file MUST run with TZ=America/New_York, which is why it is a separate
// suite with a docblock rather than tests inside robustness.test.ts: Node
// caches the zone on first Date use, so assigning process.env.TZ inside a test
// body is silently ignored and the assertions quietly run in UTC, where the
// bug does not reproduce. jest.config.js sets the zone via globalSetup.
import { ENGINE, defaultState, dayKey, yesterdayKey } from '../index';

describe('streaks across daylight saving time', () => {
  beforeAll(() => {
    // Guard: if the zone is wrong these tests prove nothing.
    expect(new Date('2026-03-09T04:30:00Z').getHours()).toBe(0);
  });
  afterEach(() => jest.useRealTimers());

  // Regression: "yesterday" was `Date.now() - 86400000`. A fixed 24h
  // subtraction crosses two calendar days on a spring-forward date and zero on
  // a fall-back one, so a player active every single day still lost a streak.
  test('spring forward: just after midnight still sees yesterday', () => {
    // 00:30 EST on the morning the clocks jump forward.
    jest.useFakeTimers().setSystemTime(new Date('2026-03-09T04:30:00Z'));
    expect(dayKey()).toBe('2026-03-09');
    expect(yesterdayKey()).toBe('2026-03-08');
  });

  test('fall back: the extra hour does not repeat a day', () => {
    // 23:30 EST on the evening the clocks went back; a fixed -24h lands on the
    // same calendar day here because the day was 25 hours long.
    jest.useFakeTimers().setSystemTime(new Date('2026-11-02T04:30:00Z'));
    expect(dayKey()).toBe('2026-11-01');
    expect(yesterdayKey()).toBe('2026-10-31');
  });

  test('a streak survives a spring-forward boundary', () => {
    const s = defaultState('Hero', 'warrior');
    jest.useFakeTimers().setSystemTime(new Date('2026-03-08T14:00:00Z'));
    s.energy = 99999;
    ENGINE.logActivity(s, 'cardio', 20, 2);
    expect(s.streak).toBe(1);

    jest.setSystemTime(new Date('2026-03-09T04:30:00Z'));
    s.energy = 99999;
    ENGINE.logActivity(s, 'cardio', 20, 2);

    expect(s.streak).toBe(2);
  });
});
