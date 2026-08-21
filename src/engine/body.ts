// Body profile, energy expenditure, and macro targets.
//
// Everything here is arithmetic on numbers the player gives us. No network, no
// database, no dependency. The formulas are the standard published ones so the
// output can be checked against any calculator.

import { GameState, BodyProfile, MacroTargets, WeightEntry, Sex, ActivityLevel, BodyGoal } from './types';
import { dayKey } from './state';

/**
 * Activity multipliers applied to BMR to get TDEE. These are the conventional
 * Harris-Benedict/Mifflin bands; they are estimates, not measurements.
 */
export const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,   // desk job, little deliberate movement
  light: 1.375,     // light exercise 1-3 days/week
  moderate: 1.55,   // moderate exercise 3-5 days/week
  active: 1.725,    // hard exercise 6-7 days/week
  athlete: 1.9,     // physical job or twice-daily training
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary — desk job, little exercise',
  light: 'Light — exercise 1-3 days a week',
  moderate: 'Moderate — exercise 3-5 days a week',
  active: 'Active — exercise 6-7 days a week',
  athlete: 'Athlete — physical job or two-a-days',
};

export const GOAL_LABEL: Record<BodyGoal, string> = {
  cut: 'Lose fat',
  recomp: 'Maintain / recomposition',
  bulk: 'Gain muscle',
};

/** Calorie adjustment applied to TDEE for each goal. */
export const GOAL_ADJUST: Record<BodyGoal, number> = {
  cut: -0.20,   // a 20% deficit: roughly 0.5kg/week for most people
  recomp: 0,
  bulk: 0.10,   // a lean 10% surplus rather than a dirty bulk
};

/** Protein grams per kg of bodyweight, by goal. Higher when cutting to spare muscle. */
const PROTEIN_PER_KG: Record<BodyGoal, number> = {
  cut: 2.2,
  recomp: 1.8,
  bulk: 1.6,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Mifflin-St Jeor basal metabolic rate, in kcal/day.
 *
 * Chosen over Harris-Benedict because it is the more accurate of the two for
 * modern populations. Returns 0 for a profile that is missing or nonsensical
 * rather than NaN, so callers can treat 0 as "not computable".
 */
export function bmr(p: BodyProfile | null): number {
  if (!p) return 0;
  const { weightKg, heightCm, age, sex } = p;
  if (!(weightKg > 0) || !(heightCm > 0) || !(age > 0)) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  // The sex term is the constant offset from the published formula. 'other'
  // takes the midpoint rather than forcing a choice.
  const offset = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return Math.round(base + offset);
}

/** Total daily energy expenditure: BMR scaled by how much the player moves. */
export function tdee(p: BodyProfile | null): number {
  const b = bmr(p);
  if (!b || !p) return 0;
  return Math.round(b * (ACTIVITY_MULT[p.activity] ?? 1.2));
}

/**
 * Daily calorie and macro targets for the profile's goal.
 *
 * Protein is set per kg of bodyweight, fat at 25% of calories (a floor for
 * hormone health), and carbohydrate takes whatever is left. Carbs can floor at
 * zero for an aggressive cut on a light person; that is intentional and the UI
 * shows it rather than hiding it.
 */
export function macroTargets(p: BodyProfile | null): MacroTargets | null {
  const t = tdee(p);
  if (!t || !p) return null;

  const kcal = Math.round(t * (1 + (GOAL_ADJUST[p.goal] ?? 0)));
  const protein = Math.round(p.weightKg * (PROTEIN_PER_KG[p.goal] ?? 1.8));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbLeft = kcal - protein * 4 - fat * 9;
  const carb = Math.max(0, Math.round(carbLeft / 4));

  // Water: 35ml per kg, the common clinical rule of thumb, floored at 2L.
  const waterL = Math.max(2, Math.round((p.weightKg * 0.035) * 10) / 10);

  return { kcal, protein, carb, fat, waterL };
}

/** Body mass index. 0 when the profile can't support it. */
export function bmi(p: BodyProfile | null): number {
  if (!p || !(p.heightCm > 0) || !(p.weightKg > 0)) return 0;
  const m = p.heightCm / 100;
  return Math.round((p.weightKg / (m * m)) * 10) / 10;
}

/**
 * BMI band label. Deliberately neutral wording: this is a population screening
 * tool, not a diagnosis, and it misreads muscular people as overweight.
 */
export function bmiBand(v: number): string {
  if (!v) return '';
  if (v < 18.5) return 'Underweight';
  if (v < 25) return 'Healthy range';
  if (v < 30) return 'Overweight';
  return 'Obese';
}

/** A sane default profile so the UI always has something to edit. */
export function defaultProfile(): BodyProfile {
  return {
    heightCm: 170,
    weightKg: 70,
    age: 25,
    sex: 'male',
    activity: 'moderate',
    goal: 'recomp',
    targetWeightKg: null,
    updatedAt: dayKey(),
  };
}

/** Clamp a profile into believable ranges. Guards against typos and bad imports. */
export function sanitizeProfile(p: Partial<BodyProfile> | null | undefined): BodyProfile | null {
  if (!p || typeof p !== 'object') return null;
  const d = defaultProfile();
  const sex: Sex[] = ['male', 'female', 'other'];
  const act: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'athlete'];
  const goal: BodyGoal[] = ['cut', 'recomp', 'bulk'];
  return {
    heightCm: clamp(Number(p.heightCm) || d.heightCm, 90, 250),
    weightKg: clamp(Number(p.weightKg) || d.weightKg, 25, 300),
    age: clamp(Math.round(Number(p.age) || d.age), 13, 100),
    sex: sex.includes(p.sex as Sex) ? (p.sex as Sex) : d.sex,
    activity: act.includes(p.activity as ActivityLevel) ? (p.activity as ActivityLevel) : d.activity,
    goal: goal.includes(p.goal as BodyGoal) ? (p.goal as BodyGoal) : d.goal,
    targetWeightKg:
      p.targetWeightKg == null || !Number(p.targetWeightKg)
        ? null
        : clamp(Number(p.targetWeightKg), 25, 300),
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : d.updatedAt,
  };
}

/**
 * Record today's weight, replacing any earlier entry for the same day.
 *
 * One entry per day keeps the trend line honest: weighing five times in a
 * morning shouldn't produce five points of noise.
 */
export function logWeight(s: GameState, kg: number, when?: string): void {
  const w = Number(kg);
  if (!(w >= 25 && w <= 300)) return;
  if (!Array.isArray(s.weightLog)) s.weightLog = [];
  const date = when || dayKey();
  const rounded = Math.round(w * 10) / 10;

  const existing = s.weightLog.find(e => e.date === date);
  if (existing) existing.kg = rounded;
  else s.weightLog.push({ date, kg: rounded });

  s.weightLog.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (s.weightLog.length > 365) s.weightLog = s.weightLog.slice(-365);

  // The profile tracks current weight, so targets follow the scale.
  if (s.body) {
    s.body.weightKg = rounded;
    s.body.updatedAt = date;
  }
}

/**
 * Weight change over the last `days`, in kg. Positive means gained.
 * Returns null when there aren't two points far enough apart to mean anything.
 */
export function weightTrend(s: GameState, days = 30): number | null {
  const log = s.weightLog;
  if (!Array.isArray(log) || log.length < 2) return null;
  const cutoff = dayKey(new Date(Date.now() - days * 86400000));
  const window = log.filter(e => e.date >= cutoff);
  const pts = window.length >= 2 ? window : log.slice(-2);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last || first.date === last.date) return null;
  return Math.round((last.kg - first.kg) * 10) / 10;
}

/** Most recently logged weight, falling back to the profile's figure. */
export function currentWeight(s: GameState): number {
  const log = s.weightLog;
  if (Array.isArray(log) && log.length) return log[log.length - 1].kg;
  return s.body?.weightKg ?? 0;
}

/**
 * Progress toward the goal weight as 0..1, or null when there's no target.
 * Measured from the first logged weight so the bar reflects real movement.
 */
export function goalProgress(s: GameState): number | null {
  const target = s.body?.targetWeightKg;
  if (!target || !Array.isArray(s.weightLog) || !s.weightLog.length) return null;
  const start = s.weightLog[0].kg;
  const now = currentWeight(s);
  const span = target - start;
  if (Math.abs(span) < 0.1) return 1;
  return clamp((now - start) / span, 0, 1);
}

export type { WeightEntry };
