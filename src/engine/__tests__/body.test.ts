// Body profile arithmetic.
//
// These figures are checkable by hand against the published Mifflin-St Jeor
// formula, which is the point: if someone changes a coefficient, a test that
// only asserted "returns a number" would not notice.

import {
  bmr, tdee, macroTargets, bmi, bmiBand,
  defaultProfile, sanitizeProfile,
  logWeight, weightTrend, currentWeight, goalProgress,
  defaultState, normalize, dayKey,
} from '../index';
import type { BodyProfile, GameState } from '../types';

const profile = (over: Partial<BodyProfile> = {}): BodyProfile => ({
  ...defaultProfile(),
  ...over,
});

describe('BMR (Mifflin-St Jeor)', () => {
  test('male: 10w + 6.25h - 5a + 5', () => {
    // 80kg, 180cm, 30y -> 800 + 1125 - 150 + 5 = 1780
    expect(bmr(profile({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' }))).toBe(1780);
  });

  test('female: 10w + 6.25h - 5a - 161', () => {
    // 60kg, 165cm, 25y -> 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    expect(bmr(profile({ weightKg: 60, heightCm: 165, age: 25, sex: 'female' }))).toBe(1345);
  });

  test("'other' sits between the male and female constants", () => {
    const p = { weightKg: 70, heightCm: 170, age: 28 };
    const m = bmr(profile({ ...p, sex: 'male' }));
    const f = bmr(profile({ ...p, sex: 'female' }));
    const o = bmr(profile({ ...p, sex: 'other' }));
    expect(o).toBeGreaterThan(f);
    expect(o).toBeLessThan(m);
  });

  test('returns 0 rather than NaN for a missing or impossible profile', () => {
    expect(bmr(null)).toBe(0);
    expect(bmr(profile({ weightKg: 0 }))).toBe(0);
    expect(bmr(profile({ heightCm: 0 }))).toBe(0);
    expect(bmr(profile({ age: 0 }))).toBe(0);
  });
});

describe('TDEE', () => {
  test('scales BMR by the activity multiplier', () => {
    const p = profile({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'sedentary' });
    expect(tdee(p)).toBe(Math.round(1780 * 1.2)); // 2136
  });

  test('rises monotonically with activity level', () => {
    const base = { weightKg: 80, heightCm: 180, age: 30, sex: 'male' as const };
    const vals = (['sedentary', 'light', 'moderate', 'active', 'athlete'] as const)
      .map(activity => tdee(profile({ ...base, activity })));
    const sorted = [...vals].sort((a, b) => a - b);
    expect(vals).toEqual(sorted);
    expect(new Set(vals).size).toBe(vals.length);
  });

  test('is 0 when BMR is uncomputable', () => {
    expect(tdee(null)).toBe(0);
  });
});

describe('macro targets', () => {
  const p = profile({ weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'moderate' });

  test('cut is below maintenance, bulk above, recomp at it', () => {
    const maint = tdee({ ...p, goal: 'recomp' });
    expect(macroTargets({ ...p, goal: 'recomp' })!.kcal).toBe(maint);
    expect(macroTargets({ ...p, goal: 'cut' })!.kcal).toBeLessThan(maint);
    expect(macroTargets({ ...p, goal: 'bulk' })!.kcal).toBeGreaterThan(maint);
  });

  test('protein scales with bodyweight and is highest on a cut', () => {
    const cut = macroTargets({ ...p, goal: 'cut' })!;
    const bulk = macroTargets({ ...p, goal: 'bulk' })!;
    expect(cut.protein).toBe(Math.round(80 * 2.2));   // 176
    expect(bulk.protein).toBe(Math.round(80 * 1.6));  // 128
    expect(cut.protein).toBeGreaterThan(bulk.protein);
  });

  test('macros reconstruct the calorie target to within rounding', () => {
    for (const goal of ['cut', 'recomp', 'bulk'] as const) {
      const t = macroTargets({ ...p, goal })!;
      const fromMacros = t.protein * 4 + t.carb * 4 + t.fat * 9;
      // Each macro is rounded to a whole gram, so a few kcal of drift is expected.
      expect(Math.abs(fromMacros - t.kcal)).toBeLessThanOrEqual(10);
    }
  });

  test('never emits a negative macro, even on an aggressive cut for a small person', () => {
    const tiny = profile({ weightKg: 45, heightCm: 150, age: 60, sex: 'female', activity: 'sedentary', goal: 'cut' });
    const t = macroTargets(tiny)!;
    expect(t.kcal).toBeGreaterThan(0);
    expect(t.protein).toBeGreaterThanOrEqual(0);
    expect(t.carb).toBeGreaterThanOrEqual(0);
    expect(t.fat).toBeGreaterThanOrEqual(0);
  });

  test('water target is at least 2L and scales with weight', () => {
    expect(macroTargets(profile({ weightKg: 50 }))!.waterL).toBe(2);
    expect(macroTargets(profile({ weightKg: 100 }))!.waterL).toBeGreaterThan(3);
  });

  test('null profile yields null targets, not zeros', () => {
    expect(macroTargets(null)).toBeNull();
  });
});

describe('BMI', () => {
  test('weight over height squared', () => {
    expect(bmi(profile({ weightKg: 80, heightCm: 180 }))).toBe(24.7);
  });

  test('bands read in the expected order', () => {
    expect(bmiBand(17)).toBe('Underweight');
    expect(bmiBand(22)).toBe('Healthy range');
    expect(bmiBand(27)).toBe('Overweight');
    expect(bmiBand(33)).toBe('Obese');
    expect(bmiBand(0)).toBe('');
  });
});

describe('sanitizeProfile', () => {
  test('clamps absurd values instead of trusting them', () => {
    const p = sanitizeProfile({ weightKg: 9000, heightCm: -5, age: 999 } as never)!;
    expect(p.weightKg).toBeLessThanOrEqual(300);
    expect(p.heightCm).toBeGreaterThanOrEqual(90);
    expect(p.age).toBeLessThanOrEqual(100);
  });

  test('falls back to defaults for junk enum values', () => {
    const p = sanitizeProfile({ sex: 'wizard', activity: 'teleporting', goal: 'ascend' } as never)!;
    expect(['male', 'female', 'other']).toContain(p.sex);
    expect(['sedentary', 'light', 'moderate', 'active', 'athlete']).toContain(p.activity);
    expect(['cut', 'recomp', 'bulk']).toContain(p.goal);
  });

  test('null in, null out', () => {
    expect(sanitizeProfile(null)).toBeNull();
    expect(sanitizeProfile(undefined)).toBeNull();
  });
});

describe('weight log', () => {
  let s: GameState;
  beforeEach(() => { s = defaultState('Test', 'warrior'); s.body = defaultProfile(); });

  test('records a weigh-in and updates the profile weight', () => {
    logWeight(s, 82.4);
    expect(s.weightLog).toHaveLength(1);
    expect(s.weightLog[0].kg).toBe(82.4);
    expect(s.body!.weightKg).toBe(82.4);
  });

  test('one entry per day — re-weighing replaces, never appends', () => {
    logWeight(s, 80);
    logWeight(s, 80.5);
    logWeight(s, 81);
    expect(s.weightLog).toHaveLength(1);
    expect(s.weightLog[0].kg).toBe(81);
  });

  test('rejects impossible weights silently', () => {
    logWeight(s, 0);
    logWeight(s, -70);
    logWeight(s, 5000);
    logWeight(s, NaN);
    expect(s.weightLog).toHaveLength(0);
  });

  test('stays sorted oldest-first regardless of insertion order', () => {
    logWeight(s, 80, '2026-03-05');
    logWeight(s, 78, '2026-01-01');
    logWeight(s, 79, '2026-02-02');
    expect(s.weightLog.map(e => e.date)).toEqual(['2026-01-01', '2026-02-02', '2026-03-05']);
  });

  test('caps history at 365 entries, keeping the newest', () => {
    for (let i = 0; i < 400; i++) {
      const d = new Date(Date.UTC(2025, 0, 1) + i * 86400000);
      logWeight(s, 70 + (i % 10), dayKey(d));
    }
    expect(s.weightLog.length).toBe(365);
  });

  test('currentWeight prefers the latest log over the stale profile figure', () => {
    s.body!.weightKg = 70;
    logWeight(s, 68, '2026-01-01');
    logWeight(s, 66, '2026-02-01');
    expect(currentWeight(s)).toBe(66);
  });
});

describe('weightTrend', () => {
  let s: GameState;
  beforeEach(() => { s = defaultState('Test', 'warrior'); s.body = defaultProfile(); });

  test('negative when losing, positive when gaining', () => {
    const today = new Date();
    const ago = (d: number) => dayKey(new Date(today.getTime() - d * 86400000));
    logWeight(s, 85, ago(20));
    logWeight(s, 82, ago(1));
    expect(weightTrend(s, 30)).toBe(-3);

    const g = defaultState('T2', 'warrior');
    logWeight(g, 70, ago(20));
    logWeight(g, 73.5, ago(1));
    expect(weightTrend(g, 30)).toBe(3.5);
  });

  test('null when there is not enough data to claim a trend', () => {
    expect(weightTrend(s)).toBeNull();
    logWeight(s, 80);
    expect(weightTrend(s)).toBeNull();
  });
});

describe('goalProgress', () => {
  test('0 at the start, 1 at the target', () => {
    const s = defaultState('Test', 'warrior');
    s.body = { ...defaultProfile(), targetWeightKg: 75 };
    logWeight(s, 85, '2026-01-01');
    expect(goalProgress(s)).toBe(0);
    logWeight(s, 80, '2026-02-01');
    expect(goalProgress(s)).toBe(0.5);
    logWeight(s, 75, '2026-03-01');
    expect(goalProgress(s)).toBe(1);
  });

  test('clamps rather than exceeding 1 when you overshoot', () => {
    const s = defaultState('Test', 'warrior');
    s.body = { ...defaultProfile(), targetWeightKg: 75 };
    logWeight(s, 85, '2026-01-01');
    logWeight(s, 70, '2026-02-01');
    expect(goalProgress(s)).toBe(1);
  });

  test('null when no target weight is set', () => {
    const s = defaultState('Test', 'warrior');
    s.body = defaultProfile();
    logWeight(s, 80);
    expect(goalProgress(s)).toBeNull();
  });
});

describe('save compatibility', () => {
  test('a v4-shaped save with no body fields normalizes to a playable state', () => {
    const s = defaultState('Old', 'warrior');
    delete (s as Partial<GameState>).body;
    delete (s as Partial<GameState>).weightLog;
    const n = normalize(s);
    expect(n.body).toBeNull();
    expect(n.weightLog).toEqual([]);
    expect(macroTargets(n.body)).toBeNull();
  });

  test('normalize clamps a corrupt imported profile and drops junk weigh-ins', () => {
    const s = defaultState('Bad', 'warrior');
    s.body = { weightKg: 9999, heightCm: 1, age: -4, sex: 'x', activity: 'y', goal: 'z' } as never;
    s.weightLog = [
      { date: '2026-01-01', kg: 80 },
      { date: '2026-01-02', kg: NaN },
      { date: '2026-01-03', kg: 9000 },
      null,
    ] as never;
    const n = normalize(s);
    expect(n.body!.weightKg).toBeLessThanOrEqual(300);
    expect(n.body!.age).toBeGreaterThanOrEqual(13);
    expect(n.weightLog).toHaveLength(1);
    expect(n.weightLog[0].kg).toBe(80);
  });
});
