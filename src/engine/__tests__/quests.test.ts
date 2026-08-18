import {
  ENGINE, defaultState, dailyQuests, dayReset, dayKey, DAILY_SLATE_SIZE,
  DAILY_POOL, WEEKLY_QUESTS, STORY_MISSIONS, DAILY_CHALLENGES, MILESTONE_MISSIONS,
  TIERED_MISSIONS, tieredVal, milestoneStats, bossUnlocked,
} from '../index';

describe('daily quest pool', () => {
  test('every id is unique', () => {
    const ids = DAILY_POOL.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('ids of the original quests are preserved, so old saves stay valid', () => {
    const frozen = ['q_w', 'q_c', 'q_s', 'q_h', 'q_z', 'q_m', 'q_w2', 'q_c2', 'q_s2', 'q_m2', 'q_f', 'q_v', 'q_h2', 'q_w3'];
    frozen.forEach(id => expect(DAILY_POOL.some(q => q.id === id)).toBe(true));
  });

  test('every content collection has unique ids', () => {
    const uniq = (xs: { id: string }[]) => expect(new Set(xs.map(x => x.id)).size).toBe(xs.length);
    uniq(WEEKLY_QUESTS);
    uniq(STORY_MISSIONS);
    uniq(DAILY_CHALLENGES);
    uniq(MILESTONE_MISSIONS);
    uniq(TIERED_MISSIONS);
  });

  test('the pool is actually large', () => {
    expect(DAILY_POOL.length).toBeGreaterThanOrEqual(100);
  });

  test('every difficulty bucket can fill a slate', () => {
    ['light', 'core', 'elite'].forEach(tier => {
      expect(DAILY_POOL.filter(q => q.tier === tier).length).toBeGreaterThanOrEqual(6);
    });
  });

  test('every quest has a positive reward', () => {
    DAILY_POOL.forEach(q => {
      expect(q.xp).toBeGreaterThan(0);
      expect(q.gold).toBeGreaterThan(0);
      expect(q.title.length).toBeGreaterThan(0);
      expect(['str', 'vig', 'vit', 'flx', 'foc']).toContain(q.stat);
    });
  });
});

describe('daily slate selection', () => {
  test('is deterministic for a given day', () => {
    const a = dailyQuests(undefined, '2026-8-18').map(q => q.id);
    const b = dailyQuests(undefined, '2026-8-18').map(q => q.id);
    expect(a).toEqual(b);
  });

  test('returns the full slate with no duplicates', () => {
    const slate = dailyQuests(undefined, '2026-8-18');
    expect(slate).toHaveLength(DAILY_SLATE_SIZE);
    expect(new Set(slate.map(q => q.id)).size).toBe(DAILY_SLATE_SIZE);
  });

  test('mixes difficulties instead of dumping six of the same', () => {
    const slate = dailyQuests(undefined, '2026-8-18');
    expect(slate.filter(q => q.tier === 'light')).toHaveLength(2);
    expect(slate.filter(q => q.tier === 'core')).toHaveLength(3);
    expect(slate.filter(q => q.tier === 'elite')).toHaveLength(1);
  });

  test('consecutive days do not repeat the same quests', () => {
    // The old sliding window overlapped by five of six. Anything close to that
    // makes the pool feel tiny no matter how many quests exist.
    const d1 = new Set(dailyQuests(undefined, '2026-8-18').map(q => q.id));
    const d2 = dailyQuests(undefined, '2026-8-19').map(q => q.id);
    const overlap = d2.filter(id => d1.has(id)).length;
    expect(overlap).toBeLessThanOrEqual(2);
  });

  test('a month of slates draws widely from the pool', () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 30; d++) dailyQuests(undefined, `2026-9-${d}`).forEach(q => seen.add(q.id));
    expect(seen.size).toBeGreaterThan(60);
  });
});

describe('day rollover', () => {
  test('clears completed quests so dailies come back tomorrow', () => {
    const s = defaultState('Hero', 'warrior');
    s.energy = 999;
    const q = dailyQuests(s)[0];
    expect(ENGINE.completeQuest(s, q.id)).toBe(true);
    expect(s.questsDone).toContain(q.id);

    // Roll the clock: pretend the save was last touched yesterday.
    s.lastDay = '2000-1-1';
    dayReset(s);

    expect(s.questsDone).toEqual([]);
    expect(s.dayDone).toBe(dayKey());
    // ...and the same quest is completable again.
    s.energy = 999;
    expect(ENGINE.completeQuest(s, q.id)).toBe(true);
  });

  test('clears the other per-day counters too', () => {
    const s = defaultState('Hero', 'warrior');
    s.workoutsToday = 4;
    s.strengthMinToday = 60;
    s.cardioMinToday = 30;
    s.meditationMinToday = 20;
    s.statsTrainedToday = { str: 1 };
    s.dailyChallengeDone = true;
    s.lastDay = '2000-1-1';
    dayReset(s);
    expect(s.workoutsToday).toBe(0);
    expect(s.strengthMinToday).toBe(0);
    expect(s.cardioMinToday).toBe(0);
    expect(s.meditationMinToday).toBe(0);
    expect(s.statsTrainedToday).toEqual({});
    expect(s.dailyChallengeDone).toBe(false);
  });

  test('a quest cannot be completed twice in the same day', () => {
    const s = defaultState('Hero', 'warrior');
    s.energy = 999;
    const q = dailyQuests(s)[0];
    expect(ENGINE.completeQuest(s, q.id)).toBe(true);
    expect(ENGINE.completeQuest(s, q.id)).toBe(false);
  });

  test('the first boss needs three quests today, not three ever', () => {
    const s = defaultState('Hero', 'warrior');
    s.energy = 999;
    dailyQuests(s).slice(0, 3).forEach(q => ENGINE.completeQuest(s, q.id));
    expect(bossUnlocked(s, { id: 'b1' } as any)).toBe(true);

    // Yesterday's three should not count toward today's unlock.
    s.dayDone = '2000-1-1';
    expect(bossUnlocked(s, { id: 'b1' } as any)).toBe(false);
  });
});

describe('expanded missions', () => {
  test('all new tiered missions report a value', () => {
    const s = defaultState('Hero', 'warrior');
    s.strengthMinToday = 20;
    s.meditationMinToday = 10;
    s.workoutsToday = 2;
    s.statsTrainedToday = { str: 1, vig: 1 };
    expect(tieredVal(s, 'tm4')).toBe(20);
    expect(tieredVal(s, 'tm5')).toBe(10);
    expect(tieredVal(s, 'tm6')).toBe(2);
    expect(tieredVal(s, 'tm7')).toBe(2);
  });

  test('every tiered mission id resolves to a real counter', () => {
    const s = defaultState('Hero', 'warrior');
    s.cardioMinToday = 1; s.stepsToday = 1; s.waterToday = 1;
    s.strengthMinToday = 1; s.meditationMinToday = 1; s.workoutsToday = 1;
    s.statsTrainedToday = { str: 1 };
    TIERED_MISSIONS.forEach(tm => expect(tieredVal(s, tm.id)).toBeGreaterThan(0));
  });

  test('every milestone stat is backed by a counter', () => {
    const s = defaultState('Hero', 'warrior');
    const stats = milestoneStats(s);
    MILESTONE_MISSIONS.forEach(m => expect(stats[m.stat]).toBeDefined());
  });

  test('every story step check runs without throwing', () => {
    const s = defaultState('Hero', 'warrior');
    STORY_MISSIONS.forEach(arc => arc.steps.forEach(st => {
      expect(typeof st.check(s)).toBe('boolean');
    }));
  });

  test('every daily challenge check runs without throwing', () => {
    const s = defaultState('Hero', 'warrior');
    DAILY_CHALLENGES.forEach(c => expect(typeof c.check(s)).toBe('boolean'));
  });
});
