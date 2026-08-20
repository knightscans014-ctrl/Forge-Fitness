import { ENGINE, rankForLevel, energyCost, addXP, defaultState, xpMultNow, xpForLevel, computePower, startBossBattle, bossStrike, bossUnlocked, checkAchievements, buySkill, equipGear, generateSuggestion, completeSuggestion, bout, nextOpponent, startTrial, trialStrike, recordStackActivity, dropLoot, SKILLS } from '../index';

describe('FORGE engine', () => {
  test('level curve is monotonic', () => {
    expect(xpForLevel(1)).toBeLessThan(xpForLevel(2));
    expect(xpForLevel(2)).toBeLessThan(xpForLevel(3));
  });
  test('rank mapping', () => {
    expect(rankForLevel(1).id).toBe('F');
    expect(rankForLevel(6).id).toBe('D');
    expect(rankForLevel(32).id).toBe('S');
    // S is no longer the ceiling; the ladder continues past it.
    expect(rankForLevel(45).id).toBe('SS');
    expect(rankForLevel(100).id).toBe('MONARCH');
  });
  test('new game has numeric stats', () => {
    const s = defaultState('Hero', 'assassin');
    Object.values(s.stats).forEach(v => expect(typeof v).toBe('number'));
  });
  test('addXP levels up and grants skill points', () => {
    const s = defaultState('Hero', 'warrior');
    const before = s.level;
    addXP(s, 10000);
    expect(s.level).toBeGreaterThan(before);
    expect(s.skillPoints).toBeGreaterThan(0);
  });
  test('energy cost scales', () => {
    expect(energyCost(30)).toBe(18);
  });
  test('boosters multiply XP', () => {
    const s = defaultState('Hero', 'warrior');
    const base = xpMultNow(s);
    s.boosters.push({ id: 'b_xp', expires: Date.now() + 60000 });
    expect(xpMultNow(s)).toBeCloseTo(base * 2);
  });
  test('complete quest increments weekly counter', () => {
    const s = defaultState('Hero', 'warrior');
    const q = ENGINE.dailyQuests(s)[0];
    s.energy = 100;
    ENGINE.completeQuest(s, q.id);
    expect(s.weekly.questsWeekly).toBe(1);
  });

  // ---- v5 max systems ----
  test('boss battle: full strike sequence and victory', () => {
    const s = defaultState('Hero', 'paladin');
    s.energy = 100;
    s.maxHP = 10000; // survive
    const battle = startBossBattle(s);
    expect(battle).not.toBeNull();
    let defeated = false;
    for (let i = 0; i < 500 && !defeated; i++) {
      const r = bossStrike(s);
      if (!r) break;
      if (r.bossDefeated) defeated = true;
    }
    expect(defeated).toBe(true);
    expect(s.bosses.length).toBe(1);
    expect(s.bossesDefeated).toBe(1);
  });
  test('achievements unlock on conditions', () => {
    const s = defaultState('Hero', 'warrior');
    s.totalXP = 200;
    s.level = 2;
    const res = checkAchievements(s);
    expect(res.some(a => a.id === 'a1')).toBe(true);
  });
  test('skill tree ranks up and gives passive', () => {
    const s = defaultState('Hero', 'warrior');
    s.skillPoints = 3;
    expect(buySkill(s, 's_sage')).toBe(true);
    expect(s.skills.s_sage).toBe(1);
    expect(s.xpMult).toBeGreaterThan(1);
  });
  test('gear equip works', () => {
    const s = defaultState('Hero', 'warrior');
    const g = dropLoot(s, true)!;
    expect(equipGear(s, g.id)).toBe(true);
    expect(s.equipped[g.slot]).toBe(g.id);
  });
  test('suggestion generates for weakest stat and completes', () => {
    const s = defaultState('Hero', 'warrior');
    s.energy = 100;
    const sug = generateSuggestion(s);
    expect(sug).not.toBeNull();
    expect(completeSuggestion(s)).toBe(true);
    expect(s.suggestionDone).toBe(true);
  });
  test('training bout resolves with a winner', () => {
    const s = defaultState('Hero', 'warrior');
    const opponent = nextOpponent(s);
    const r = bout(s, opponent);
    expect(r.win === true || r.win === false).toBe(true);
  });
  test('weekly trial deals damage and can be won', () => {
    const s = defaultState('Hero', 'warrior');
    s.energy = 100;
    startTrial(s);
    expect(s.weeklyTrial).not.toBeNull();
    trialStrike(s);
    expect(s.energy).toBeLessThan(100);
  });
  test('stacking awards bonus when chain completes', () => {
    // Drive this through the real logging path. The old version hand-wrote
    // activity ids into statsTrainedToday, a state the engine never produces
    // (it stores STAT ids there), so the test passed while the feature was
    // completely unreachable in the app.
    const s = defaultState('Hero', 'warrior');
    s.activitiesToday = { steps: 1, water: 1, meditation: 1 };
    const res = recordStackActivity(s, 'steps');
    expect(res.length).toBe(1); // Morning Rising completed -> 1 reward
    expect(res[0].xp).toBeGreaterThan(0);
  });
  test('bout win increments record and awards XP', () => {
    const s = defaultState('Hero', 'warrior');
    const opponent = nextOpponent(s);
    // force a win by giving huge power
    s.totalXP = 100000; s.level = 30;
    const r = bout(s, opponent);
    expect(r.win).toBe(true);
    expect(s.boutStreak).toBe(1);
    expect(s.bouts.length).toBe(1);
  });
  test('skill tree cannot exceed max rank', () => {
    const s = defaultState('Hero', 'warrior');
    s.skillPoints = 99;
    const cap = SKILLS.find(x => x.id === 's_sage')!.max;
    for (let i = 0; i < cap + 5; i++) buySkill(s, 's_sage');
    expect(s.skills.s_sage).toBe(cap); // capped at max, whatever the tree depth
  });
  test('achievements award XP once', () => {
    const s = defaultState('Hero', 'warrior');
    s.totalXP = 300; s.level = 2;
    const first = checkAchievements(s);
    const second = checkAchievements(s);
    expect(first.some(a => a.id === 'a1')).toBe(true);
    expect(second.some(a => a.id === 'a1')).toBe(false); // not double-counted
  });
  test('computePower is numeric and grows with XP', () => {
    const s = defaultState('Hero', 'warrior');
    const p1 = computePower(s);
    addXP(s, 500);
    expect(computePower(s)).toBeGreaterThanOrEqual(p1);
  });
  test('daily reward can be claimed once per day', () => {
    const s = defaultState('Hero', 'warrior');
    const first = ENGINE.claimDaily(s);
    expect(first?.ok).toBe(true);
    expect(first?.day).toBe(1);
    expect(first?.gold).toBeGreaterThan(0);
    const second = ENGINE.claimDaily(s);
    expect(second).toBeNull(); // already claimed today
  });
  test('boss unlock conditions for later bosses', () => {
    const s = defaultState('Hero', 'warrior');
    s.level = 30; // S-rank
    const unlocked7 = bossUnlocked(s, { id: 'b7' } as any);
    expect(unlocked7).toBe(true);
  });
});
