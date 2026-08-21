// Offline food database, search ranking, and the meal log.
//
// The search tests are the important ones. Substring matching looked fine in
// casual use and was actually wrong in a way users would notice immediately:
// "banana" surfaced banana cream pie before the fruit. These assertions pin
// the ranking so that cannot regress silently.

import {
  foods, foodById, searchFoods, scoreFood, macrosFor,
  logMeal, removeMeal, mealsOn, dayTotals, adherence, proteinHit, calorieHit,
  macroTargets, defaultProfile, defaultState, normalize, dayKey,
  nutritionQuestMet, ENGINE,
} from '../index';
import type { GameState, Food } from '../types';

const find = (name: string): Food => {
  const f = foods().find(x => x.name === name);
  if (!f) throw new Error(`fixture food missing: ${name}`);
  return f;
};

describe('database', () => {
  test('loads several thousand foods', () => {
    expect(foods().length).toBeGreaterThan(7000);
  });

  test('every row has sane macros', () => {
    for (const f of foods()) {
      expect(typeof f.name).toBe('string');
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.kcal).toBeGreaterThanOrEqual(0);
      expect(f.kcal).toBeLessThan(1000);       // per 100g; pure fat is ~900
      expect(f.protein).toBeGreaterThanOrEqual(0);
      expect(f.carb).toBeGreaterThanOrEqual(0);
      expect(f.fat).toBeGreaterThanOrEqual(0);
    }
  });

  test('macros reconcile with stated calories for all but a known handful', () => {
    // Atwater check: protein*4 + carb*4 + fat*9 should land near the stated
    // calories. A small number of rows legitimately will not, and they are not
    // errors: alcohol carries ~7 kcal/g that none of the three macros account
    // for, and in cocoa or baking powder the carb figure includes fibre and
    // minerals the body does not burn. So this asserts the bulk is sane and
    // that the exceptions stay rare, rather than pretending they do not exist.
    let checked = 0;
    const outliers: string[] = [];
    for (const f of foods()) {
      if (f.kcal < 50) continue;
      const derived = f.protein * 4 + f.carb * 4 + f.fat * 9;
      if (derived === 0) continue;
      checked++;
      if (derived < f.kcal * 0.45 || derived > f.kcal * 1.85) outliers.push(f.name);
    }
    expect(checked).toBeGreaterThan(4000);
    expect(outliers.length / checked).toBeLessThan(0.02);
  });

  test('ids are unique and resolvable', () => {
    const all = foods();
    expect(new Set(all.map(f => f.id)).size).toBe(all.length);
    expect(foodById(all[0].id)!.name).toBe(all[0].name);
    expect(foodById(-1)).toBeNull();
  });

  test('the parsed table is cached, not rebuilt per call', () => {
    expect(foods()).toBe(foods());
  });

  test('covers Indian staples that SR Legacy alone does not have', () => {
    // This is the whole reason the supplementary table exists.
    for (const q of ['paneer', 'roti', 'dal', 'idli', 'dosa', 'rajma', 'poha', 'ghee', 'curd']) {
      expect(searchFoods(q, 5).length).toBeGreaterThan(0);
    }
  });
});

describe('search ranking', () => {
  test('the plain food beats a dessert made from it', () => {
    // The bug this guards: raw substring search put "Pie, banana cream" first.
    const top = searchFoods('banana', 5)[0].food.name;
    expect(top.toLowerCase()).toBe('banana');
  });

  test('a milk search returns milk, not food cooked with milk', () => {
    const top = searchFoods('milk', 3).map(r => r.food.name.toLowerCase());
    expect(top.some(n => n.startsWith('milk'))).toBe(true);
    expect(top.some(n => n.includes('potato'))).toBe(false);
  });

  test('exact name outranks a word match outranks a fragment', () => {
    const f = find('Banana');
    const exact = scoreFood(f, 'Banana');
    const frag = scoreFood(f, 'anan');
    expect(exact).toBeGreaterThan(frag);
  });

  test('shorter names win ties', () => {
    const results = searchFoods('almonds', 5);
    expect(results[0].food.name.length).toBeLessThanOrEqual(results[1].food.name.length + 2);
  });

  test('multi-word queries require every term', () => {
    const r = searchFoods('chicken breast', 5);
    expect(r.length).toBeGreaterThan(0);
    for (const x of r.slice(0, 3)) {
      const n = x.food.name.toLowerCase();
      expect(n.includes('chicken')).toBe(true);
    }
  });

  test('nonsense returns nothing rather than everything', () => {
    expect(searchFoods('zzzzqqqxx')).toEqual([]);
  });

  test('empty and whitespace queries return nothing', () => {
    expect(searchFoods('')).toEqual([]);
    expect(searchFoods('   ')).toEqual([]);
  });

  test('search is case and punctuation insensitive', () => {
    const a = searchFoods('PANEER', 1)[0].food.id;
    const b = searchFoods('paneer!!', 1)[0].food.id;
    expect(a).toBe(b);
  });

  test('respects the result limit', () => {
    expect(searchFoods('a', 7).length).toBeLessThanOrEqual(7);
  });

  test('results come back in descending score order', () => {
    const scores = searchFoods('rice', 20).map(r => r.score);
    expect([...scores].sort((x, y) => y - x)).toEqual(scores);
  });
});

describe('macrosFor', () => {
  test('scales linearly from the per-100g figures', () => {
    const f = find('Banana'); // 89 kcal/100g
    expect(macrosFor(f, 100).kcal).toBe(89);
    expect(macrosFor(f, 200).kcal).toBe(178);
    expect(macrosFor(f, 50).kcal).toBe(45); // rounded
  });

  test('zero grams yields zero', () => {
    expect(macrosFor(find('Banana'), 0)).toEqual({ kcal: 0, protein: 0, carb: 0, fat: 0 });
  });
});

describe('meal log', () => {
  let s: GameState;
  let banana: Food;
  beforeEach(() => {
    s = defaultState('Test', 'warrior');
    s.body = defaultProfile();
    banana = find('Banana');
  });

  test('logs a meal with the macros captured at log time', () => {
    const e = logMeal(s, banana.id, 120)!;
    expect(e.name).toBe('Banana');
    expect(e.grams).toBe(120);
    expect(e.kcal).toBe(Math.round(89 * 1.2));
    expect(mealsOn(s)).toHaveLength(1);
  });

  test('rejects unknown foods and impossible portions', () => {
    expect(logMeal(s, 999999, 100)).toBeNull();
    expect(logMeal(s, banana.id, 0)).toBeNull();
    expect(logMeal(s, banana.id, -50)).toBeNull();
    expect(logMeal(s, banana.id, 99999)).toBeNull();
    expect(s.meals).toHaveLength(0);
  });

  test('entries get unique ids and can be removed individually', () => {
    const a = logMeal(s, banana.id, 100)!;
    const b = logMeal(s, banana.id, 100)!;
    expect(a.id).not.toBe(b.id);
    removeMeal(s, a.id);
    expect(mealsOn(s)).toHaveLength(1);
    expect(mealsOn(s)[0].id).toBe(b.id);
  });

  test('day totals sum only that day', () => {
    logMeal(s, banana.id, 100, '2026-01-01');
    logMeal(s, banana.id, 100, '2026-01-01');
    logMeal(s, banana.id, 100, '2026-01-02');
    expect(dayTotals(s, '2026-01-01').kcal).toBe(178);
    expect(dayTotals(s, '2026-01-02').kcal).toBe(89);
    expect(dayTotals(s, '2026-06-06').kcal).toBe(0);
  });

  test('history stays bounded', () => {
    for (let i = 0; i < 2100; i++) logMeal(s, banana.id, 10);
    expect(s.meals.length).toBeLessThanOrEqual(2000);
  });
});

describe('adherence and targets', () => {
  let s: GameState;
  beforeEach(() => {
    s = defaultState('Test', 'warrior');
    s.body = { ...defaultProfile(), weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'moderate', goal: 'recomp' };
  });

  test('null targets give null adherence rather than a divide by zero', () => {
    expect(adherence(s, null)).toBeNull();
    expect(proteinHit(s, null)).toBe(false);
    expect(calorieHit(s, null)).toBe(false);
  });

  test('an empty day is 0% adhered', () => {
    const t = macroTargets(s.body)!;
    expect(adherence(s, t)!.kcal).toBe(0);
    expect(proteinHit(s, t)).toBe(false);
  });

  test('protein counts as hit at 95% of target', () => {
    const t = macroTargets(s.body)!;
    const whey = find('Whey protein powder'); // 78g protein / 100g
    // Just under the 95% line, then over it.
    const gramsFor = (p: number) => Math.ceil((p / 78) * 100);
    logMeal(s, whey.id, gramsFor(t.protein * 0.8));
    expect(proteinHit(s, t)).toBe(false);
    logMeal(s, whey.id, gramsFor(t.protein * 0.2));
    expect(proteinHit(s, t)).toBe(true);
  });

  test('calories are a band, so both undereating and overeating miss', () => {
    const t = macroTargets(s.body)!;
    const rice = find('Rice, white, cooked'); // 130 kcal/100g
    const gramsFor = (k: number) => Math.round((k / 130) * 100);

    logMeal(s, rice.id, gramsFor(t.kcal * 0.5));
    expect(calorieHit(s, t)).toBe(false);            // way under

    logMeal(s, rice.id, gramsFor(t.kcal * 0.5));
    expect(calorieHit(s, t)).toBe(true);             // on target

    logMeal(s, rice.id, gramsFor(t.kcal * 0.5));
    expect(calorieHit(s, t)).toBe(false);            // way over
  });
});

describe('save compatibility', () => {
  test('a save with no meals array normalizes to an empty log', () => {
    const s = defaultState('Old', 'warrior');
    delete (s as Partial<GameState>).meals;
    expect(normalize(s).meals).toEqual([]);
  });

  test('corrupt meal rows are dropped, valid ones kept', () => {
    const s = defaultState('Bad', 'warrior');
    s.meals = [
      { id: 'a', date: dayKey(), foodId: 1, name: 'ok', grams: 100, kcal: 100, protein: 1, carb: 1, fat: 1 },
      null,
      { id: 'b', date: dayKey(), kcal: NaN },
    ] as never;
    const n = normalize(s);
    expect(n.meals).toHaveLength(1);
    expect(n.meals[0].id).toBe('a');
  });
});

describe('nutrition quests are earned, not tapped', () => {
  const feed = (s: GameState, kcalWanted: number) => {
    const rice = foods().find(f => f.name === 'Rice, white, cooked')!;
    logMeal(s, rice.id, Math.round((kcalWanted / rice.kcal) * 100));
  };

  let s: GameState;
  beforeEach(() => {
    s = defaultState('Q', 'warrior');
    s.body = { ...defaultProfile(), weightKg: 80, heightCm: 180, age: 30, sex: 'male', activity: 'moderate', goal: 'recomp' };
    s.energy = 100;
  });

  test('non-nutrition quests are unaffected', () => {
    expect(nutritionQuestMet(s, 'q_st01', null)).toBeNull();
    expect(nutritionQuestMet(s, 'q_nu04', null)).toBeNull(); // cook from scratch: unprovable
  });

  test('the calorie quest cannot be claimed on an empty stomach', () => {
    const t = macroTargets(s.body);
    expect(nutritionQuestMet(s, 'q_nu08', t)).toBe(false);
    expect(ENGINE.completeQuest(s, 'q_nu08')).toBe(false);
    expect(s.questsDone).not.toContain('q_nu08');
  });

  test('eating to target unlocks it', () => {
    const t = macroTargets(s.body)!;
    feed(s, t.kcal);
    expect(nutritionQuestMet(s, 'q_nu08', t)).toBe(true);
    expect(ENGINE.completeQuest(s, 'q_nu08')).toBe(true);
    expect(s.questsDone).toContain('q_nu08');
  });

  test('logging any meal satisfies Fuel Day', () => {
    expect(nutritionQuestMet(s, 'q_v', null)).toBe(false);
    feed(s, 200);
    expect(nutritionQuestMet(s, 'q_v', null)).toBe(true);
  });

  test('without a body profile the target-based quests stay locked, not crashed', () => {
    s.body = null;
    expect(nutritionQuestMet(s, 'q_nu01', null)).toBe(false);
    expect(() => ENGINE.completeQuest(s, 'q_nu01')).not.toThrow();
  });
});
