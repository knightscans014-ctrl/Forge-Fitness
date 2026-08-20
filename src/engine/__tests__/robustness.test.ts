// Regression tests for the data-loss bugs found in the round-2 audit.
//
// Every test here corresponds to a way a player could lose or corrupt their
// account. The pre-existing 104 tests all passed while these bugs were live,
// because they only exercised happy paths.

import { ENGINE, defaultState, normalize, dayKey, weekKey, padDayKey, dayChallengeSeed, computePower, DAILY_CHALLENGES, MAX_ACTIVITY_MIN, MAX_INVENTORY, forgeGear, autoEquipBest, totalAffixes, currentSeason, addSeasonXP } from '../index';
import { importSave, exportSave } from '../../services/saveFile';
import { GameState } from '../types';

const veteran = (): GameState => {
  const s = normalize(defaultState('Vet', 'assassin'));
  for (let i = 0; i < 40; i++) { s.energy = 100; ENGINE.logActivity(s, 'strength', 45, 1); }
  return s;
};

/* ------------------------------------------------------------------ */
/* 1. Hostile activity input must never corrupt progression            */
/* ------------------------------------------------------------------ */

describe('logActivity input validation', () => {
  const BAD: [string, number][] = [
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['negative', -50],
    ['zero', 0],
    ['absurd', MAX_ACTIVITY_MIN + 1],
  ];

  test.each(BAD)('rejects %s duration without touching the save', (_label, dur) => {
    const s = veteran();
    // Give the player far more energy than any activity could cost. Otherwise
    // huge durations are rejected by the energy gate rather than by the
    // validation guard, and the test would pass even with the guard removed.
    s.energy = 1e6;
    const before = {
      level: s.level, totalXP: s.totalXP, gold: s.gold,
      workouts: s.workouts, energy: s.energy, minutes: s.totalWorkoutMin,
    };
    const r = ENGINE.logActivity(s, 'strength', dur, 1);

    expect(r.ok).toBe(false);
    expect(s.level).toBe(before.level);
    expect(s.totalXP).toBe(before.totalXP);
    expect(s.gold).toBe(before.gold);
    expect(s.workouts).toBe(before.workouts);
    expect(s.energy).toBe(before.energy);
    expect(s.totalWorkoutMin).toBe(before.minutes);
  });

  test.each([['NaN', NaN], ['negative', -3], ['zero', 0]] as [string, number][])(
    'rejects %s intensity', (_l, intensity) => {
      const s = veteran();
      const xp = s.totalXP;
      expect(ENGINE.logActivity(s, 'strength', 30, intensity).ok).toBe(false);
      expect(s.totalXP).toBe(xp);
    });

  test('THE BIG ONE: a bad activity cannot reset a maxed account', () => {
    const s = veteran();
    const lvl = s.level, xp = s.totalXP, gold = s.gold;
    expect(lvl).toBeGreaterThan(10); // sanity: the fixture really is advanced

    ENGINE.logActivity(s, 'strength', NaN, 1);
    const after = normalize(s);

    expect(after.level).toBe(lvl);
    expect(after.totalXP).toBe(xp);
    expect(after.gold).toBe(gold);
  });

  test('valid input still works and clamps intensity rather than rejecting', () => {
    const s = normalize(defaultState('Ok', 'assassin'));
    const r = ENGINE.logActivity(s, 'strength', 30, 999);
    expect(r.ok).toBe(true);
    expect(r.xp).toBeGreaterThan(0);
    expect(Number.isFinite(s.totalXP)).toBe(true);
  });

  test('fractional durations are floored, not rejected', () => {
    const s = normalize(defaultState('F', 'assassin'));
    expect(ENGINE.logActivity(s, 'strength', 30.7, 1).ok).toBe(true);
    expect(s.totalWorkoutMin).toBe(30);
  });
});

/* ------------------------------------------------------------------ */
/* 2. normalize() must repair without destroying                       */
/* ------------------------------------------------------------------ */

describe('normalize is non-destructive', () => {
  test('a corrupt field falls back to the last good value, not to zero', () => {
    const s = veteran();
    normalize(s);                       // stamps lastGood
    const xp = s.totalXP, lvl = s.level;
    (s as any).totalXP = NaN;           // simulate corruption
    (s as any).level = NaN;
    const fixed = normalize(s);
    expect(fixed.totalXP).toBe(xp);
    expect(fixed.level).toBe(lvl);
  });

  test('a genuinely new save still defaults to zero', () => {
    const s = normalize({ name: 'New', cls: 'warrior' } as unknown as GameState);
    expect(s.totalXP).toBe(0);
    expect(s.level).toBe(1);
    expect(s.gold).toBeGreaterThanOrEqual(0);
  });

  test('absurd numbers are clamped to the ceiling, keeping derived stats finite', () => {
    const CEIL = 1e12;
    const s = normalize({
      name: 'Big', cls: 'assassin', level: 1e308, totalXP: 1e308, gold: 1e308,
      stats: { str: 1e308, vig: 1e308, vit: 1e308, flx: 1e308, foc: 1e308 },
    } as unknown as GameState);
    // Assert the actual clamp, not merely finiteness: 1e308 is finite, so a
    // finiteness-only check passes even with the clamp removed.
    expect(s.level).toBeLessThanOrEqual(CEIL);
    expect(s.totalXP).toBeLessThanOrEqual(CEIL);
    expect(s.gold).toBeLessThanOrEqual(CEIL);
    for (const v of Object.values(s.stats)) expect(v).toBeLessThanOrEqual(CEIL);
    // Power sums several clamped terms, so it must stay well inside float range.
    expect(Number.isFinite(computePower(s))).toBe(true);
  });

  test('energy cannot exceed its maximum', () => {
    const s = normalize({ name: 'E', cls: 'warrior', energy: 1e9 } as unknown as GameState);
    expect(s.energy).toBeLessThanOrEqual(s.maxEnergy);
  });

  test.each([
    ['inventory', 'not-an-array'],
    ['achievements', 42],
    ['boosters', 'x'],
    ['history', {}],
    ['bouts', 'nope'],
    ['activities', 7],
  ])('%s survives being the wrong type', (field, bad) => {
    const s = normalize({ name: 'T', cls: 'warrior', [field]: bad } as unknown as GameState);
    expect(Array.isArray((s as any)[field])).toBe(true);
  });

  test('a wrong-typed inventory does not crash the screens that read it', () => {
    const s = normalize({ name: 'T', cls: 'warrior', inventory: 'not-an-array' } as unknown as GameState);
    // These are exactly the calls that produced the white screen.
    expect(() => autoEquipBest(s)).not.toThrow();
    expect(() => totalAffixes(s)).not.toThrow();
    expect(() => s.inventory.filter(g => g.slot === 'weapon')).not.toThrow();
  });

  test('oversized collections are capped', () => {
    const s = normalize({
      name: 'H', cls: 'warrior',
      inventory: Array.from({ length: MAX_INVENTORY + 5000 }, () => forgeGear('weapon', 'common', 1)),
    } as unknown as GameState);
    expect(s.inventory.length).toBeLessThanOrEqual(MAX_INVENTORY);
  });

  test('normalize is idempotent', () => {
    const a = normalize(veteran());
    const b = normalize(JSON.parse(JSON.stringify(a)));
    expect(b.totalXP).toBe(a.totalXP);
    expect(b.level).toBe(a.level);
    expect(b.gold).toBe(a.gold);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Date keys must sort and compare correctly                        */
/* ------------------------------------------------------------------ */

describe('dayKey padding', () => {
  test('is zero-padded', () => {
    expect(dayKey(new Date(2026, 7, 9))).toBe('2026-08-09');
    expect(dayKey(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(dayKey(new Date(2026, 10, 3))).toBe('2026-11-03');
  });

  test('THE COMPARISON BUG: single-digit day is not "after" a double-digit one', () => {
    expect(dayKey(new Date(2026, 7, 9)) >= dayKey(new Date(2026, 7, 18))).toBe(false);
  });

  test('string sort matches chronological order across a month boundary', () => {
    const days: string[] = [];
    for (let i = 0; i < 45; i++) days.push(dayKey(new Date(2026, 7, 1 + i)));
    expect([...days].sort()).toEqual(days);
  });

  test('weekKey is padded too', () => {
    expect(weekKey(new Date(2026, 7, 9))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('padDayKey upgrades legacy stamps and leaves good ones alone', () => {
    expect(padDayKey('2026-8-9')).toBe('2026-08-09');
    expect(padDayKey('2026-08-09')).toBe('2026-08-09');
    expect(padDayKey('2026-11-13')).toBe('2026-11-13');
  });

  test('legacy unpadded stamps in a save are migrated, preserving the streak', () => {
    const s = normalize({
      name: 'L', cls: 'warrior', streak: 12,
      lastActiveDay: '2026-8-9', lastDay: '2026-8-9', dayDone: '2026-8-9',
      energyRegenAt: '2026-8-9', weekKey: '2026-8-3',
      daily: { lastClaim: '2026-8-9', claimStreak: 3 },
      combo: { n: 2, date: '2026-8-9' },
      history: [{ date: '2026-8-9', xp: 1, gold: 1, workouts: 1, minutes: 1 }],
    } as unknown as GameState);

    expect(s.lastActiveDay).toBe('2026-08-09');
    expect(s.lastDay).toBe('2026-08-09');
    expect(s.dayDone).toBe('2026-08-09');
    expect(s.energyRegenAt).toBe('2026-08-09');
    expect(s.weekKey).toBe('2026-08-03');
    expect(s.daily.lastClaim).toBe('2026-08-09');
    expect(s.combo.date).toBe('2026-08-09');
    expect(s.history[0].date).toBe('2026-08-09');
    expect(s.streak).toBe(12); // not reset by the format change
  });
});

/* ------------------------------------------------------------------ */
/* 4. Daily challenge seed must not collide across months              */
/* ------------------------------------------------------------------ */

describe('dayChallengeSeed', () => {
  test('always returns a real challenge id', () => {
    for (let i = 0; i < 400; i++) {
      const id = dayChallengeSeed(dayKey(new Date(2026, 0, 1 + i)));
      expect(DAILY_CHALLENGES.some(c => c.id === id)).toBe(true);
    }
  });

  test('the old digit-sum collision no longer picks the same challenge', () => {
    // 2026-11-01 and 2026-09-03 both summed to 2038 under the old scheme.
    const a = dayChallengeSeed('2026-11-01');
    const b = dayChallengeSeed('2026-09-03');
    const sumA = '2026-11-01'.split('-').reduce((x, y) => x + +y, 0);
    const sumB = '2026-09-03'.split('-').reduce((x, y) => x + +y, 0);
    expect(sumA).toBe(sumB);   // the collision is real
    expect(a).not.toBe(b);     // but the hash separates them
  });

  test('uses the whole pool over a year', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 365; i++) seen.add(dayChallengeSeed(dayKey(new Date(2026, 0, 1 + i))));
    expect(seen.size).toBe(DAILY_CHALLENGES.length);
  });

  test('does not march through the pool in order', () => {
    // The digit sum of consecutive days increases by exactly 1, so the old
    // scheme walked the pool sequentially — tomorrow's challenge was always
    // the next one in the list. Pool coverage looks perfect either way, so
    // this is what actually distinguishes a hash from the digit sum.
    const idx = (k: string) => DAILY_CHALLENGES.findIndex(c => c.id === dayChallengeSeed(k));
    let sequential = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const a = idx(dayKey(new Date(2026, 0, 1 + i)));
      const b = idx(dayKey(new Date(2026, 0, 2 + i)));
      if ((a + 1) % DAILY_CHALLENGES.length === b) sequential++;
    }
    // A uniform hash lands on "next index" about 1/22 of the time.
    expect(sequential).toBeLessThan(N / 4);
  });

  test('is deterministic for a given day', () => {
    expect(dayChallengeSeed('2026-05-05')).toBe(dayChallengeSeed('2026-05-05'));
  });
});

/* ------------------------------------------------------------------ */
/* 5. Import must not accept a save that bricks the app                */
/* ------------------------------------------------------------------ */

describe('importSave hardening', () => {
  const wrap = (state: unknown) => JSON.stringify({ app: 'FORGE', format: 1, exportedAt: Date.now(), state });

  test('a hostile save imports into something the UI can render', () => {
    const r = importSave(wrap({
      name: 'Evil', cls: 'assassin', level: 1e308, totalXP: 1e308, gold: -5000,
      energy: 1e9, stats: { str: 1e308, vig: 0, vit: 0, flx: 0, foc: 0 },
      inventory: 'not-an-array',
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Array.isArray(r.state.inventory)).toBe(true);
    expect(r.state.gold).toBeGreaterThanOrEqual(0);
    expect(r.state.energy).toBeLessThanOrEqual(r.state.maxEnergy);
    expect(Number.isFinite(computePower(r.state))).toBe(true);
    expect(() => autoEquipBest(r.state)).not.toThrow();
  });

  test('an enormous inventory is capped on import', () => {
    const r = importSave(wrap({
      name: 'Big', cls: 'warrior', level: 1, totalXP: 0,
      inventory: Array.from({ length: 20000 }, (_, i) => ({ id: 'g' + i, slot: 'weapon', rarity: 'mythic', name: 'x', icon: 'x', power: 9999 })),
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.inventory.length).toBeLessThanOrEqual(MAX_INVENTORY);
  });

  test('a legitimate save still round-trips losslessly', () => {
    const s = veteran();
    const r = importSave(exportSave(s));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.level).toBe(s.level);
    expect(r.state.totalXP).toBe(s.totalXP);
    expect(r.state.gold).toBe(s.gold);
    expect(r.state.workouts).toBe(s.workouts);
  });
});

describe('season rollover', () => {
  // Regression: addSeasonXP used to check `Date.now() < s.season.end` and
  // silently discard the XP when it failed. If the app sat open across a
  // season boundary, every reward earned until the next currentSeason() call
  // vanished. It now rolls the season over itself.
  test('XP earned after a season expires is not lost', () => {
    const s = defaultState('Hero', 'warrior');
    currentSeason(s);
    // Force the active season to have ended a minute ago.
    s.season!.end = Date.now() - 60_000;
    s.seasonXP = 500;

    addSeasonXP(s, 100);

    // A fresh season started, and the XP landed in it rather than being dropped.
    expect(s.season!.end).toBeGreaterThan(Date.now());
    expect(s.seasonXP).toBe(100);
  });

  test('XP inside a live season still accumulates', () => {
    const s = defaultState('Hero', 'warrior');
    currentSeason(s);
    s.seasonXP = 0;
    addSeasonXP(s, 40);
    addSeasonXP(s, 60);
    expect(s.seasonXP).toBe(100);
  });
});
