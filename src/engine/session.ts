/**
 * LIVE WORKOUT SESSION — real-time combat that runs *while you train*.
 *
 * Everything else in FORGE is retroactive bookkeeping: you finish a workout,
 * come back, and tell the app what you did. That is a tracker with an RPG skin.
 * This module is the opposite. You start a session BEFORE you train, and for as
 * long as it runs you are in a fight: the enemy attacks on a cadence, your
 * elapsed training time deals damage, and you can spend real effort on burst
 * abilities. The workout is the input device.
 *
 * Design rules that keep this honest:
 *  - PURE. No timers, no Date.now() inside the reducers, no React. The caller
 *    owns the clock and passes `now`. That makes the whole loop unit-testable
 *    and immune to a backgrounded app: we recompute from timestamps rather than
 *    counting ticks, so minimising the app cannot desync the fight.
 *  - CATCH-UP, NOT REAL-TIME. `tickSession` derives how many enemy attacks
 *    *should* have landed by `now` and applies the difference. Losing 3 minutes
 *    to a phone lock resolves correctly on the next tick.
 *  - YOU CANNOT LOSE PROGRESS. Defeat costs the bonus, never the XP for the
 *    minutes you actually trained. Punishing real exercise is a design bug.
 */
import type { GameState, StatId } from './types';
import { computePower, critChance, damageResist, effectiveMaxHP } from './levels';

/** Wall-clock ms per combat round. Enemy swings once per round. */
export const ROUND_MS = 20_000;

/** Sessions are capped so a forgotten timer cannot farm infinite XP. */
export const MAX_SESSION_MIN = 180;

export type SessionPhase = 'active' | 'won' | 'lost' | 'abandoned';

export interface SessionFoe {
  id: string;
  icon: string;
  name: string;
  /** Enemy HP is scaled from the player's power at spawn time. */
  hp: number;
  maxHp: number;
  /** Damage per round before resist. */
  atk: number;
  /** Flavour line shown when the fight begins. */
  taunt: string;
}

export interface SessionLogLine {
  /** ms since session start, so the log replays in order. */
  at: number;
  t: string;
  c: 'you' | 'foe' | 'crit' | 'sys';
}

export interface LiveSession {
  actId: string;
  stat: StatId;
  icon: string;
  name: string;
  /** Epoch ms. */
  started: number;
  /** Epoch ms of the last processed tick. */
  lastTick: number;
  /** Rounds already resolved, used to derive catch-up. */
  rounds: number;
  intensity: number;
  foe: SessionFoe;
  /** Player HP for this fight only; does not touch persistent s.hp. */
  hp: number;
  maxHp: number;
  phase: SessionPhase;
  log: SessionLogLine[];
  /** Burst abilities fired this session, by ability id. */
  used: Record<string, number>;
  /** Damage dealt, tracked for the summary screen. */
  dealt: number;
  /** Minute mark of the last damage tick we converted into damage. */
  lastDmgMin: number;
}

/* ------------------------------------------------------------------ */
/* Foes                                                                */
/* ------------------------------------------------------------------ */

/**
 * Foes are themed to the activity, so a run and a lifting set do not feel like
 * the same fight. Stats are multipliers on player power, not flat numbers, so
 * the encounter stays tense at level 2 and at level 60.
 */
interface FoeTemplate {
  id: string;
  icon: string;
  name: string;
  hpMult: number;
  atkMult: number;
  taunt: string;
}

const FOES: Record<string, FoeTemplate[]> = {
  strength: [
    { id: 'stonebrute', icon: '🗿', name: 'Stone Brute', hpMult: 3.2, atkMult: 0.09, taunt: 'It plants its feet. Nothing here moves it but force.' },
    { id: 'ironjaw', icon: '🦾', name: 'Ironjaw Golem', hpMult: 3.8, atkMult: 0.08, taunt: 'Plated joints grind open. It was built to outlast you.' },
    { id: 'titanshade', icon: '👹', name: 'Titan Shade', hpMult: 4.4, atkMult: 0.11, taunt: 'A giant of old, thinned to smoke and spite.' },
  ],
  cardio: [
    { id: 'houndsofash', icon: '🐺', name: 'Ash Hound', hpMult: 2.6, atkMult: 0.11, taunt: 'It circles you. It does not intend to get tired first.' },
    { id: 'stormrunner', icon: '⚡', name: 'Stormrunner', hpMult: 3.0, atkMult: 0.13, taunt: 'Lightning on legs. Outpace it or be outpaced.' },
    { id: 'windwraith', icon: '🌪️', name: 'Wind Wraith', hpMult: 3.4, atkMult: 0.10, taunt: 'It runs where the air runs. Keep up.' },
  ],
  steps: [
    { id: 'roadghoul', icon: '🧟', name: 'Road Ghoul', hpMult: 2.2, atkMult: 0.07, taunt: 'Slow, patient, endless. It wins by attrition.' },
    { id: 'milemarker', icon: '🪨', name: 'Mile Marker', hpMult: 2.8, atkMult: 0.06, taunt: 'The distance itself, made solid.' },
  ],
  mobility: [
    { id: 'coilserpent', icon: '🐍', name: 'Coil Serpent', hpMult: 2.4, atkMult: 0.08, taunt: 'It binds what will not bend.' },
    { id: 'knotfiend', icon: '🕸️', name: 'Knot Fiend', hpMult: 2.7, atkMult: 0.07, taunt: 'Every tight muscle you own, given a face.' },
  ],
  meditation: [
    { id: 'doubtshade', icon: '👁️', name: 'Doubt Shade', hpMult: 2.3, atkMult: 0.09, taunt: 'It speaks in your own voice. Sit with it anyway.' },
    { id: 'noisewraith', icon: '🌀', name: 'Noise Wraith', hpMult: 2.6, atkMult: 0.08, taunt: 'Static given shape. Stillness is the blade.' },
  ],
  recovery: [
    { id: 'wearywight', icon: '🌙', name: 'Weary Wight', hpMult: 2.0, atkMult: 0.05, taunt: 'It feeds on burnout. Rest is how you starve it.' },
  ],
};

const FALLBACK_FOE: FoeTemplate = {
  id: 'trainingdummy', icon: '🎯', name: 'Training Dummy', hpMult: 2.5, atkMult: 0.07,
  taunt: 'It will not hit back hard. It will not go easy either.',
};

/**
 * Pick a foe for an activity. Deterministic per (activity, seed) so a session
 * resumed from storage rebuilds the same enemy rather than rerolling it.
 */
export function pickFoe(s: GameState, actId: string, seed: number): SessionFoe {
  const pool = FOES[actId] || [FALLBACK_FOE];
  const t = pool[Math.abs(seed) % pool.length];
  const power = Math.max(8, computePower(s));
  return {
    id: t.id,
    icon: t.icon,
    name: t.name,
    hp: Math.round(power * t.hpMult),
    maxHp: Math.round(power * t.hpMult),
    atk: Math.max(1, Math.round(power * t.atkMult)),
    taunt: t.taunt,
  };
}

/* ------------------------------------------------------------------ */
/* Burst abilities                                                     */
/* ------------------------------------------------------------------ */

/**
 * Abilities are the interactive layer. Each one asks for a real, verifiable
 * burst of effort — that is the point. The cost is effort, not currency, so
 * spamming them is not a dominant strategy: you have to actually do the thing.
 */
export interface Ability {
  id: string;
  icon: string;
  name: string;
  /** What the player physically does. */
  prompt: string;
  /** Damage as a multiple of player power. */
  mult: number;
  /** Max uses per session. */
  limit: number;
}

export const ABILITIES: Ability[] = [
  { id: 'ab_surge', icon: '💥', name: 'Power Surge', prompt: '10 hard reps, right now', mult: 1.4, limit: 4 },
  { id: 'ab_focus', icon: '🎯', name: 'Focused Strike', prompt: '30 seconds of max effort', mult: 1.9, limit: 3 },
  { id: 'ab_breath', icon: '🌬️', name: 'Second Wind', prompt: '5 slow breaths — heals you', mult: 0, limit: 2 },
  { id: 'ab_final', icon: '🔥', name: 'Final Form', prompt: 'Everything you have left', mult: 3.2, limit: 1 },
];

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

export function startSession(
  s: GameState,
  actId: string,
  stat: StatId,
  icon: string,
  name: string,
  intensity: number,
  now: number,
): LiveSession {
  const foe = pickFoe(s, actId, Math.floor(now / 60000));
  const maxHp = effectiveMaxHP(s);
  return {
    actId, stat, icon, name,
    started: now,
    lastTick: now,
    rounds: 0,
    intensity,
    foe,
    hp: maxHp,
    maxHp,
    phase: 'active',
    log: [{ at: 0, t: foe.taunt, c: 'sys' }],
    used: {},
    dealt: 0,
    lastDmgMin: 0,
  };
}

/** Whole minutes elapsed, clamped to the session cap. */
export function sessionMinutes(sess: LiveSession, now: number): number {
  return Math.min(MAX_SESSION_MIN, Math.floor((now - sess.started) / 60_000));
}

function push(sess: LiveSession, now: number, t: string, c: SessionLogLine['c']) {
  sess.log.push({ at: now - sess.started, t, c });
  // The log is a UI tail, not a ledger. Cap it so a 3-hour session cannot
  // balloon the save file.
  if (sess.log.length > 60) sess.log.splice(0, sess.log.length - 60);
}

/**
 * Advance the fight to `now`. Safe to call at any cadence — every 500ms from a
 * screen, or once after 20 minutes in the background. Damage and enemy attacks
 * are both derived from elapsed time, never accumulated per call, so the result
 * depends only on `now`.
 */
export function tickSession(s: GameState, sess: LiveSession, now: number): LiveSession {
  if (sess.phase !== 'active') return sess;

  const power = Math.max(1, computePower(s));
  const mins = sessionMinutes(sess, now);

  // --- Your damage: every full minute trained is a hit on the enemy. ---
  if (mins > sess.lastDmgMin) {
    const newMins = mins - sess.lastDmgMin;
    // Per-minute damage scales with power and how hard you said you'd go.
    const per = Math.max(1, Math.round(power * 0.55 * sess.intensity));
    const dmg = per * newMins;
    sess.foe.hp = Math.max(0, sess.foe.hp - dmg);
    sess.dealt += dmg;
    sess.lastDmgMin = mins;
    push(sess, now, `You press the attack — ${dmg} damage.`, 'you');
  }

  // --- Enemy attacks: catch-up from round count, not from tick count. ---
  const dueRounds = Math.floor((now - sess.started) / ROUND_MS);
  if (dueRounds > sess.rounds) {
    const missed = dueRounds - sess.rounds;
    const resist = damageResist(s);
    let total = 0;
    for (let i = 0; i < missed; i++) {
      total += Math.max(1, Math.round(sess.foe.atk * (1 - resist)));
    }
    sess.hp = Math.max(0, sess.hp - total);
    sess.rounds = dueRounds;
    if (total > 0) push(sess, now, `${sess.foe.name} strikes — ${total} damage.`, 'foe');
  }

  sess.lastTick = now;

  if (sess.foe.hp <= 0) {
    sess.phase = 'won';
    push(sess, now, `${sess.foe.name} falls.`, 'sys');
  } else if (sess.hp <= 0) {
    sess.phase = 'lost';
    push(sess, now, `You are overwhelmed — but the training still counts.`, 'sys');
  }
  return sess;
}

export interface AbilityResult {
  ok: boolean;
  dmg: number;
  crit: boolean;
  healed: number;
  reason?: string;
}

/** Fire a burst ability. Limited per session; heals are handled separately. */
export function useAbility(s: GameState, sess: LiveSession, abId: string, now: number): AbilityResult {
  if (sess.phase !== 'active') return { ok: false, dmg: 0, crit: false, healed: 0, reason: 'Session is over.' };
  const ab = ABILITIES.find(a => a.id === abId);
  if (!ab) return { ok: false, dmg: 0, crit: false, healed: 0, reason: 'Unknown ability.' };
  const used = sess.used[abId] || 0;
  if (used >= ab.limit) {
    return { ok: false, dmg: 0, crit: false, healed: 0, reason: `${ab.name} is spent for this session.` };
  }
  sess.used[abId] = used + 1;

  // Second Wind heals instead of hitting.
  if (ab.mult === 0) {
    const heal = Math.round(sess.maxHp * 0.25);
    sess.hp = Math.min(sess.maxHp, sess.hp + heal);
    push(sess, now, `Second Wind — you recover ${heal} HP.`, 'you');
    return { ok: true, dmg: 0, crit: false, healed: heal };
  }

  const power = Math.max(1, computePower(s));
  const crit = Math.random() < critChance(s);
  const dmg = Math.max(1, Math.round(power * ab.mult * sess.intensity * (crit ? 2 : 1)));
  sess.foe.hp = Math.max(0, sess.foe.hp - dmg);
  sess.dealt += dmg;
  push(sess, now, `${ab.name}${crit ? ' — CRITICAL' : ''} — ${dmg} damage.`, crit ? 'crit' : 'you');
  if (sess.foe.hp <= 0) {
    sess.phase = 'won';
    push(sess, now, `${sess.foe.name} falls.`, 'sys');
  }
  return { ok: true, dmg, crit, healed: 0 };
}

export interface SessionOutcome {
  minutes: number;
  won: boolean;
  /** Bonus multiplier applied to the workout's XP for winning. */
  bonusMult: number;
  foeName: string;
  dealt: number;
}

/**
 * Close out a session and report what the caller should award. This does NOT
 * mutate GameState — `ENGINE.finishSession` does that by handing `minutes` to
 * the existing logActivity path, so live sessions and manual logs earn through
 * exactly one code path and can never drift apart.
 */
export function endSession(sess: LiveSession, now: number, abandoned = false): SessionOutcome {
  const minutes = sessionMinutes(sess, now);
  if (sess.phase === 'active') sess.phase = abandoned ? 'abandoned' : 'won';
  const won = sess.phase === 'won';
  return {
    minutes,
    won,
    // Winning is a bonus on top, never a gate. Training you actually did is
    // always paid out in full.
    bonusMult: won ? 1.25 : 1,
    foeName: sess.foe.name,
    dealt: sess.dealt,
  };
}
