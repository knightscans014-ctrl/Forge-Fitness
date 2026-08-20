// FORGE game engine — public API used by the UI layer.
// Pure logic, no rendering. Testable and portable to web/native.

import { GameState } from './types';
import { dayKey, yesterdayKey, weekKey, dayChallenge, defaultState, normalize, isPremium, tierValue, premiumXPBoost, premiumGoldBoost, boosterActive, boosterDef, xpMultNow, goldMultNow, comboNow, comboMult, critXP, energyCost, SAVE_KEY, MAX_ACTIVITY_MIN, MAX_INTENSITY } from './state';
import { addXP, addGold, dropLoot } from './rewards';
import { runAllChecks, trackWeekly, bumpStreak, dayReset, questsToday, dailyQuests, checkDailyChallenge, weeklyVal, tieredVal } from './missions';
import { startBossBattle, bossStrike, bossHeal, retreatBoss, currentBoss, bossUnlocked } from './bosses';
import { checkAchievements } from './achievements';
import { buySkill, statGainMult } from './skills';
import { equipGear } from './inventory';
import { generateSuggestion, completeSuggestion } from './suggestions';
import { recordStackActivity } from './stacking';
import { startTrial, trialStrike, trialStatus, trialProgress } from './trials';
import { currentSeason, addSeasonXP, seasonTier } from './seasons';
import { bout, nextOpponent } from './bouts';
import { recordDay } from './analytics';
import { endSession, type LiveSession } from './session';
import { computePower, rankForLevel } from './levels';
import { CLASSES, ACTIVITIES, BOOSTERS, PREMIUM_TIERS, DAILY_REWARDS, DAILY_POOL } from './content';

// Re-export everything for convenience
export * from './types';
export * from './levels';
export * from './content';
export * from './state';
export * from './rewards';
export * from './missions';
export * from './bosses';
export * from './achievements';
export * from './skills';
export * from './inventory';
export * from './loot';
export * from './suggestions';
export * from './stacking';
export * from './trials';
export * from './seasons';
export * from './bouts';
export * from './analytics';
export * from './session';

/** What a finished live session paid out. Named so screens can hold it. */
export interface SessionOutcome {
  ok: boolean;
  xp: number;
  gold: number;
  minutes: number;
  won: boolean;
  bonus: number;
}

export const ENGINE = {
  constants: {
    SAVE_KEY,
    ACTIVITIES,
    BOOSTERS,
    PREMIUM_TIERS,
    CLASSES,
  },

  // ---- lifecycle ----
  newGame(name: string, clsId: string): GameState {
    return defaultState(name, clsId);
  },
  normalize,

  // ---- info ----
  dayKey,
  weekKey,
  isPremium,
  tierValue,
  premiumXPBoost,
  premiumGoldBoost,
  computePower,
  comboMult,
  dailyQuests,
  questsToday,
  dayChallenge,
  boosterActive,
  dayReset,
  energyCost,
  xpMultNow,
  goldMultNow,
  critXP,
  weeklyVal,
  tieredVal,
  checkAchievements,
  recordDay,
  rankForLevel,

  // ---- actions ----
  completeQuest(s: GameState, qid: string): boolean {
    const q = DAILY_POOL.find(x => x.id === qid);
    if (!q || s.questsDone.includes(qid)) return false;
    if (s.energy < energyCost(10)) return false;
    s.energy -= energyCost(10);
    s.questsDone.push(qid);
    s.dayDone = dayKey();
    trackWeekly(s, 'questsWeekly', 1);
    addXP(s, q.xp);
    addGold(s, q.gold);
    s.stats[q.stat as keyof typeof s.stats] += 0.4 * statGainMult(s);
    bumpStreak(s);
    runAllChecks(s);
    checkAchievements(s);
    return true;
  },

  logActivity(s: GameState, actId: string, dur: number, intensity: number): {
    ok: boolean; xp: number; gold: number;
    // Completed habit stacks, so the caller can actually tell the player. The
    // reward used to be computed and thrown away.
    stacks?: { id: string; name: string; xp: number; gold: number }[];
  } {
    const a = ACTIVITIES.find(x => x.id === actId);
    if (!a) return { ok: false, xp: 0, gold: 0 };
    // Validate before anything touches the save. A NaN or negative duration
    // used to propagate into totalXP/gold/stats, and normalize() would then
    // "repair" the NaN to 0 — silently wiping a maxed account. Reject at the
    // boundary instead: the engine is a public API and callers are not
    // guaranteed to be our own stepper UI.
    dur = Math.floor(dur);
    if (!Number.isFinite(dur) || dur <= 0 || dur > MAX_ACTIVITY_MIN) return { ok: false, xp: 0, gold: 0 };
    if (!Number.isFinite(intensity) || intensity <= 0) return { ok: false, xp: 0, gold: 0 };
    intensity = Math.min(intensity, MAX_INTENSITY);
    const cost = energyCost(dur);
    if (s.energy < cost) return { ok: false, xp: 0, gold: 0 };
    s.energy -= cost;
    const raw = Math.round(dur * a.xpPerMin * intensity);
    const xp = addXP(s, raw).xp;
    const gold = addGold(s, Math.round(dur * a.goldPerMin * intensity));
    s.stats[a.stat as keyof typeof s.stats] += dur * 0.12 * statGainMult(s);
    s.workouts++;
    s.totalWorkoutMin += dur;
    s.workoutsToday++;
    s.statsTrainedToday[a.stat] = 1;
    s.activitiesToday[a.id] = 1;
    if (a.id === 'steps') s.stepsToday += Math.round(dur * 110);
    if (a.stat === 'str') s.strengthMinToday += dur;
    if (a.stat === 'vig') s.cardioMinToday += dur;
    if (a.stat === 'foc') s.meditationMinToday += dur;
    comboNow(s).n++;
    trackWeekly(s, 'workouts', 1);
    trackWeekly(s, 'minWeekly', dur);
    if (a.id === 'steps') trackWeekly(s, 'stepsWeekly', Math.round(dur * 110));
    s.activities.push({ icon: a.icon, name: a.name, xp, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    bumpStreak(s);
    runAllChecks(s);
    const stacks = recordStackActivity(s, actId);
    checkAchievements(s);
    addSeasonXP(s, xp);
    if (Math.random() < a.drop) dropLoot(s, false);
    return { ok: true, xp, gold, stacks };
  },

  /**
   * Close a live session and pay it out.
   *
   * Deliberately delegates to logActivity rather than reimplementing rewards:
   * a live session is a *manner of logging*, not a second economy. Everything
   * quests, stats, streaks and achievements watch stays in one place. The only
   * difference is the win bonus, applied as extra XP after the fact.
   */
  finishSession(s: GameState, sess: LiveSession, now: number, abandoned = false): SessionOutcome {
    const out = endSession(sess, now, abandoned);
    // Under a minute is not a workout; close it out with nothing owed.
    if (out.minutes < 1) return { ok: false, xp: 0, gold: 0, minutes: 0, won: out.won, bonus: 0 };
    const r = ENGINE.logActivity(s, sess.actId, out.minutes, sess.intensity);
    if (!r.ok) return { ok: false, xp: 0, gold: 0, minutes: out.minutes, won: out.won, bonus: 0 };
    let bonus = 0;
    if (out.won && out.bonusMult > 1) {
      bonus = addXP(s, Math.round(r.xp * (out.bonusMult - 1))).xp;
      s.sessionWins = (s.sessionWins || 0) + 1;
    }
    s.sessionsRun = (s.sessionsRun || 0) + 1;
    return { ok: true, xp: r.xp + bonus, gold: r.gold, minutes: out.minutes, won: out.won, bonus };
  },

  quickWater(s: GameState): number {
    s.waterToday += 1;
    s.totalWater += 1;
    s.stats.vit += 0.2;
    s.statsTrainedToday.vit = 1;
    // Hydration is a stack link ('water') but is not a loggable ACTIVITY, so
    // without this the Morning Rising and Gain Day chains could never close.
    s.activitiesToday.water = 1;
    trackWeekly(s, 'waterWeekly', 1);
    const g = addGold(s, 8);
    recordStackActivity(s, 'water');
    checkDailyChallenge(s);
    return g;
  },
  quickSleep(s: GameState): number {
    s.sleepHours = Math.max(s.sleepHours, 8);
    s.stats.vit += 0.5;
    s.statsTrainedToday.vit = 1;
    s.activitiesToday.recovery = 1;
    addXP(s, 40);
    const g = addGold(s, 15);
    recordStackActivity(s, 'recovery');
    return g;
  },
  quickSteps(s: GameState): number {
    s.stepsToday += 2000;
    s.stepsTodayAbs += 2000;
    s.stats.vig += 0.3;
    s.statsTrainedToday.vig = 1;
    s.activitiesToday.steps = 1;
    trackWeekly(s, 'stepsWeekly', 2000);
    addXP(s, 30);
    const g = addGold(s, 10);
    recordStackActivity(s, 'steps');
    checkDailyChallenge(s);
    return g;
  },

  dailyClaimAvailable(s: GameState): boolean {
    if (!s.daily.lastClaim) return true;
    return s.daily.lastClaim !== dayKey();
  },
  claimDaily(s: GameState): { ok: boolean; gold: number; xp: number; energy: number; day: number } | null {
    if (!ENGINE.dailyClaimAvailable(s)) return null;
    // streak logic
    const yesterday = yesterdayKey();
    if (s.daily.lastClaim === yesterday) s.daily.claimStreak++;
    else if (s.daily.lastClaim) s.daily.claimStreak = 1;
    else s.daily.claimStreak = 1;
    s.daily.lastClaim = dayKey();
    const tier = DAILY_REWARDS[(s.daily.claimStreak - 1) % 7];
    const gold = addGold(s, tier.gold);
    const xp = tier.xp ? addXP(s, tier.xp).xp : 0;
    let energy = 0;
    if (tier.energy) { s.energy = Math.min(s.maxEnergy, s.energy + tier.energy); energy = tier.energy; }
    return { ok: true, gold, xp, energy, day: s.daily.claimStreak };
  },

  buyBooster(s: GameState, id: string): boolean {
    const b = boosterDef(id);
    if (!b) return false;
    if (s.gold < b.cost) return false;
    s.gold -= b.cost;
    if (b.type === 'energy') s.energy = s.maxEnergy;
    else s.boosters.push({ id, expires: Date.now() + (b.durMin || 30) * 60000 });
    return true;
  },

  // Tiers are free to switch between: they are a play-style choice, not a
  // purchase. Kept as a mutator so the Shop UI has something to call.
  activateTier(s: GameState, id: string): void {
    s.tier = id;
  },

  // ---- v5 max systems ----
  // boss battles
  startBossBattle,
  bossStrike,
  bossHeal,
  retreatBoss,
  currentBoss,
  bossUnlocked,
  // achievements / skills / gear
  buySkill,
  equipGear,
  // suggestions
  generateSuggestion,
  completeSuggestion,
  // stacking
  recordStackActivity,
  // weekly trial
  startTrial,
  trialStrike,
  trialStatus,
  trialProgress,
  // seasons
  currentSeason,
  addSeasonXP,
  seasonTier,
  // training bouts
  bout,
  nextOpponent,
};
