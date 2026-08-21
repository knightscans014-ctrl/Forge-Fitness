// Offline food database and search.
//
// Data: USDA FoodData Central SR Legacy (public domain, CC0 1.0) trimmed to the
// five numbers a fitness app needs, plus a hand-written table of Indian staples
// because SR Legacy has no paneer, dal, idli or roti in it at all.
//
// The whole table is ~640KB of JSON parsed once on first search. That is the
// deliberate trade: no network, no API key, no per-query cost, works on a plane.

import type { Food, FoodSearchResult, MealEntry, GameState, MacroTargets } from './types';
import { dayKey } from './state';

// Packed as arrays rather than objects: 7,505 rows of {name,cat,kcal,...} keys
// cost about 400KB of repeated key strings on their own.
type PackedRow = [string, number, number, number, number, number, number, string];
interface PackedDb { cats: string[]; rows: PackedRow[] }

let DB: Food[] | null = null;

/**
 * Parse the packed table on first use.
 *
 * Deferred rather than done at import so app startup does not pay for it: a
 * player who never opens the food search never parses the database.
 */
export function foods(): Food[] {
  if (DB) return DB;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packed = require('../data/foods.json') as PackedDb;
  DB = packed.rows.map((r, i) => ({
    id: i,
    name: r[0],
    cat: packed.cats[r[1]] || '',
    kcal: r[2],
    protein: r[3],
    carb: r[4],
    fat: r[5],
    portionG: r[6] || 0,
    portionLabel: r[7] || '',
  }));
  return DB;
}

/** Look one food up by id. */
export function foodById(id: number): Food | null {
  return foods().find(f => f.id === id) || null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Score a food against a query.
 *
 * Plain substring matching is not good enough here and the failure is not
 * subtle: searching "banana" in raw SR Legacy returns banana *pudding* before
 * the fruit, and "milk" returns mashed potatoes made with milk. Both are
 * substring hits, both are wrong.
 *
 * So matches are ranked by how central the query is to the food's identity:
 * the whole name beats the first word beats a later word beats a fragment.
 * Shorter names win ties, because in this dataset a short name means the plain
 * ingredient and a long one means a specific preparation of it.
 *
 * Returns -1 for no match.
 */
export function scoreFood(f: Food, q: string): number {
  const name = norm(f.name);
  const query = norm(q);
  if (!query) return -1;

  const words = name.split(' ');
  let score: number;

  if (name === query) score = 1000;
  else if (words[0] === query) score = 900;             // "Banana" in "Banana, raw"
  else if (name.startsWith(query + ' ')) score = 850;   // multi-word prefix
  else if (words.includes(query)) score = 700;          // exact word, later position
  else if (words.some(w => w.startsWith(query))) score = 500;
  else if (name.includes(query)) score = 250;           // mid-word fragment
  else {
    // Multi-word queries: every term must appear somewhere.
    const terms = query.split(' ').filter(Boolean);
    if (terms.length > 1 && terms.every(t => name.includes(t))) score = 400;
    else return -1;
  }

  // Prefer concise names -- "Banana, raw" over "Puddings, banana, dry mix".
  score -= Math.min(120, words.length * 8);
  // Nudge the hand-written common/Indian entries up: they are the ones a user
  // people actually search, and cover staples SR Legacy simply lacks.
  if (f.cat === 'Common') score += 60;
  return score;
}

/** Ranked search. Empty query returns []. */
export function searchFoods(q: string, limit = 40): FoodSearchResult[] {
  if (!q || !q.trim()) return [];
  const out: FoodSearchResult[] = [];
  for (const f of foods()) {
    const sc = scoreFood(f, q);
    if (sc >= 0) out.push({ food: f, score: sc });
  }
  out.sort((a, b) => b.score - a.score || a.food.name.length - b.food.name.length);
  return out.slice(0, limit);
}

/** Macros for a given gram weight of a food. */
export function macrosFor(f: Food, grams: number): { kcal: number; protein: number; carb: number; fat: number } {
  const k = grams / 100;
  return {
    kcal: Math.round(f.kcal * k),
    protein: Math.round(f.protein * k * 10) / 10,
    carb: Math.round(f.carb * k * 10) / 10,
    fat: Math.round(f.fat * k * 10) / 10,
  };
}

// ---- Meal log ----

/** Log a food against today (or a given day). */
export function logMeal(s: GameState, foodId: number, grams: number, when?: string): MealEntry | null {
  const f = foodById(foodId);
  if (!f) return null;
  const g = Math.round(Number(grams));
  if (!(g > 0 && g <= 5000)) return null;

  if (!Array.isArray(s.meals)) s.meals = [];
  const m = macrosFor(f, g);
  const entry: MealEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: when || dayKey(),
    foodId,
    name: f.name,
    grams: g,
    ...m,
  };
  s.meals.push(entry);
  // Keep roughly 90 days of meals; older ones are already reflected in history.
  if (s.meals.length > 2000) s.meals = s.meals.slice(-2000);
  return entry;
}

export function removeMeal(s: GameState, id: string): void {
  if (!Array.isArray(s.meals)) return;
  s.meals = s.meals.filter(m => m.id !== id);
}

/** Everything logged on a day. */
export function mealsOn(s: GameState, date?: string): MealEntry[] {
  const d = date || dayKey();
  return Array.isArray(s.meals) ? s.meals.filter(m => m.date === d) : [];
}

/** Totals for a day. */
export function dayTotals(s: GameState, date?: string): { kcal: number; protein: number; carb: number; fat: number } {
  const t = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  for (const m of mealsOn(s, date)) {
    t.kcal += m.kcal; t.protein += m.protein; t.carb += m.carb; t.fat += m.fat;
  }
  return {
    kcal: Math.round(t.kcal),
    protein: Math.round(t.protein * 10) / 10,
    carb: Math.round(t.carb * 10) / 10,
    fat: Math.round(t.fat * 10) / 10,
  };
}

/**
 * How today's intake compares to target, as 0..1 ratios.
 * null when there is no profile to compare against.
 */
export function adherence(s: GameState, targets: MacroTargets | null, date?: string) {
  if (!targets) return null;
  const t = dayTotals(s, date);
  return {
    kcal: targets.kcal ? t.kcal / targets.kcal : 0,
    protein: targets.protein ? t.protein / targets.protein : 0,
    carb: targets.carb ? t.carb / targets.carb : 0,
    fat: targets.fat ? t.fat / targets.fat : 0,
    totals: t,
  };
}

/**
 * Did the player hit their protein target today? Used by the quest loop.
 * 95% counts as hit -- demanding an exact gram would make it unwinnable.
 */
export function proteinHit(s: GameState, targets: MacroTargets | null, date?: string): boolean {
  if (!targets) return false;
  return dayTotals(s, date).protein >= targets.protein * 0.95;
}

/**
 * Was the calorie target met without blowing past it?
 * A band, not a point: within 10% either side.
 */
export function calorieHit(s: GameState, targets: MacroTargets | null, date?: string): boolean {
  if (!targets) return false;
  const k = dayTotals(s, date).kcal;
  return k >= targets.kcal * 0.9 && k <= targets.kcal * 1.1;
}

/**
 * Quests the meal log can verify on its own, mapped to the check that proves
 * them. Everything else in the nutrition pool stays self-attested, because no
 * amount of logging can prove you cooked from scratch.
 *
 * Keyed by quest id, which is a permanent save key -- append only.
 */
export const VERIFIED_NUTRITION: Record<string, (s: GameState, t: MacroTargets | null) => boolean> = {
  q_nu01: (s, t) => proteinHit(s, t),          // Protein Target
  q_nu08: (s, t) => calorieHit(s, t),          // Calorie Target
  q_v: s => mealsOn(s).length > 0,             // Fuel Day -- log a meal
};

/**
 * Is this quest one the food log verifies, and has it been earned?
 * Returns null when the quest is not verifiable, so callers can tell
 * "not applicable" apart from "not yet earned".
 */
export function nutritionQuestMet(s: GameState, qid: string, t: MacroTargets | null): boolean | null {
  const check = VERIFIED_NUTRITION[qid];
  if (!check) return null;
  return check(s, t);
}
