/**
 * Search quality, as a regression suite.
 *
 * These started as throwaway probes that measured how the search actually
 * behaved on realistic Indian queries. 24 of 71 returned nothing and several
 * returned nonsense. Both classes of failure are cheap to reintroduce and
 * invisible in a typecheck, so the probes are now tests.
 */
import { searchFoods, addCustomFood, removeCustomFood, foodById, logMeal, mealsOn, CUSTOM_ID_BASE, defaultState } from '../index';

const top = (q: string) => searchFoods(q, 5).map(r => r.food.name);
const first = (q: string) => (searchFoods(q, 1)[0] || { food: { name: '' } }).food.name;

describe('the common case still ranks correctly', () => {
  it('puts the plain ingredient above preparations of it', () => {
    expect(first('banana')).toBe('Banana');
    expect(first('chicken breast').toLowerCase()).toContain('chicken breast');
    expect(top('milk')[0].toLowerCase()).toContain('milk');
  });
});

describe('regional and phonetic spellings resolve', () => {
  const cases: [string, string][] = [
    ['idly', 'idli'], ['chapathi', 'chapati'], ['brinjal', 'brinjal'],
    ['capsicum', 'capsicum'], ['methi', 'methi'], ['atta', 'wheat'],
    ['maida', 'maida'], ['besan', 'besan'], ['sooji', 'semolina'],
    ['ladoo', 'laddu'], ['lady finger', 'okra'], ['sabudana', 'sabudana'],
  ];
  it.each(cases)('%s finds %s', (query, expected) => {
    const names = top(query).join(' | ').toLowerCase();
    expect(names).toContain(expected);
  });
});

describe('typos are forgiven', () => {
  const cases: [string, string][] = [
    ['chiken', 'chicken'], ['panner', 'paneer'], ['banna', 'banana'],
  ];
  it.each(cases)('%s finds %s', (query, expected) => {
    expect(top(query).join(' | ').toLowerCase()).toContain(expected);
  });

  it('does not forgive typos on short words, where a near miss is a different food', () => {
    // "rice" and "mice"/"ice" are one edit apart; matching them would be worse
    // than returning nothing.
    const names = top('rice').join(' | ').toLowerCase();
    expect(names).toContain('rice');
  });
});

describe('mid-word fragments do not produce nonsense', () => {
  // Every one of these was a real result before the substring rule was tightened.
  it('atta does not match manhattan clam chowder', () => {
    expect(top('atta').join(' ').toLowerCase()).not.toContain('chowder');
  });
  it('lassi does not match lasagna', () => {
    expect(top('lassi').join(' ').toLowerCase()).not.toContain('lasagna');
  });
  it('chole ranks the curry above no-cholesterol mayonnaise', () => {
    expect(first('chole').toLowerCase()).not.toContain('mayonnaise');
  });
});

describe('indian staples are actually present', () => {
  const dishes = [
    'paneer', 'idli', 'dosa', 'rajma', 'dal', 'samosa', 'biryani', 'roti',
    'curd', 'poha', 'upma', 'khichdi', 'dhokla', 'misal', 'pongal', 'thepla',
    'bhel', 'momos', 'tandoori chicken', 'keema', 'omelette', 'masala chai',
    'filter coffee', 'sev', 'ghee',
  ];
  it.each(dishes)('%s returns something', d => {
    expect(searchFoods(d, 3).length).toBeGreaterThan(0);
  });
});

describe('custom foods', () => {
  const mk = () => defaultState('Test', 'warrior');

  it('are searchable and rank above the database', () => {
    const s = mk();
    addCustomFood(s, { name: 'Amma dal', kcal: 120, protein: 8, carb: 15, fat: 2 });
    expect(searchFoods('amma dal', 5, s)[0].food.name).toBe('Amma dal');
  });

  it('get ids that cannot collide with database rows', () => {
    const s = mk();
    const c = addCustomFood(s, { name: 'Protein shake', kcal: 380, protein: 75, carb: 8, fat: 4 });
    expect(c!.id).toBeGreaterThanOrEqual(CUSTOM_ID_BASE);
    expect(foodById(c!.id, s)!.name).toBe('Protein shake');
    // and the database is unaffected
    expect(foodById(0)!.id).toBe(0);
  });

  it('can be logged like any other food', () => {
    const s = mk();
    const c = addCustomFood(s, { name: 'Mess sambar', kcal: 60, protein: 3, carb: 8, fat: 2 });
    logMeal(s, c!.id, 200);
    const meals = mealsOn(s);
    expect(meals).toHaveLength(1);
    expect(meals[0].kcal).toBe(120);
    expect(meals[0].name).toBe('Mess sambar');
  });

  it('rejects nonsense instead of storing it', () => {
    const s = mk();
    expect(addCustomFood(s, { name: '', kcal: 100, protein: 1, carb: 1, fat: 1 })).toBeNull();
    expect(addCustomFood(s, { name: 'X', kcal: NaN, protein: 1, carb: 1, fat: 1 })).toBeNull();
    expect(addCustomFood(s, { name: 'X', kcal: -5, protein: 1, carb: 1, fat: 1 })).toBeNull();
    expect(addCustomFood(s, { name: 'X', kcal: 5000, protein: 1, carb: 1, fat: 1 })).toBeNull();
    expect(s.customFoods).toHaveLength(0);
  });

  it('deleting one leaves already-logged meals intact', () => {
    const s = mk();
    const c = addCustomFood(s, { name: 'Hostel rice', kcal: 130, protein: 2, carb: 28, fat: 0 });
    logMeal(s, c!.id, 100);
    removeCustomFood(s, c!.id);
    expect(s.customFoods).toHaveLength(0);
    // the meal snapshotted its macros, so history does not rewrite itself
    expect(mealsOn(s)[0].kcal).toBe(130);
  });
});
