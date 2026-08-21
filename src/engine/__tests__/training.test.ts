// Exercise library, set logging, and the overload detection that turns
// q_st14 from an honour-system tick into a verified claim.

import {
  EXERCISES, TEMPLATES, exerciseById, searchExercises, recentExercises,
  e1rm, setVolume, logSet, removeSet, setsOn, setsFor,
  personalBest, allPersonalBests, overloadToday, volumeOn, volumeFor,
  trainingQuestMet, defaultState, normalize, dayKey, ENGINE, DAILY_POOL,
} from '../index';
import type { GameState } from '../types';

describe('exercise library', () => {
  test('has enough movements to build real sessions', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(40);
  });

  test('ids are unique', () => {
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
  });

  test('every exercise is fully described', () => {
    for (const e of EXERCISES) {
      expect(e.name.length).toBeGreaterThan(2);
      expect(e.cue.length).toBeGreaterThan(10);
      expect(e.muscles.length).toBeGreaterThan(0);
      expect(['str', 'vig', 'vit', 'flx', 'foc']).toContain(e.stat);
    }
  });

  test('names are plain, not flavour', () => {
    // The user asked for movements to say what they actually are. A name with
    // no letters in common with gym vocabulary is a smell; this is a cheap
    // proxy -- no name should contain the RPG words used elsewhere.
    const flavour = /shadow|monarch|abyss|sovereign|awaken|rank|dungeon/i;
    for (const e of EXERCISES) expect(e.name).not.toMatch(flavour);
  });

  test('bodyweight movements are marked as such and vice versa', () => {
    for (const e of EXERCISES) {
      if (e.equipment === 'bodyweight') expect(e.bodyweight).toBe(true);
      if (!e.bodyweight) expect(e.equipment).not.toBe('bodyweight');
    }
  });

  test('exerciseById resolves and rejects', () => {
    expect(exerciseById('x_squat')!.name).toBe('Barbell Back Squat');
    expect(exerciseById('nope')).toBeNull();
  });
});

describe('workout templates', () => {
  test('every template references exercises that exist', () => {
    for (const t of TEMPLATES) {
      for (const d of t.days) {
        expect(d.exerciseIds.length).toBeGreaterThan(2);
        for (const id of d.exerciseIds) {
          expect(exerciseById(id)).not.toBeNull();
        }
      }
    }
  });

  test('the bodyweight template needs no equipment at all', () => {
    // The whole promise of this template. A dumbbell here makes it a lie.
    const bw = TEMPLATES.find(t => t.id === 't_bw')!;
    for (const d of bw.days) {
      for (const id of d.exerciseIds) {
        expect(exerciseById(id)!.equipment).toBe('bodyweight');
      }
    }
  });

  test('the four promised templates are present', () => {
    const ids = TEMPLATES.map(t => t.id);
    expect(ids).toEqual(expect.arrayContaining(['t_ppl', 't_ul', 't_full', 't_bw']));
  });
});

describe('search', () => {
  test('finds by name, muscle and equipment', () => {
    expect(searchExercises('squat').some(e => e.id === 'x_squat')).toBe(true);
    expect(searchExercises('chest').length).toBeGreaterThan(3);
    expect(searchExercises('barbell').every(e =>
      e.equipment === 'barbell' || e.name.toLowerCase().includes('barbell'))).toBe(true);
  });

  test('compounds sort above isolation', () => {
    const r = searchExercises('legs');
    const firstIso = r.findIndex(e => !e.compound);
    const lastComp = r.map(e => e.compound).lastIndexOf(true);
    if (firstIso !== -1) expect(firstIso).toBeGreaterThan(lastComp - 1);
  });

  test('an empty query lists the library rather than nothing', () => {
    expect(searchExercises('').length).toBeGreaterThan(10);
  });
});

describe('e1rm', () => {
  test('a single equals the weight', () => {
    expect(e1rm(100, 1)).toBe(100);
  });

  test('more reps at the same weight estimates higher', () => {
    expect(e1rm(100, 5)).toBeGreaterThan(e1rm(100, 3));
  });

  test('nonsense in, zero out', () => {
    expect(e1rm(0, 5)).toBe(0);
    expect(e1rm(100, 0)).toBe(0);
    expect(e1rm(-50, 5)).toBe(0);
  });
});

describe('set logging', () => {
  let s: GameState;
  beforeEach(() => { s = defaultState('T', 'warrior'); });

  test('logs a set', () => {
    const e = logSet(s, 'x_squat', 100, 5)!;
    expect(e.name).toBe('Barbell Back Squat');
    expect(e.weight).toBe(100);
    expect(e.reps).toBe(5);
    expect(setsOn(s)).toHaveLength(1);
  });

  test('rejects unknown exercises and impossible numbers', () => {
    expect(logSet(s, 'nope', 100, 5)).toBeNull();
    expect(logSet(s, 'x_squat', 100, 0)).toBeNull();
    expect(logSet(s, 'x_squat', -10, 5)).toBeNull();
    expect(logSet(s, 'x_squat', 9999, 5)).toBeNull();
    expect(logSet(s, 'x_squat', 100, 9999)).toBeNull();
    expect(s.sets).toHaveLength(0);
  });

  test('a loaded lift at zero kg is a mis-tap, not a set', () => {
    expect(logSet(s, 'x_bench', 0, 8)).toBeNull();
  });

  test('but bodyweight movements log fine at zero', () => {
    expect(logSet(s, 'x_pushup', 0, 20)).not.toBeNull();
    expect(logSet(s, 'x_pullup', 10, 5)).not.toBeNull(); // weighted is still allowed
  });

  test('sets can be removed individually', () => {
    const a = logSet(s, 'x_squat', 100, 5)!;
    logSet(s, 'x_squat', 100, 5);
    removeSet(s, a.id);
    expect(setsOn(s)).toHaveLength(1);
  });

  test('history stays bounded', () => {
    for (let i = 0; i < 4200; i++) logSet(s, 'x_squat', 60, 5);
    expect(s.sets.length).toBeLessThanOrEqual(4000);
  });

  test('volume multiplies load by reps, and bodyweight contributes none', () => {
    expect(setVolume({ id: '1', date: 'd', exerciseId: 'x_squat', name: '', weight: 100, reps: 5 })).toBe(500);
    expect(setVolume({ id: '2', date: 'd', exerciseId: 'x_pushup', name: '', weight: 0, reps: 30 })).toBe(0);
  });

  test('day volume sums only that day', () => {
    logSet(s, 'x_squat', 100, 5, '2026-03-01');
    logSet(s, 'x_squat', 100, 5, '2026-03-01');
    logSet(s, 'x_squat', 100, 5, '2026-03-02');
    expect(volumeOn(s, '2026-03-01')).toBe(1000);
    expect(volumeOn(s, '2026-03-02')).toBe(500);
    expect(volumeFor(s, 'x_squat')).toBe(1500);
  });

  test('setsFor isolates one exercise', () => {
    logSet(s, 'x_squat', 100, 5);
    logSet(s, 'x_bench', 80, 5);
    expect(setsFor(s, 'x_squat')).toHaveLength(1);
  });

  test('recent exercises come back most-recent-first, no duplicates', () => {
    logSet(s, 'x_squat', 100, 5);
    logSet(s, 'x_bench', 80, 5);
    logSet(s, 'x_squat', 105, 5);
    const r = recentExercises(s);
    expect(r[0].id).toBe('x_squat');
    expect(r.map(e => e.id)).toEqual(['x_squat', 'x_bench']);
  });
});

describe('personal bests', () => {
  let s: GameState;
  beforeEach(() => { s = defaultState('T', 'warrior'); });

  test('none without history', () => {
    expect(personalBest(s, 'x_squat')).toBeNull();
  });

  test('picks the highest estimated 1RM, not the heaviest single set', () => {
    logSet(s, 'x_squat', 100, 5, '2026-01-01');   // e1rm ~116.7
    logSet(s, 'x_squat', 110, 1, '2026-01-02');   // e1rm 110
    expect(personalBest(s, 'x_squat')!.weight).toBe(100);
  });

  test('bodyweight bests are measured in reps', () => {
    logSet(s, 'x_pushup', 0, 20, '2026-01-01');
    logSet(s, 'x_pushup', 0, 35, '2026-01-02');
    expect(personalBest(s, 'x_pushup')!.reps).toBe(35);
  });

  test("today's sets are excluded by default so a session cannot beat itself", () => {
    logSet(s, 'x_squat', 200, 5); // today
    expect(personalBest(s, 'x_squat')).toBeNull();
    expect(personalBest(s, 'x_squat', { includeToday: true })!.weight).toBe(200);
  });

  test('allPersonalBests covers every logged exercise', () => {
    logSet(s, 'x_squat', 100, 5);
    logSet(s, 'x_bench', 80, 5);
    expect(allPersonalBests(s)).toHaveLength(2);
  });
});

describe('progressive overload', () => {
  let s: GameState;
  beforeEach(() => { s = defaultState('T', 'warrior'); });

  test('a first-ever set is not overload', () => {
    logSet(s, 'x_squat', 100, 5);
    expect(overloadToday(s)).toHaveLength(0);
  });

  test('same weight, more reps counts', () => {
    logSet(s, 'x_squat', 100, 5, '2026-01-01');
    logSet(s, 'x_squat', 100, 6);
    const hits = overloadToday(s);
    expect(hits).toHaveLength(1);
    expect(hits[0].how).toContain('6 reps');
  });

  test('more weight, same reps counts', () => {
    logSet(s, 'x_squat', 100, 5, '2026-01-01');
    logSet(s, 'x_squat', 102.5, 5);
    expect(overloadToday(s)).toHaveLength(1);
  });

  test('fewer reps at much heavier weight counts via estimated 1RM', () => {
    logSet(s, 'x_squat', 100, 5, '2026-01-01');  // ~116.7
    logSet(s, 'x_squat', 120, 3);                 // 132
    expect(overloadToday(s)).toHaveLength(1);
  });

  test('a lighter, easier set is not overload', () => {
    logSet(s, 'x_squat', 100, 5, '2026-01-01');
    logSet(s, 'x_squat', 80, 5);
    expect(overloadToday(s)).toHaveLength(0);
  });

  test('matching yesterday exactly is not overload', () => {
    logSet(s, 'x_squat', 100, 5, '2026-01-01');
    logSet(s, 'x_squat', 100, 5);
    expect(overloadToday(s)).toHaveLength(0);
  });

  test('bodyweight overload is more reps', () => {
    logSet(s, 'x_pullup', 0, 8, '2026-01-01');
    logSet(s, 'x_pullup', 0, 9);
    expect(overloadToday(s)).toHaveLength(1);
  });

  test('each exercise is reported at most once', () => {
    logSet(s, 'x_squat', 100, 5, '2026-01-01');
    logSet(s, 'x_squat', 110, 5);
    logSet(s, 'x_squat', 115, 5);
    expect(overloadToday(s)).toHaveLength(1);
  });

  test('several exercises can all be beaten in one session', () => {
    logSet(s, 'x_squat', 100, 5, '2026-01-01');
    logSet(s, 'x_bench', 80, 5, '2026-01-01');
    logSet(s, 'x_squat', 105, 5);
    logSet(s, 'x_bench', 82.5, 5);
    expect(overloadToday(s)).toHaveLength(2);
  });
});

describe('q_st14 is earned, not tapped', () => {
  let s: GameState;
  beforeEach(() => {
    s = defaultState('T', 'warrior');
    s.energy = 100;
  });

  test('the quest still exists in the pool', () => {
    expect(DAILY_POOL.find(q => q.id === 'q_st14')).toBeTruthy();
  });

  test('other quests are unaffected by the training gate', () => {
    expect(trainingQuestMet(s, 'q_st01')).toBeNull();
    expect(trainingQuestMet(s, 'q_nu01')).toBeNull();
  });

  test('cannot be claimed without beating anything', () => {
    logSet(s, 'x_squat', 100, 5);
    expect(trainingQuestMet(s, 'q_st14')).toBe(false);
    expect(ENGINE.completeQuest(s, 'q_st14')).toBe(false);
    expect(s.questsDone).not.toContain('q_st14');
  });

  test('beating a past lift unlocks it', () => {
    logSet(s, 'x_squat', 100, 5, '2026-01-01');
    logSet(s, 'x_squat', 105, 5);
    expect(trainingQuestMet(s, 'q_st14')).toBe(true);
    expect(ENGINE.completeQuest(s, 'q_st14')).toBe(true);
    expect(s.questsDone).toContain('q_st14');
  });
});

describe('save compatibility', () => {
  test('a save with no sets array normalizes to an empty log', () => {
    const s = defaultState('Old', 'warrior');
    delete (s as Partial<GameState>).sets;
    expect(normalize(s).sets).toEqual([]);
  });

  test('corrupt set rows are dropped, valid ones kept', () => {
    const s = defaultState('Bad', 'warrior');
    s.sets = [
      { id: 'a', date: dayKey(), exerciseId: 'x_squat', name: 'Squat', weight: 100, reps: 5 },
      null,
      { id: 'b', date: dayKey(), exerciseId: 'x_squat', name: 'Squat', weight: NaN, reps: 5 },
      { id: 'c', date: dayKey(), exerciseId: 'x_squat', name: 'Squat', weight: 100, reps: 0 },
    ] as never;
    const n = normalize(s);
    expect(n.sets).toHaveLength(1);
    expect(n.sets[0].id).toBe('a');
  });
});
