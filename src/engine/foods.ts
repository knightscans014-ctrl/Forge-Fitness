// Offline food database and search.
//
// Data: USDA FoodData Central SR Legacy (public domain, CC0 1.0) trimmed to the
// five numbers a fitness app needs, plus a hand-written table of Indian staples
// because SR Legacy has no paneer, dal, idli or roti in it at all.
//
// The whole table is ~640KB of JSON parsed once on first search. That is the
// deliberate trade: no network, no API key, no per-query cost, works on a plane.

import type { Food, FoodSearchResult, MealEntry, GameState, MacroTargets, CustomFood } from './types';
import { dayKey } from './state';

// Packed as arrays rather than objects: 7,505 rows of {name,cat,kcal,...} keys
// cost about 400KB of repeated key strings on their own.
type PackedRow = [string, number, number, number, number, number, number, string];
interface PackedDb { cats: string[]; rows: PackedRow[] }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

let DB: Food[] | null = null;
/** Normalised name + word split, computed once. Rebuilt whenever DB is. */
let NORM: { name: string; words: string[] }[] | null = null;

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
  NORM = DB.map(f => {
    const nm = norm(f.name);
    return { name: nm, words: nm.split(' ') };
  });
  return DB;
}

/**
 * Ids at or above this belong to player-created foods.
 *
 * Database ids are array indices into foods.json, so they grow from 0 upward
 * as rows are added. Starting custom ids at a million keeps the two ranges
 * from ever meeting -- without this, adding a row to the database would
 * silently repoint an old logged meal at a different food.
 */
export const CUSTOM_ID_BASE = 1000000;

/** The player's own foods, newest first. */
export function customFoods(s: GameState): CustomFood[] {
  return Array.isArray(s.customFoods) ? s.customFoods : [];
}

/** Present a custom food with the same shape as a database one. */
function asFood(c: CustomFood): Food {
  return { ...c, cat: 'My foods' };
}

/**
 * Add a food the database does not have -- a regional dish, a supplement, a
 * packet with a label on the back.
 *
 * The database can never be complete, and a food you cannot log is a day you
 * cannot log. Returns null if the numbers are nonsense.
 */
export function addCustomFood(s: GameState, input: {
  name: string; kcal: number; protein: number; carb: number; fat: number;
  portionG?: number; portionLabel?: string;
}): CustomFood | null {
  const name = String(input.name || '').trim().slice(0, 60);
  if (!name) return null;

  const num = (v: unknown, max: number) => {
    const n = Number(v);
    return isFinite(n) && n >= 0 && n <= max ? Math.round(n * 10) / 10 : null;
  };
  const kcal = num(input.kcal, 900);
  const protein = num(input.protein, 100);
  const carb = num(input.carb, 100);
  const fat = num(input.fat, 100);
  if (kcal === null || protein === null || carb === null || fat === null) return null;

  if (!Array.isArray(s.customFoods)) s.customFoods = [];
  if (s.customFoods.length >= 500) return null;

  const maxId = s.customFoods.reduce((m, f) => Math.max(m, f.id), CUSTOM_ID_BASE - 1);
  const food: CustomFood = {
    id: maxId + 1,
    name, kcal, protein, carb, fat,
    portionG: num(input.portionG, 2000) || 0,
    portionLabel: String(input.portionLabel || '').trim().slice(0, 30),
  };
  s.customFoods.unshift(food);
  return food;
}

/** Forget a custom food. Meals already logged keep their snapshotted macros. */
export function removeCustomFood(s: GameState, id: number): void {
  if (!Array.isArray(s.customFoods)) return;
  s.customFoods = s.customFoods.filter(f => f.id !== id);
}

/** Look one food up by id, custom foods included. */
export function foodById(id: number, s?: GameState): Food | null {
  if (id >= CUSTOM_ID_BASE) {
    if (!s) return null;
    const c = customFoods(s).find(f => f.id === id);
    return c ? asFood(c) : null;
  }
  return foods().find(f => f.id === id) || null;
}

/**
 * Query aliases: what people type -> what the database calls it.
 *
 * Three separate problems, one table. Regional spellings ("idly", "chapathi"),
 * English/Hindi pairs ("brinjal" for eggplant, "curd" for yoghurt), and common
 * misspellings ("chiken", "panner"). Without this, 24 of 71 realistic Indian
 * queries returned nothing at all -- measured, not guessed.
 *
 * Aliases expand rather than replace, so "curd" still finds "Curd / Dahi"
 * first and merely also reaches yoghurt.
 */
const ALIASES: Record<string, string[]> = {
  // spellings and transliterations
  idly: ['idli'], chapathi: ['chapati', 'roti'], chappati: ['chapati', 'roti'],
  chapatti: ['chapati', 'roti'], rotli: ['roti'], phulka: ['roti', 'chapati'],
  dhal: ['dal'], daal: ['dal'], dahl: ['dal'], parantha: ['paratha'],
  pranthas: ['paratha'], parathas: ['paratha'], dosai: ['dosa'], thosai: ['dosa'],
  vadai: ['vada'], sambhar: ['sambar'], curd: ['dahi', 'yogurt', 'yoghurt'],
  dahi: ['curd'], jeera: ['cumin'], haldi: ['turmeric'], dhania: ['coriander'],
  // misspellings people actually make
  chiken: ['chicken'], chikken: ['chicken'], panner: ['paneer'], panir: ['paneer'],
  banna: ['banana'], bannana: ['banana'], yoghurt: ['yogurt'], yogurt: ['yoghurt'],
  brocolli: ['broccoli'], potatoe: ['potato'], tomatoe: ['tomato'],
  // english <-> indian vegetable names
  brinjal: ['eggplant', 'baingan'], baingan: ['brinjal', 'eggplant'],
  aubergine: ['eggplant', 'brinjal'], capsicum: ['bell pepper', 'pepper'],
  ladyfinger: ['okra', 'bhindi'], bhindi: ['okra'], okra: ['bhindi'],
  ladoo: ['laddu'], laddu: ['ladoo'], barfi: ['burfi'], burfi: ['barfi'],
  methi: ['fenugreek'], fenugreek: ['methi'], palak: ['spinach'],
  spinach: ['palak'], gobi: ['cauliflower'], cauliflower: ['gobi'],
  lauki: ['bottle gourd'], karela: ['bitter gourd'], aloo: ['potato'],
  matar: ['peas'], pyaz: ['onion'], adrak: ['ginger'], lehsun: ['garlic'],
  // flours and grains
  atta: ['whole wheat flour'], maida: ['refined flour'], besan: ['chickpea flour'],
  sooji: ['semolina'], rava: ['semolina'], suji: ['semolina'],
  dalia: ['daliya', 'broken wheat'], sabudana: ['sago', 'tapioca'],
  poha: ['flattened rice'], ragi: ['finger millet'], bajra: ['pearl millet'],
  jowar: ['sorghum'],
  // dairy and protein
  ghee: ['clarified butter'], khoya: ['mawa'], mawa: ['khoya'],
  chaas: ['buttermilk'], curdrice: ['curd rice'], soya: ['soy'], soy: ['soya'],
  anda: ['egg'], omlet: ['omelette'], omelet: ['omelette'], bhurji: ['scrambled'],
  keema: ['mince', 'minced'], mutton: ['goat', 'lamb'], jhinga: ['prawn'],
  // fruit
  anar: ['pomegranate'], sitaphal: ['custard apple'], mosambi: ['sweet lime'],
  chikoo: ['sapota'], sapota: ['chikoo'], aam: ['mango'], kela: ['banana'],
  seb: ['apple'], angoor: ['grapes'], nariyal: ['coconut'],
  // dishes
  momo: ['momos'], gol: ['golgappa'], puchka: ['golgappa', 'pani puri'],
  panipuri: ['pani puri', 'golgappa'], chai: ['tea'], coffe: ['coffee'],
  'lady finger': ['ladies finger', 'okra', 'bhindi'],
  'ladies finger': ['okra', 'bhindi'], 'bottle gourd': ['lauki'],
  'bitter gourd': ['karela'], 'green gram': ['moong'], 'black gram': ['urad'],
  'red lentil': ['masoor'], 'cottage cheese': ['paneer'], 'clarified butter': ['ghee'],
};

/** Damerau-Levenshtein distance, capped -- bail out once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = new Array(b.length + 1);
  let prevPrev: number[] = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1);
    cur[0] = i;
    let best = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      // transposition: "paenr" -> "paner"
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prevPrev[j - 2] + 1);
      }
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[b.length];
}

/** How many typos to forgive at a given word length. Short words get none. */
function typoBudget(len: number): number {
  if (len <= 4) return 0;   // "rice" vs "mice" must not match
  if (len <= 7) return 1;
  return 2;
}

/**
 * Expand a query into the terms worth matching: itself, plus any aliases.
 */
function expand(query: string): string[] {
  const out = [query];
  const direct = ALIASES[query];
  if (direct) out.push(...direct);
  // also alias individual words of a multi-word query
  const words = query.split(' ');
  if (words.length > 1) {
    for (const w of words) {
      const a = ALIASES[w];
      if (a) for (const alt of a) out.push(query.replace(w, alt));
    }
  }
  return out;
}

/**
 * Score one already-normalised term against a food name.
 *
 * Returns -1 for no match. The ladder is ordered by how central the term is to
 * the food's identity: the whole name beats the first word beats a later word
 * beats a fragment.
 */
function scoreTerm(name: string, words: string[], query: string): number {
  if (name === query) return 1000;
  if (words[0] === query) return 900;
  if (name.startsWith(query + ' ')) return 850;
  if (words.includes(query)) return 700;
  if (words.some(w => w.startsWith(query))) return 500;

  // Multi-word queries: every term must appear as a word prefix somewhere.
  const terms = query.split(' ').filter(Boolean);
  if (terms.length > 1) {
    const allPresent = terms.every(t => words.some(w => w.startsWith(t)));
    if (allPresent) return 620;
  }

  // Mid-word fragments are only allowed for long queries. This is what stopped
  // "atta" matching "manhATTAn clam chowder" and "lassi" matching "lasagna
  // cLASSIco" -- both real results before the rule existed.
  if (query.length >= 6 && name.includes(query)) return 250;

  return -1;
}

/**
 * The typo pass, kept separate because it is the expensive one.
 *
 * Run over the whole table on every keystroke this cost ~70ms per query, which
 * is visible lag while typing. It is now only reached when the cheap ladder
 * above returns too few results -- which is exactly when a typo is likely.
 */
function scoreTypo(words: string[], query: string): number {
  const budget = typoBudget(query.length);
  if (budget <= 0 || query.includes(' ')) return -1;
  for (const w of words) {
    if (Math.abs(w.length - query.length) > budget) continue;
    const d = editDistance(query, w, budget);
    if (d <= budget) return 440 - d * 40;
  }
  return -1;
}

/**
 * Score a food against a query.
 *
 * Naive substring search is genuinely bad here, and the failures are subtle:
 * searching "banana" in raw SR Legacy returns banana *pudding* before the
 * fruit, and "milk" returns mashed potatoes made with milk. Both are substring
 * hits, both are wrong.
 *
 * Shorter names win ties, because in this dataset a short name means the plain
 * ingredient and a long one means a specific preparation of it.
 *
 * Returns -1 for no match.
 */
export function scoreFood(f: Food, q: string, pre?: { name: string; words: string[] }, allowTypo = true): number {
  const name = pre ? pre.name : norm(f.name);
  const query = norm(q);
  if (!query) return -1;

  const words = pre ? pre.words : name.split(' ');
  let score = -1;
  const variants = expand(query);
  for (let i = 0; i < variants.length; i++) {
    let sc = scoreTerm(name, words, variants[i]);
    if (sc < 0 && allowTypo) sc = scoreTypo(words, variants[i]);
    // An alias hit is worth slightly less than typing the real name, so a
    // direct match always outranks a synonym match.
    const adjusted = sc < 0 ? -1 : i === 0 ? sc : sc - 30;
    if (adjusted > score) score = adjusted;
  }
  if (score < 0) return -1;

  // Prefer concise names -- "Banana, raw" over "Puddings, banana, dry mix".
  score -= Math.min(120, words.length * 8);
  // Nudge the hand-written common/Indian entries up: they are the ones people
  // actually search, and cover staples SR Legacy simply lacks.
  if (f.cat === 'Common') score += 60;
  return score;
}

/** Ranked search. Empty query returns []. */
export function searchFoods(q: string, limit = 40, s?: GameState): FoodSearchResult[] {
  if (!q || !q.trim()) return [];
  const db = foods();
  const pre = NORM!;
  const out: FoodSearchResult[] = [];

  // Cheap pass: exact/prefix/word matching, no edit distance.
  for (let i = 0; i < db.length; i++) {
    const sc = scoreFood(db[i], q, pre[i], false);
    if (sc >= 0) out.push({ food: db[i], score: sc });
  }

  // Only pay for typo tolerance when the cheap pass came up thin -- which is
  // precisely when the query was probably misspelled. Keeps a well-spelled
  // search fast and still rescues "chiken".
  if (out.length < 5) {
    for (let i = 0; i < db.length; i++) {
      const sc = scoreTypo(pre[i].words, norm(q));
      if (sc >= 0 && !out.some(r => r.food.id === db[i].id)) {
        out.push({ food: db[i], score: sc - Math.min(120, pre[i].words.length * 8) + (db[i].cat === 'Common' ? 60 : 0) });
      }
    }
  }

  // The player's own foods are searched too, and ranked above the database on
  // an equal match: if someone bothered to type it in, it is what they eat.
  if (s) {
    for (const c of customFoods(s)) {
      const f = asFood(c);
      const sc = scoreFood(f, q);
      if (sc >= 0) out.push({ food: f, score: sc + 120 });
    }
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
  const f = foodById(foodId, s);
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
