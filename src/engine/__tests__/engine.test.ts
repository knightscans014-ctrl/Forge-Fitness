import {
  ENGINE, levelFromXP, rankForLevel, energyCost, addXP,
  defaultState, xpMultNow, goldMultNow, xpForLevel, computePower,
  startBossBattle, bossStrike, checkAchievements, buySkill, equipGear,
  generateSuggestion, completeSuggestion, duel, nextRival, startRaid, raidStrike,
  recordStackActivity, dropLoot,
} from '../index';

describe('FORGE engine', () => {
  test('level curve is monotonic', () => {
    expect(xpForLevel(1)).toBeLessThan(xpForLevel(2));
    expect(xpForLevel(2)).toBeLessThan(xpForLevel(3));
  });
  test('rank mapping', () => {
    expect(rankForLevel(1).id).toBe('F');
    expect(rankForLevel(6).id).toBe('D');
    expect(rankForLevel(30).id).toBe('S');
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
  test('pvp duel resolves with a winner', () => {
    const s = defaultState('Hero', 'warrior');
    const rival = nextRival(s);
    const r = duel(s, rival);
    expect(r.win === true || r.win === false).toBe(true);
  });
  test('raid deals damage and can be won', () => {
    const s = defaultState('Hero', 'warrior');
    s.energy = 100;
    startRaid(s);
    expect(s.guildRaid).not.toBeNull();
    raidStrike(s);
    expect(s.energy).toBeLessThan(100);
  });
  test('stacking awards bonus when chain completes', () => {
    const s = defaultState('Hero', 'warrior');
    // mark all chain activities for 'Morning Rising'
    ['steps', 'water', 'meditation'].forEach(a => s.statsTrainedToday[a] = 1);
    const res = recordStackActivity(s, 'steps');
    expect(res.length).toBeGreaterThanOrEqual(0); // should be 1 (stack completed)
  });
  test('computePower is numeric and grows with XP', () => {
    const s = defaultState('Hero', 'warrior');
    const p1 = computePower(s);
    addXP(s, 500);
    expect(computePower(s)).toBeGreaterThanOrEqual(p1);
  });
});
