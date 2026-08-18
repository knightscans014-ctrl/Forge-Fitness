// Level curve, rank ladder, and the levelCurveV2 migration.

import { xpForLevel, levelFromXP, rankForLevel, nextRank, RANKS, MAX_LEVEL, computePower } from '../levels';
import { normalize, defaultState } from '../index';
import { GameState } from '../types';

describe('level curve', () => {
  test('is strictly increasing', () => {
    for (let l = 1; l < 300; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
  });

  test('cost per level accelerates', () => {
    // The old curve's step grew by only ~2 XP per level, so flat daily income
    // outran it forever. Each level must cost meaningfully more than the last.
    const step = (l: number) => xpForLevel(l + 1) - xpForLevel(l);
    expect(step(50)).toBeGreaterThan(step(10) * 4);
    expect(step(100)).toBeGreaterThan(step(50) * 2);
  });

  test('the first level is reachable in one session', () => {
    // ~450 XP is a single 45min intensity-2 strength workout.
    expect(xpForLevel(2)).toBeLessThan(450);
  });

  test('levelFromXP inverts xpForLevel', () => {
    for (const l of [1, 2, 5, 17, 40, 99, 250]) {
      expect(levelFromXP(xpForLevel(l))).toBe(l);
      expect(levelFromXP(xpForLevel(l + 1) - 1)).toBe(l);
    }
  });

  test('a year of committed play does not exhaust the ladder', () => {
    // ~900 XP/day measured from the engine for a 75min intensity-2 routine.
    const y1 = levelFromXP(900 * 365);
    expect(y1).toBeGreaterThan(40);   // meaningful progress
    expect(y1).toBeLessThan(90);      // but not finished
    expect(levelFromXP(900 * 730)).toBeGreaterThan(y1); // still climbing at 2y
  });
});

describe('levelFromXP is bounded', () => {
  test.each([
    ['clamped ceiling', 1e12],
    ['absurd', 1e308],
    ['infinity', Infinity],
  ])('%s returns quickly and stays in range', (_label, xp) => {
    const t0 = Date.now();
    const l = levelFromXP(xp);
    // The old linear scan walked one level at a time; at 1e308 that froze the
    // app on load, because normalize() calls this during migration.
    expect(Date.now() - t0).toBeLessThan(50);
    expect(l).toBeGreaterThanOrEqual(1);
    expect(l).toBeLessThanOrEqual(MAX_LEVEL);
  });

  test.each([[NaN], [-1], [0]])('degenerate input %p floors at level 1', xp => {
    expect(levelFromXP(xp)).toBe(1);
  });
});

describe('rank ladder', () => {
  test('thresholds ascend and ids are unique', () => {
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].lvl).toBeGreaterThan(RANKS[i - 1].lvl);
    expect(new Set(RANKS.map(r => r.id)).size).toBe(RANKS.length);
  });

  test('rank thresholds are pinned to the retuned curve', () => {
    // Pinned deliberately: these are balance decisions, not incidental values.
    // Changing the curve without revisiting them is what let S-rank land on
    // day 6, so a threshold edit must break a test and be re-argued.
    const at = (id: string) => RANKS.find(r => r.id === id)!.lvl;
    expect(at('F')).toBe(0);
    expect(at('A')).toBe(22);
    expect(at('S')).toBe(32);
    expect(at('SS')).toBe(45);
    expect(at('MONARCH')).toBe(100);
    // S must sit beyond a committed player's first month. It is no longer the
    // ceiling — four ranks follow it — so mid-ladder is the right place for it.
    expect(at('S')).toBeGreaterThan(levelFromXP(900 * 30));
    expect(RANKS[RANKS.length - 1].lvl).toBeGreaterThan(levelFromXP(900 * 730));
  });

  test('S is no longer reachable in the first week', () => {
    // A committed player earns ~900 XP/day; a week is ~6300 XP.
    expect(levelFromXP(6300)).toBeLessThan(32);
    expect(rankForLevel(levelFromXP(6300)).id).not.toBe('S');
  });

  test('there is progression beyond S', () => {
    const beyond = RANKS.filter(r => r.lvl > RANKS.find(x => x.id === 'S')!.lvl);
    expect(beyond.length).toBeGreaterThanOrEqual(4);
    expect(nextRank(32)).not.toBeNull();
  });

  test('only the very top rank has no successor', () => {
    expect(nextRank(RANKS[RANKS.length - 1].lvl)).toBeNull();
    expect(nextRank(1)).not.toBeNull();
  });
});

describe('levelCurveV2 migration', () => {
  const legacy = (level: number, totalXP: number) =>
    ({ name: 'Old', cls: 'assassin', level, totalXP, gold: 500 } as unknown as GameState);

  test('reprices a legacy level from its XP', () => {
    // 677,367 XP was level 358 under the old curve.
    const s = normalize(legacy(358, 677367));
    expect(s.level).toBe(levelFromXP(677367));
    expect(s.level).toBeLessThan(358);
  });

  test('does NOT inflate XP to preserve the old level', () => {
    // Granting XP would keep the badge but multiply power ~74x, trivialising
    // every boss. The XP total must be untouched.
    const s = normalize(legacy(358, 677367));
    expect(s.totalXP).toBe(677367);
    expect(computePower(s)).toBeLessThan(100000);
  });

  test('records the previous level so the UI can explain the change', () => {
    const s = normalize(legacy(358, 677367)) as unknown as { prevCurveLevel?: number };
    expect(s.prevCurveLevel).toBe(358);
  });

  test('runs exactly once', () => {
    const s = normalize(legacy(358, 677367));
    const after = s.level;
    const again = normalize(JSON.parse(JSON.stringify(s)));
    expect(again.level).toBe(after);
    // A second pass must not re-stamp prevCurveLevel from the already-migrated level.
    expect((again as unknown as { prevCurveLevel?: number }).prevCurveLevel).toBe(358);
  });

  test('keeps everything the player actually earned', () => {
    const s = normalize({
      name: 'Old', cls: 'assassin', level: 100, totalXP: 100000,
      achievements: ['a6', 'a7', 'a15'], bosses: ['b1', 'b2', 'b3'],
      skillPoints: 12, gold: 9000,
    } as unknown as GameState);
    expect(s.achievements).toEqual(['a6', 'a7', 'a15']);
    expect(s.bosses).toEqual(['b1', 'b2', 'b3']);
    expect(s.skillPoints).toBe(12);
    expect(s.gold).toBe(9000);
  });

  test('a small drop is not flagged as noteworthy', () => {
    const s = normalize(legacy(5, xpForLevel(5))) as unknown as { prevCurveLevel?: number };
    expect(s.prevCurveLevel).toBeUndefined();
  });

  test('a brand new save is unaffected', () => {
    const s = normalize(defaultState('New', 'warrior'));
    expect(s.level).toBe(1);
    expect((s as unknown as { prevCurveLevel?: number }).prevCurveLevel).toBeUndefined();
  });

  test('a hostile XP value cannot hang or escape the level cap', () => {
    const t0 = Date.now();
    const s = normalize({ name: 'X', cls: 'warrior', level: 1, totalXP: 1e308 } as unknown as GameState);
    expect(Date.now() - t0).toBeLessThan(100);
    expect(s.level).toBeLessThanOrEqual(MAX_LEVEL);
    expect(Number.isFinite(computePower(s))).toBe(true);
  });
});

describe('rank presentation', () => {
  test('every rank has an aura colour', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { rankAura } = require('../../theme/colors');
    for (const r of RANKS) expect(typeof rankAura[r.id]).toBe('string');
  });
});

describe('skill economy', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SKILLS, buySkill, statGainMult } = require('../skills');
  const { ENGINE, damageResist, critChance } = require('../index');

  const maxed = () => {
    const s = normalize(defaultState('Max', 'warrior'));
    s.skillPoints = 999;
    for (const sk of SKILLS) for (let i = 0; i < sk.max; i++) buySkill(s, sk.id);
    return s;
  };

  test('the tree is deep enough to outlast a year of levelling', () => {
    const total = SKILLS.reduce((n: number, sk: { max: number }) => n + sk.max, 0);
    // A committed player reaches ~level 69 in a year = ~68 points.
    expect(total).toBeGreaterThan(levelFromXP(900 * 365));
  });

  test('Mastery actually changes stat gain', () => {
    // It was defined in SKILLS and read nowhere: buying it spent a point and
    // altered no number in the game.
    const base = normalize(defaultState('A', 'warrior'));
    const buff = normalize(defaultState('B', 'warrior'));
    buff.skillPoints = 10;
    for (let i = 0; i < 10; i++) buySkill(buff, 's_master');
    expect(statGainMult(buff)).toBeGreaterThan(statGainMult(base));

    base.energy = 1000; buff.energy = 1000;
    ENGINE.logActivity(base, 'strength', 60, 1);
    ENGINE.logActivity(buff, 'strength', 60, 1);
    expect(buff.stats.str).toBeGreaterThan(base.stats.str);
  });

  test('statGainMult is safe on a save with no skills', () => {
    expect(statGainMult({} as never)).toBe(1);
  });

  test('a fully maxed tree respects the hard caps', () => {
    const s = maxed();
    expect(damageResist(s)).toBeLessThanOrEqual(0.5);
    expect(critChance(s)).toBeLessThanOrEqual(0.75);
  });

  test('a fully maxed tree does not produce runaway multipliers', () => {
    const s = maxed();
    expect(s.xpMult).toBeLessThan(2);
    expect(s.goldMult).toBeLessThan(2);
    expect(Number.isFinite(s.maxEnergy)).toBe(true);
  });

  test('buying a skill always consumes exactly one point', () => {
    const s = normalize(defaultState('P', 'warrior'));
    s.skillPoints = 3;
    expect(buySkill(s, 's_sage')).toBe(true);
    expect(s.skillPoints).toBe(2);
    // and fails without spending when broke
    s.skillPoints = 0;
    expect(buySkill(s, 's_sage')).toBe(false);
    expect(s.skillPoints).toBe(0);
  });
});
