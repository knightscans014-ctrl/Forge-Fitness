// State creation, persistence hooks, day/week keys, and multiplier math.

import { GameState } from './types';
import { CLASSES, DAILY_CHALLENGES, BOOSTERS, PREMIUM_TIERS } from './content';

export const SAVE_KEY = 'forge_save_v4';

const pad2 = (n: number) => (n < 10 ? '0' : '') + n;

/**
 * Day stamp, zero-padded so it sorts and compares lexicographically.
 *
 * The unpadded form ("2026-8-9") broke every string comparison against a
 * two-digit day: "2026-8-9" >= "2026-8-18" evaluates to true. analytics'
 * date-range query depended on exactly that, so it mis-reported for most of
 * every month. Padding makes string order match chronological order.
 */
export function dayKey(d?: Date): string {
  const t = d || new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}
/**
 * The calendar day before `d` (default today), as a dayKey.
 *
 * Deliberately not `Date.now() - 86400000`. Subtracting a fixed 24h crosses
 * two calendar days on a spring-forward date and zero on a fall-back one: at
 * 00:30 on 2026-03-09 in America/New_York, now-24h lands on Mar 7, so an
 * active player's streak silently reset. setDate() steps calendar days and is
 * DST-correct.
 */
export function yesterdayKey(d?: Date): string {
  const y = new Date(d || new Date());
  y.setDate(y.getDate() - 1);
  return dayKey(y);
}
export function weekKey(d?: Date): string {
  const now = d || new Date();
  const day = (now.getDay() + 6) % 7;
  const d0 = new Date(now);
  d0.setDate(now.getDate() - day);
  return `${d0.getFullYear()}-${pad2(d0.getMonth() + 1)}-${pad2(d0.getDate())}`;
}

/**
 * Upgrade a legacy unpadded stamp ("2026-8-9") to the padded form. Returns
 * non-matching input unchanged, so it is safe to run over any stored value.
 */
export function padDayKey(k: unknown): string {
  if (typeof k !== 'string') return '';
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(k);
  return m ? `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}` : k;
}
/**
 * FNV-1a plus an avalanche finalizer.
 *
 * The finalizer is not optional here. Raw FNV-1a only mixes forward, so two
 * keys differing in the last character differ by exactly charDiff * 16777619 —
 * and 16777619 mod 22 === 1 for our challenge pool, which means consecutive
 * days would land on consecutive challenges. That is the same predictable
 * march the digit-sum seed produced. The xor-shift/multiply tail spreads a
 * one-character change across all 32 bits so the modulo is unbiased.
 *
 * (missions.ts feeds its FNV output into mulberry32, which does this mixing
 * itself, so the daily slate was never affected.)
 */
function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Which challenge is offered today.
 *
 * Previously a digit sum of the date, which collides across months — 1 Nov and
 * 3 Sep both sum to 2036, so the same challenge reappeared on unrelated days.
 * A proper hash distributes the pool evenly.
 */
export function dayChallengeSeed(key = dayKey()): string {
  return DAILY_CHALLENGES[hashKey(key) % DAILY_CHALLENGES.length].id;
}
export function dayChallenge(s: GameState) {
  return DAILY_CHALLENGES.find(c => c.id === s.dailyChallenge) || DAILY_CHALLENGES[0];
}

export function defaultState(name: string, clsId: string): GameState {
  const cls = CLASSES.find(c => c.id === clsId) || CLASSES[0];
  const b = cls.bonus;
  const today = dayKey();
  return {
    name,
    cls: cls.id,
    created: Date.now(),
    tier: 't1',
    level: 1,
    totalXP: 0,
    gold: 80,
    hp: 100,
    maxHP: 100,
    energy: 100,
    maxEnergy: 100,
    energyRegenAt: today,
    stats: {
      str: 5 + (b.str || 0),
      vig: 5 + (b.vig || 0),
      vit: 5 + (b.vit || 0),
      flx: 5 + (b.flx || 0),
      foc: 5 + (b.foc || 0),
    },
    statGrowth: {
      str: 1 + (b.str || 0) * 0.1,
      vig: 1 + (b.vig || 0) * 0.1,
      vit: 1 + (b.vit || 0) * 0.1,
      flx: 1 + (b.flx || 0) * 0.1,
      foc: 1 + (b.foc || 0) * 0.1,
    },
    skillPoints: 1,
    skills: {},
    questsDone: [],
    dayDone: today,
    activities: [],
    workouts: 0,
    totalWorkoutMin: 0,
    stepsToday: 0,
    waterToday: 0,
    sleepHours: 0,
    streak: 0,
    lastActiveDay: today,
    bestStreak: 0,
    bosses: [],
    totalWater: 0,
    achievements: [],
    owned: {},
    bonusSlots: 0,
    xpMult: 1,
    goldMult: 1,
    bossDamage: 0,
    inventory: [],
    equipped: {},
    daily: { lastClaim: null, claimStreak: 0 },
    weekKey: weekKey(),
    weekly: { workouts: 0, stepsWeekly: 0, minWeekly: 0, waterWeekly: 0, statsTrained: 0, questsWeekly: 0, claimed: [] },
    story: { sm1: [], sm2: [], sm3: [] },
    milestones: { workouts: 0, streak: 0, level: 1, bossCount: 0, claimed: [] },
    tiered: {},
    boosters: [],
    combo: { n: 0, date: today },
    dailyChallenge: dayChallengeSeed(),
    dailyChallengeDone: false,
    workoutsToday: 0,
    stepsTodayAbs: 0,
    strengthMinToday: 0,
    cardioMinToday: 0,
    meditationMinToday: 0,
    statsTrainedToday: {},
    lastDay: today,
    lastCrit: false,
    // v5 max systems
    bossBattle: null,
    liveSession: null,
    sessionsRun: 0,
    sessionWins: 0,
    bossesDefeated: 0,
    suggestion: null,
    suggestionDone: false,
    weeklyTrial: null,
    season: null,
    seasonXP: 0,
    history: [],
    stackProgress: {},
    activitiesToday: {},
    stackClaimed: {},
    bouts: [],
    boutStreak: 0,
  };
}

export function normalize(s: GameState): GameState {
  // Core fields. These used to be assumed present, which was safe while saves
  // could only come from this app's own storage. Imported saves can be
  // hand-edited or truncated, so anything the UI reads unconditionally has to
  // be guaranteed here instead.
  const base = defaultState(s.name || 'Hunter', s.cls || 'warrior');
  if (!s.stats || typeof s.stats !== 'object') s.stats = base.stats;
  else for (const k of Object.keys(base.stats) as (keyof typeof base.stats)[]) {
    if (typeof s.stats[k] !== 'number' || !isFinite(s.stats[k])) s.stats[k] = base.stats[k];
  }
  if (!s.statGrowth || typeof s.statGrowth !== 'object') s.statGrowth = base.statGrowth;
  if (!Array.isArray(s.questsDone)) s.questsDone = [];
  if (!Array.isArray(s.bosses)) s.bosses = [];
  if (!s.skills || typeof s.skills !== 'object') s.skills = {};
  const num = (v: unknown, d: number) => (typeof v === 'number' && isFinite(v) ? v : d);
  // Progression fields get stricter handling than `num`. Coercing a corrupt
  // value straight to 0 is what silently wiped maxed accounts: normalize()
  // could not tell "field absent" from "field is NaN", so one bad activity
  // rewrote a level-97 save as a fresh character. `keep` preserves the last
  // known-good value instead, and only falls back to the default when there
  // is genuinely nothing to preserve.
  const CEIL = 1e12; // far beyond reachable play; blocks 1e308-style imports
  const keep = (v: unknown, prev: unknown, d: number) => {
    if (typeof v === 'number' && isFinite(v)) return Math.min(v, CEIL);
    if (typeof prev === 'number' && isFinite(prev)) return Math.min(prev, CEIL);
    return d;
  };
  // `lastGood` is written on every successful normalize, so it trails the live
  // values by exactly one repair and acts as the recovery point.
  const lg = (s as unknown as { lastGood?: Record<string, number> }).lastGood || {};
  s.level = Math.max(1, Math.floor(keep(s.level, lg.level, 1)));
  s.totalXP = Math.max(0, keep(s.totalXP, lg.totalXP, 0));
  // --- levelCurveV2 -------------------------------------------------------
  // The old curve (100*l^1.5) was so shallow that a year of play reached level
  // 358 and S-rank landed on day 6. The new curve reprices every level, and
  // because `level` is always derived from `totalXP` an existing save would
  // silently show a much lower number with no explanation.
  //
  // Granting XP to preserve the old level was the obvious fix and is wrong:
  // computePower() is totalXP/10, so keeping a level-358 player at 358 means
  // handing them 50.4M XP and power 5,037,079 instead of 67,737 — every boss
  // in the game becomes a one-hit kill. The number is cosmetic; the power it
  // implies is not.
  //
  // So the level moves and everything earned stays. Achievements, defeated
  // bosses, claimed milestones and skill points all live in append-only
  // fields, so nothing is revoked — only the badge changes. We stamp the old
  // level once so the UI can tell the player why, rather than letting them
  // discover it as an apparent rollback.
  const mig = s as unknown as { levelCurveV2?: number; prevCurveLevel?: number };
  if (!mig.levelCurveV2) {
    mig.levelCurveV2 = 1;
    // Required lazily: levels.ts pulls in inventory.ts and loot.ts, and
    // loot.ts requires state.ts, so a static import here closes a cycle at
    // module-init time.
    const { levelFromXP } = require('./levels') as typeof import('./levels');
    const derived = levelFromXP(s.totalXP);
    // Only worth explaining if the change is actually visible.
    if (s.level - derived >= 2) mig.prevCurveLevel = s.level;
    s.level = derived;
  }
  s.gold = Math.max(0, keep(s.gold, lg.gold, 0));
  s.energy = num(s.energy, base.energy);
  s.maxEnergy = Math.max(1, num(s.maxEnergy, base.maxEnergy));
  s.streak = Math.max(0, keep(s.streak, lg.streak, 0));
  s.bestStreak = Math.max(s.streak, keep(s.bestStreak, lg.bestStreak, 0));
  s.workouts = Math.max(0, keep(s.workouts, lg.workouts, 0));
  s.skillPoints = Math.max(0, num(s.skillPoints, 0));
  s.totalWorkoutMin = Math.max(0, keep(s.totalWorkoutMin, lg.totalWorkoutMin, 0));
  s.totalWater = Math.max(0, keep(s.totalWater, lg.totalWater, 0));
  // Energy is a daily resource, not progression — clamping it is safe and
  // stops imported saves from carrying an infinite pool.
  s.energy = Math.max(0, Math.min(s.energy, s.maxEnergy));
  // Stats are progression too, so clamp them rather than let 1e308 through.
  for (const k of Object.keys(base.stats) as (keyof typeof base.stats)[]) {
    s.stats[k] = Math.max(0, Math.min(s.stats[k], CEIL));
  }

  // Backfill any fields missing from older saves.
  // These use Array.isArray / typeof rather than a falsy check: a hand-edited
  // import can supply a string or a number where a collection belongs, which
  // passes `!s.inventory` and then throws `.filter is not a function` mid-render.
  if (!Array.isArray(s.activities)) s.activities = [];
  if (s.activities.length > MAX_ACTIVITY_LOG) s.activities = s.activities.slice(-MAX_ACTIVITY_LOG);
  if (!Array.isArray(s.inventory)) s.inventory = [];
  // An unbounded inventory is a memory and render hazard on import.
  if (s.inventory.length > MAX_INVENTORY) s.inventory = s.inventory.slice(0, MAX_INVENTORY);
  if (!s.equipped || typeof s.equipped !== 'object' || Array.isArray(s.equipped)) s.equipped = {};
  if (!s.daily) s.daily = { lastClaim: null, claimStreak: 0 };
  if (!s.weekly) s.weekly = { workouts: 0, stepsWeekly: 0, minWeekly: 0, waterWeekly: 0, statsTrained: 0, questsWeekly: 0, claimed: [] };
  if (!s.story) s.story = { sm1: [], sm2: [], sm3: [] };
  if (!s.milestones) s.milestones = { workouts: 0, streak: 0, level: 1, bossCount: 0, claimed: [] };
  if (!s.tiered || typeof s.tiered !== 'object') s.tiered = {};
  // Saves written before the paywall was removed may carry no tier, or a tier
  // that was locked behind a purchase. Everything is free now, so just ensure
  // a valid one is set.
  if (!s.tier || !PREMIUM_TIERS.some(t => t.id === s.tier)) s.tier = 't1';
  if (!Array.isArray(s.boosters)) s.boosters = [];
  if (!s.combo) s.combo = { n: 0, date: dayKey() };
  if (!s.statsTrainedToday || typeof s.statsTrainedToday !== 'object') s.statsTrainedToday = {};
  if (s.dailyChallengeDone === undefined) s.dailyChallengeDone = false;
  if (s.dailyChallenge === undefined) s.dailyChallenge = dayChallengeSeed();
  // v5 backfills
  if (!Array.isArray(s.achievements)) s.achievements = [];
  if (!s.bossBattle || typeof s.bossBattle !== 'object') s.bossBattle = null;
  // Legacy gear predates affixes/ilvl. Backfill rather than discard: a player's
  // existing loadout must survive the update intact.
  if (Array.isArray(s.inventory)) {
    s.inventory.forEach(g => {
      if (!g) return;
      if (typeof g.ilvl !== 'number') g.ilvl = Math.max(1, Math.round((g.power || 4) / 1.4));
      if (!Array.isArray(g.affixes)) g.affixes = [];
    });
  }
  if (s.liveSession === undefined) s.liveSession = null;
  s.sessionsRun = num(s.sessionsRun, 0);
  s.sessionWins = num(s.sessionWins, 0);
  // Saves from before the multiplayer framing was removed carry `guildRaid`
  // and `duels`. Same mechanics, new names — carry the progress across.
  const legacy = s as unknown as {
    guildRaid?: { startedAt: number; bossName: string; bossMaxHp: number; bossHp: number; contributed?: number; defeated: boolean } | null;
    duels?: { rival: string; wins: number }[];
    duelStreak?: number;
    guild?: unknown;
  };
  if (!s.weeklyTrial && legacy.guildRaid) {
    const g = legacy.guildRaid;
    s.weeklyTrial = {
      startedAt: g.startedAt, bossName: g.bossName, bossMaxHp: g.bossMaxHp,
      bossHp: g.bossHp, damageDealt: g.contributed || 0, defeated: g.defeated,
    };
  }
  if (!s.bouts && legacy.duels) s.bouts = legacy.duels.map(d => ({ opponent: d.rival, wins: d.wins }));
  if (s.boutStreak === undefined && legacy.duelStreak !== undefined) s.boutStreak = legacy.duelStreak;
  delete legacy.guild; delete legacy.guildRaid; delete legacy.duels; delete legacy.duelStreak;
  if (!s.weeklyTrial || typeof s.weeklyTrial !== 'object') s.weeklyTrial = null;
  if (!s.season || typeof s.season !== 'object') s.season = null;
  if (!Array.isArray(s.history)) s.history = [];
  if (s.history.length > MAX_HISTORY) s.history = s.history.slice(-MAX_HISTORY);
  if (!s.stackProgress || typeof s.stackProgress !== 'object') s.stackProgress = {};
  if (!s.activitiesToday || typeof s.activitiesToday !== 'object') s.activitiesToday = {};
  if (!s.stackClaimed || typeof s.stackClaimed !== 'object') s.stackClaimed = {};
  if (!Array.isArray(s.bouts)) s.bouts = [];
  if (s.boutStreak === undefined) s.boutStreak = 0;
  if (!s.suggestion || typeof s.suggestion !== 'object') s.suggestion = null;

  // Migrate day stamps written before dayKey() was zero-padded. These are all
  // compared with ===, so leaving a legacy "2026-8-9" next to a new
  // "2026-08-09" would read as a different day: the player would lose their
  // streak and get a spurious day reset. Rewrite them in place.
  s.energyRegenAt = padDayKey(s.energyRegenAt);
  s.dayDone = padDayKey(s.dayDone);
  s.lastActiveDay = padDayKey(s.lastActiveDay);
  s.lastDay = padDayKey(s.lastDay);
  s.weekKey = padDayKey(s.weekKey);
  if (s.daily.lastClaim) s.daily.lastClaim = padDayKey(s.daily.lastClaim);
  if (s.combo && s.combo.date) s.combo.date = padDayKey(s.combo.date);
  s.history.forEach(r => { if (r) r.date = padDayKey(r.date); });

  // Record the repaired progression values as the recovery point for the next
  // normalize(). Written last so it only ever captures a fully-validated state.
  (s as unknown as { lastGood?: Record<string, number> }).lastGood = {
    level: s.level, totalXP: s.totalXP, gold: s.gold, streak: s.streak,
    bestStreak: s.bestStreak, workouts: s.workouts,
    totalWorkoutMin: s.totalWorkoutMin, totalWater: s.totalWater,
  };
  return s;
}

// ---- Multipliers / difficulty path ----
// This build has no paywall: every feature is unlocked for everyone.
// `isPremium` is kept because boosts and perks are expressed in terms of it,
// and the tier system is now a purely cosmetic progression flavour.
export function isPremium(_s: GameState): boolean {
  return true;
}
export function tierValue(s: GameState): number {
  // normalize() guarantees a valid tier, so the fallback is just belt-and-braces.
  const t = PREMIUM_TIERS.find(x => x.id === s.tier);
  return t ? t.value : PREMIUM_TIERS.length;
}

export function premiumXPBoost(s: GameState): number {
  return ({ 0: 0, 1: 0.1, 2: 0.25, 3: 0.4 } as Record<number, number>)[tierValue(s)] || 0;
}
export function premiumGoldBoost(s: GameState): number {
  return ({ 0: 0, 1: 0.15, 2: 0.25, 3: 0.3 } as Record<number, number>)[tierValue(s)] || 0;
}
export function boosterDef(id: string) {
  return BOOSTERS.find(x => x.id === id);
}
export function boosterActive(s: GameState, id: string) {
  s.boosters = s.boosters.filter(b => b.expires > Date.now());
  return s.boosters.find(b => b.id === id);
}
export function xpMultNow(s: GameState): number {
  let m = s.xpMult * (1 + premiumXPBoost(s));
  if (boosterActive(s, 'b_xp')) m *= 2;
  // Gear/set affixes. Required lazily: loot.ts imports from stacking.ts, and a
  // static import here would close a cycle through state.ts.
  const { totalAffixes } = require('./loot');
  m *= 1 + (totalAffixes(s).xpBonus || 0) / 100;
  return m;
}
export function goldMultNow(s: GameState): number {
  let m = s.goldMult * (1 + premiumGoldBoost(s));
  if (boosterActive(s, 'b_gold')) m *= 2;
  const { totalAffixes } = require('./loot');
  m *= 1 + (totalAffixes(s).goldBonus || 0) / 100;
  return m;
}
export function comboNow(s: GameState): { n: number; date: string } {
  if (s.combo.date !== dayKey()) s.combo = { n: 0, date: dayKey() };
  return s.combo;
}
export function comboMult(s: GameState): number {
  return 1 + comboNow(s).n * 0.1;
}
export function critXP(s: GameState): boolean {
  return Math.random() < 0.12 + (s.skills.s_crit || 0) * 0.01;
}
/**
 * Sanity ceilings for player-supplied activity input. These are deliberately
 * generous — an ultra-marathoner logging 12 hours is legitimate — they exist
 * only to stop absurd or hostile values from reaching the save.
 */
export const MAX_ACTIVITY_MIN = 1440; // one day
export const MAX_INTENSITY = 3;

/** Collection ceilings, enforced in normalize() so an import cannot blow up memory. */
export const MAX_INVENTORY = 500;
export const MAX_HISTORY = 90; // matches analytics' own rolling cap
export const MAX_ACTIVITY_LOG = 100;

export function energyCost(min: number): number {
  return Math.ceil(min * 0.6);
}
export function refillEnergy(s: GameState): void {
  if (s.energyRegenAt !== dayKey()) {
    s.energy = s.maxEnergy;
    s.energyRegenAt = dayKey();
  }
}
