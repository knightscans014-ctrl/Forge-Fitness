/**
 * Live session combat. The critical property under test is that the loop is a
 * pure function of elapsed time: a backgrounded app must resolve identically to
 * one that ticked continuously, because on a phone the app WILL be backgrounded
 * mid-workout. Anything that accumulates per-call would silently desync.
 */
import { defaultState } from '../state';
import {
  startSession, tickSession, useAbility, endSession, sessionMinutes,
  pickFoe, ABILITIES, ROUND_MS, MAX_SESSION_MIN,
} from '../session';
import { ENGINE } from '../index';
import type { GameState } from '../types';

const T0 = 1_700_000_000_000;

function player(): GameState {
  const s = defaultState('Tester', 'warrior');
  s.energy = 100;
  s.maxEnergy = 100;
  return s;
}

function begin(s: GameState, intensity = 1) {
  return startSession(s, 'strength', 'str', '🏋️', 'Strength Training', intensity, T0);
}

describe('session lifecycle', () => {
  it('starts active with a full-health player and a live foe', () => {
    const s = player();
    const sess = begin(s);
    expect(sess.phase).toBe('active');
    expect(sess.foe.hp).toBe(sess.foe.maxHp);
    expect(sess.foe.hp).toBeGreaterThan(0);
    expect(sess.hp).toBe(sess.maxHp);
    expect(sess.log.length).toBe(1); // the taunt
  });

  it('scales the foe to player power, so the fight stays tense at any level', () => {
    const weak = player();
    const strong = player();
    strong.totalXP = 50_000;
    strong.stats.str = 80;
    strong.stats.vig = 80;
    const a = pickFoe(weak, 'strength', 1);
    const b = pickFoe(strong, 'strength', 1);
    expect(b.hp).toBeGreaterThan(a.hp);
    expect(b.atk).toBeGreaterThan(a.atk);
  });

  it('picks a themed foe per activity and is deterministic for a seed', () => {
    const s = player();
    expect(pickFoe(s, 'strength', 7).id).toBe(pickFoe(s, 'strength', 7).id);
    // Unknown activity still yields a usable foe rather than throwing.
    expect(pickFoe(s, 'nonsense', 3).hp).toBeGreaterThan(0);
  });
});

describe('time-derived combat', () => {
  it('deals damage once per elapsed minute', () => {
    const s = player();
    const sess = begin(s);
    tickSession(s, sess, T0 + 60_000);
    const after1 = sess.foe.maxHp - sess.foe.hp;
    expect(after1).toBeGreaterThan(0);

    tickSession(s, sess, T0 + 120_000);
    const after2 = sess.foe.maxHp - sess.foe.hp;
    expect(after2).toBeGreaterThan(after1);
  });

  it('does not double-charge damage when ticked repeatedly within a minute', () => {
    const s = player();
    const sess = begin(s);
    tickSession(s, sess, T0 + 60_000);
    const hp = sess.foe.hp;
    for (let i = 0; i < 20; i++) tickSession(s, sess, T0 + 60_000 + i * 100);
    expect(sess.foe.hp).toBe(hp);
  });

  it('resolves identically whether ticked every second or once at the end', () => {
    // The backgrounded-app guarantee.
    const a = player();
    const b = player();
    const sa = begin(a);
    const sb = begin(b);
    // Same foe roll for a fair comparison.
    sb.foe = { ...sa.foe };

    const END = T0 + 5 * 60_000;
    for (let t = T0; t <= END; t += 1_000) tickSession(a, sa, t);
    tickSession(b, sb, END);

    expect(sb.foe.hp).toBe(sa.foe.hp);
    expect(sb.hp).toBe(sa.hp);
    expect(sb.rounds).toBe(sa.rounds);
  });

  it('applies missed enemy rounds as catch-up damage', () => {
    const s = player();
    const sess = begin(s);
    const gap = ROUND_MS * 4;
    tickSession(s, sess, T0 + gap);
    expect(sess.rounds).toBe(4);
    expect(sess.hp).toBeLessThan(sess.maxHp);
  });

  it('caps counted minutes so a forgotten timer cannot farm XP', () => {
    const s = player();
    const sess = begin(s);
    const tenHours = T0 + 10 * 60 * 60_000;
    expect(sessionMinutes(sess, tenHours)).toBe(MAX_SESSION_MIN);
  });

  it('is inert once the session is no longer active', () => {
    const s = player();
    const sess = begin(s);
    sess.phase = 'won';
    const snapshot = { ...sess.foe };
    tickSession(s, sess, T0 + 10 * 60_000);
    expect(sess.foe.hp).toBe(snapshot.hp);
  });

  it('ends in a win when the foe is worn down', () => {
    const s = player();
    const sess = begin(s);
    sess.foe.hp = 1;
    tickSession(s, sess, T0 + 60_000);
    expect(sess.phase).toBe('won');
  });

  it('ends in a loss when the player runs out of HP', () => {
    const s = player();
    const sess = begin(s);
    sess.hp = 1;
    sess.foe.hp = 10_000_000;
    tickSession(s, sess, T0 + ROUND_MS);
    expect(sess.phase).toBe('lost');
  });

  it('keeps the log bounded on a long session', () => {
    const s = player();
    const sess = begin(s);
    for (let m = 1; m <= 170; m++) tickSession(s, sess, T0 + m * 60_000);
    expect(sess.log.length).toBeLessThanOrEqual(60);
  });
});

describe('abilities', () => {
  it('damages the foe and respects the per-session limit', () => {
    const s = player();
    const sess = begin(s);
    sess.foe.hp = 10_000_000;
    const ab = ABILITIES.find(a => a.id === 'ab_final')!;
    const first = useAbility(s, sess, 'ab_final', T0);
    expect(first.ok).toBe(true);
    expect(first.dmg).toBeGreaterThan(0);
    // limit is 1
    const second = useAbility(s, sess, 'ab_final', T0);
    expect(second.ok).toBe(false);
    expect(second.reason).toContain(ab.name);
  });

  it('Second Wind heals instead of dealing damage', () => {
    const s = player();
    const sess = begin(s);
    sess.hp = 1;
    const foeHp = sess.foe.hp;
    const r = useAbility(s, sess, 'ab_breath', T0);
    expect(r.ok).toBe(true);
    expect(r.dmg).toBe(0);
    expect(r.healed).toBeGreaterThan(0);
    expect(sess.hp).toBeGreaterThan(1);
    expect(sess.foe.hp).toBe(foeHp);
  });

  it('never heals above max', () => {
    const s = player();
    const sess = begin(s);
    useAbility(s, sess, 'ab_breath', T0);
    expect(sess.hp).toBeLessThanOrEqual(sess.maxHp);
  });

  it('rejects unknown abilities and post-session use', () => {
    const s = player();
    const sess = begin(s);
    expect(useAbility(s, sess, 'nope', T0).ok).toBe(false);
    sess.phase = 'lost';
    expect(useAbility(s, sess, 'ab_surge', T0).ok).toBe(false);
  });

  it('can land the killing blow', () => {
    const s = player();
    const sess = begin(s);
    sess.foe.hp = 1;
    useAbility(s, sess, 'ab_surge', T0);
    expect(sess.phase).toBe('won');
  });
});

describe('payout', () => {
  it('pays a losing session in full for the minutes trained', () => {
    // Real exercise must always be rewarded; losing only forfeits the bonus.
    const s = player();
    const sess = begin(s);
    sess.phase = 'lost';
    const out = endSession(sess, T0 + 30 * 60_000);
    expect(out.minutes).toBe(30);
    expect(out.won).toBe(false);
    expect(out.bonusMult).toBe(1);
  });

  it('awards a bonus multiplier for a win', () => {
    const s = player();
    const sess = begin(s);
    sess.phase = 'won';
    const out = endSession(sess, T0 + 30 * 60_000);
    expect(out.bonusMult).toBeGreaterThan(1);
  });

  it('finishSession routes through logActivity so stats and counters move', () => {
    const s = player();
    const sess = begin(s);
    sess.phase = 'won';
    const workouts = s.workouts;
    const str = s.stats.str;
    const r = ENGINE.finishSession(s, sess, T0 + 40 * 60_000);
    expect(r.ok).toBe(true);
    expect(r.minutes).toBe(40);
    expect(s.workouts).toBe(workouts + 1);
    expect(s.stats.str).toBeGreaterThan(str);
    expect(s.totalWorkoutMin).toBeGreaterThanOrEqual(40);
    expect(r.bonus).toBeGreaterThan(0);
    expect(s.sessionsRun).toBe(1);
    expect(s.sessionWins).toBe(1);
  });

  it('pays nothing for a sub-minute session', () => {
    const s = player();
    const sess = begin(s);
    const workouts = s.workouts;
    const r = ENGINE.finishSession(s, sess, T0 + 20_000);
    expect(r.ok).toBe(false);
    expect(s.workouts).toBe(workouts);
  });

  it('a lost session still increments workouts and grants XP', () => {
    const s = player();
    const sess = begin(s);
    sess.phase = 'lost';
    const before = s.totalXP;
    const r = ENGINE.finishSession(s, sess, T0 + 25 * 60_000);
    expect(r.ok).toBe(true);
    expect(s.totalXP).toBeGreaterThan(before);
    expect(r.bonus).toBe(0);
    expect(s.sessionWins).toBe(0);
  });

  it('survives a save round-trip mid-fight', () => {
    const s = player();
    const sess = begin(s);
    tickSession(s, sess, T0 + 3 * 60_000);
    s.liveSession = sess;
    const revived = ENGINE.normalize(JSON.parse(JSON.stringify(s)));
    expect(revived.liveSession).toBeTruthy();
    expect(revived.liveSession!.foe.hp).toBe(sess.foe.hp);
    // and the revived session keeps ticking correctly
    const cont = tickSession(revived, revived.liveSession!, T0 + 6 * 60_000);
    expect(cont.foe.hp).toBeLessThan(sess.foe.hp);
  });
});
