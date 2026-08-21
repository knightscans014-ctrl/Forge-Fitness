// Goal arcs, rate-of-change, and the weekly review.
//
// The most important tests in this file are the ones asserting that nothing
// pays out for raw weight lost. An arc that rewarded "down 10kg" would be
// rewarding crash dieting; several tests below exist purely to keep that
// property from regressing.

import {
  RATE_BAND, weeklyRate, rateVerdict, rateAdvice, weeksOnTrack,
  daysLogged, proteinDays, calorieDays, overloadDays,
  weeklyReview, weightSeries, volumeSeries,
  STORY_MISSIONS, defaultState, logWeight, logSet, logMeal, dayKey,
} from '../index';
import type { GameState, BodyGoal } from '../types';

/** A day key `n` days before today. */
function ago(n: number): string {
  return dayKey(new Date(Date.now() - n * 86400000));
}

/** Seed a weight log with a straight line of `perWeek` kg/week. */
function seedWeights(s: GameState, startKg: number, perWeek: number, days: number, every = 2) {
  for (let d = days; d >= 0; d -= every) {
    const kg = startKg + (perWeek / 7) * (days - d);
    logWeight(s, Math.round(kg * 10) / 10, ago(d));
  }
}

function withGoal(goal: BodyGoal): GameState {
  const s = defaultState('T', 'warrior');
  s.body = {
    heightCm: 175, weightKg: 80, age: 30, sex: 'male',
    activity: 'moderate', goal, targetWeightKg: null, updatedAt: dayKey(),
  };
  return s;
}

describe('weeklyRate', () => {
  test('null until there is enough data', () => {
    const s = withGoal('cut');
    expect(weeklyRate(s)).toBeNull();
    logWeight(s, 80, ago(4));
    logWeight(s, 79.5, ago(2));
    expect(weeklyRate(s)).toBeNull(); // only two points
  });

  test('null when the points are squeezed into a few days', () => {
    const s = withGoal('cut');
    logWeight(s, 80, ago(3));
    logWeight(s, 79.8, ago(2));
    logWeight(s, 79.6, ago(1));
    // Three points but under a week of spread — not enough to call a trend.
    expect(weeklyRate(s)).toBeNull();
  });

  test('recovers a clean downward rate', () => {
    const s = withGoal('cut');
    seedWeights(s, 85, -0.5, 20);
    expect(weeklyRate(s)).toBeCloseTo(-0.5, 1);
  });

  test('recovers a clean upward rate', () => {
    const s = withGoal('bulk');
    seedWeights(s, 70, 0.3, 20);
    expect(weeklyRate(s)).toBeCloseTo(0.3, 1);
  });

  test('a single noisy weigh-in does not flip the trend', () => {
    // This is the whole reason for a least-squares fit over first-vs-last.
    const s = withGoal('cut');
    seedWeights(s, 85, -0.5, 20);
    const clean = weeklyRate(s)!;
    logWeight(s, 86.5, ago(0)); // one salty dinner
    const noisy = weeklyRate(s)!;
    expect(noisy).toBeLessThan(0);          // still reads as a loss
    expect(Math.abs(noisy - clean)).toBeLessThan(0.6);
  });
});

describe('rateVerdict', () => {
  test('no body profile, no verdict', () => {
    const s = defaultState('T', 'warrior');
    expect(rateVerdict(s)).toBe('no-data');
  });

  test('a sensible cut is on track', () => {
    const s = withGoal('cut');
    seedWeights(s, 85, -0.6, 20);
    expect(rateVerdict(s)).toBe('on-track');
  });

  test('crash dieting is flagged, not celebrated', () => {
    const s = withGoal('cut');
    seedWeights(s, 85, -1.8, 20);
    expect(rateVerdict(s)).toBe('too-fast');
    expect(rateAdvice(s)).toMatch(/eat a bit more/i);
  });

  test('a stalled cut reads as too slow', () => {
    const s = withGoal('cut');
    seedWeights(s, 85, -0.05, 20);
    expect(rateVerdict(s)).toBe('too-slow');
  });

  test('gaining while cutting is wrong-way', () => {
    const s = withGoal('cut');
    seedWeights(s, 85, 0.4, 20);
    expect(rateVerdict(s)).toBe('wrong-way');
  });

  test('a dirty bulk is flagged as too fast', () => {
    const s = withGoal('bulk');
    seedWeights(s, 70, 1.2, 20);
    expect(rateVerdict(s)).toBe('too-fast');
    expect(rateAdvice(s)).toMatch(/fat/i);
  });

  test('recomp wants the scale still', () => {
    const s = withGoal('recomp');
    seedWeights(s, 75, 0.05, 20);
    expect(rateVerdict(s)).toBe('on-track');
    const drifting = withGoal('recomp');
    seedWeights(drifting, 75, 0.8, 20);
    expect(rateVerdict(drifting)).toBe('too-fast');
  });

  test('every verdict has advice that is not empty', () => {
    for (const goal of ['cut', 'recomp', 'bulk'] as BodyGoal[]) {
      for (const rate of [-2, -0.5, 0, 0.3, 1.5]) {
        const s = withGoal(goal);
        seedWeights(s, 80, rate, 20);
        expect(rateAdvice(s).length).toBeGreaterThan(15);
      }
    }
  });

  test('the bands are ordered sanely', () => {
    for (const goal of Object.keys(RATE_BAND) as BodyGoal[]) {
      expect(RATE_BAND[goal].min).toBeLessThan(RATE_BAND[goal].max);
    }
    // A cut band must be negative, a bulk band positive. Getting these
    // backwards would invert every verdict in the app.
    expect(RATE_BAND.cut.max).toBeLessThan(0);
    expect(RATE_BAND.bulk.min).toBeGreaterThan(0);
  });
});

describe('weeksOnTrack', () => {
  test('zero without data', () => {
    expect(weeksOnTrack(withGoal('cut'))).toBe(0);
  });

  test('counts consecutive weeks of a held rate', () => {
    const s = withGoal('cut');
    seedWeights(s, 90, -0.6, 42);
    expect(weeksOnTrack(s)).toBeGreaterThanOrEqual(3);
  });

  test('a crash week does not count as on track', () => {
    const s = withGoal('cut');
    seedWeights(s, 90, -2.5, 28);
    expect(weeksOnTrack(s)).toBe(0);
  });
});

describe('counters behind the arcs', () => {
  let s: GameState;
  beforeEach(() => { s = withGoal('cut'); });

  test('daysLogged counts distinct days, not meals', () => {
    logMeal(s, 1, 100, ago(1));
    logMeal(s, 2, 100, ago(1));
    logMeal(s, 3, 100, ago(2));
    expect(daysLogged(s)).toBe(2);
  });

  test('overloadDays counts sessions where something was beaten', () => {
    logSet(s, 'x_squat', 100, 5, ago(10));
    logSet(s, 'x_squat', 105, 5, ago(3));
    logSet(s, 'x_squat', 110, 5, ago(1));
    expect(overloadDays(s)).toBe(2); // the first session had nothing to beat
  });

  test('protein and calorie days are zero without a target', () => {
    const bare = defaultState('T', 'warrior');
    bare.body = null;
    expect(proteinDays(bare)).toBe(0);
    expect(calorieDays(bare)).toBe(0);
  });
});

describe('goal arcs', () => {
  const GOAL_ARCS = ['sm13', 'sm14', 'sm15', 'sm16'];

  test('all four arcs exist', () => {
    for (const id of GOAL_ARCS) {
      expect(STORY_MISSIONS.find(a => a.id === id)).toBeTruthy();
    }
  });

  test('arc ids are unique across the whole story set', () => {
    const ids = STORY_MISSIONS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('NO arc step rewards raw weight lost or gained', () => {
    // The load-bearing test of this module. If someone later adds a step that
    // checks `currentWeight(s) <= X`, this is what should stop them.
    // Targets an *amount* of weight, which is the thing that must never be
    // a reward. "Hold weight steady" is fine -- that is a rate, not a prize.
    const forbidden = /lose \d|lost \d|\d+ ?kg (lost|gone|down|off)|drop \d+ ?kg|gain \d+ ?kg|reach \d+ ?kg/i;
    for (const id of GOAL_ARCS) {
      const arc = STORY_MISSIONS.find(a => a.id === id)!;
      for (const st of arc.steps) {
        expect(`${id}/${st.name}: ${st.req}`).not.toMatch(forbidden);
      }
    }
  });

  test('a crash dieter does not clear the cutting arc', () => {
    // Down 2.5kg a week for a month: lots of weight gone, nothing earned.
    const s = withGoal('cut');
    seedWeights(s, 95, -2.5, 28);
    const arc = STORY_MISSIONS.find(a => a.id === 'sm13')!;
    const rateSteps = arc.steps.filter(st => st.req.includes('rate'));
    expect(rateSteps.length).toBeGreaterThan(0);
    for (const st of rateSteps) expect(st.check(s)).toBe(false);
  });

  test('a steady cutter does clear the early rate step', () => {
    const s = withGoal('cut');
    seedWeights(s, 90, -0.6, 42);
    const arc = STORY_MISSIONS.find(a => a.id === 'sm13')!;
    const step = arc.steps.find(st => st.name === 'Steady Descent')!;
    expect(step.check(s)).toBe(true);
  });

  test('goal-specific steps stay locked under the wrong goal', () => {
    const bulker = withGoal('bulk');
    seedWeights(bulker, 70, 0.3, 42);
    const cutArc = STORY_MISSIONS.find(a => a.id === 'sm13')!;
    expect(cutArc.steps.find(st => st.name === 'Steady Descent')!.check(bulker)).toBe(false);
  });

  test('every step check survives a blank save', () => {
    // checkStory runs these against whatever is in the save, including a
    // brand-new one with no body, no meals and no sets.
    const blank = defaultState('New', 'warrior');
    blank.body = null;
    for (const arc of STORY_MISSIONS) {
      for (const st of arc.steps) {
        expect(() => st.check(blank)).not.toThrow();
      }
    }
  });

  test('a blank save has cleared no goal step', () => {
    const blank = defaultState('New', 'warrior');
    blank.body = null;
    for (const id of GOAL_ARCS) {
      const arc = STORY_MISSIONS.find(a => a.id === id)!;
      for (const st of arc.steps) expect(st.check(blank)).toBe(false);
    }
  });
});

describe('weekly review', () => {
  test('an empty week reads honestly rather than cheerfully', () => {
    const s = withGoal('cut');
    const r = weeklyReview(s);
    expect(r.days).toHaveLength(7);
    expect(r.workouts).toBe(0);
    expect(r.sets).toBe(0);
    expect(r.headline).toMatch(/nothing logged/i);
  });

  test('counts sets, volume and PRs inside the window only', () => {
    const s = withGoal('cut');
    logSet(s, 'x_squat', 100, 5, ago(30));  // outside
    logSet(s, 'x_squat', 105, 5, ago(2));   // inside, and a PR
    logSet(s, 'x_bench', 80, 5, ago(1));    // inside, first ever
    const r = weeklyReview(s);
    expect(r.sets).toBe(2);
    expect(r.volume).toBe(105 * 5 + 80 * 5);
    expect(r.prs).toBe(1);
    expect(r.workouts).toBe(2);
  });

  test('a dangerous rate outranks a good PR count in the headline', () => {
    const s = withGoal('cut');
    seedWeights(s, 90, -2.5, 21);
    logSet(s, 'x_squat', 100, 5, ago(10));
    logSet(s, 'x_squat', 105, 5, ago(3));
    logSet(s, 'x_bench', 80, 5, ago(10));
    logSet(s, 'x_bench', 85, 5, ago(3));
    logSet(s, 'x_ohp', 50, 5, ago(10));
    logSet(s, 'x_ohp', 55, 5, ago(3));
    const r = weeklyReview(s);
    expect(r.prs).toBe(3);
    expect(r.headline).toMatch(/ease off/i);
  });

  test('celebrates a strong week', () => {
    const s = withGoal('recomp');
    for (const d of [6, 5, 4, 3, 2]) logSet(s, 'x_squat', 100, 5, ago(d));
    const r = weeklyReview(s);
    expect(r.workouts).toBe(5);
    expect(r.headline).toMatch(/sessions/i);
  });

  test('weight change is null without two weigh-ins in the window', () => {
    const s = withGoal('cut');
    logWeight(s, 85, ago(2));
    expect(weeklyReview(s).weightChange).toBeNull();
  });

  test('weight change reads the window, not all history', () => {
    const s = withGoal('cut');
    logWeight(s, 90, ago(40));
    logWeight(s, 85, ago(5));
    logWeight(s, 84.5, ago(1));
    expect(weeklyReview(s).weightChange).toBeCloseTo(-0.5, 1);
  });

  test('a fixed end date makes the review deterministic', () => {
    const s = withGoal('cut');
    logSet(s, 'x_squat', 100, 5, '2026-05-04');
    const r = weeklyReview(s, '2026-05-06');
    expect(r.days[0]).toBe('2026-04-30');
    expect(r.days[6]).toBe('2026-05-06');
    expect(r.sets).toBe(1);
  });
});

describe('chart series', () => {
  test('volumeSeries includes rest days as zeros', () => {
    const s = withGoal('cut');
    logSet(s, 'x_squat', 100, 5, ago(3));
    const series = volumeSeries(s, 7);
    expect(series).toHaveLength(7);
    expect(series.filter(p => p.volume === 0)).toHaveLength(6);
    expect(series.find(p => p.date === ago(3))!.volume).toBe(500);
  });

  test('weightSeries respects its window', () => {
    const s = withGoal('cut');
    logWeight(s, 90, ago(200));
    logWeight(s, 85, ago(5));
    expect(weightSeries(s, 90)).toHaveLength(1);
    expect(weightSeries(s, 365)).toHaveLength(2);
  });
});
