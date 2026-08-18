// FORGE game engine — public API used by the UI layer.
// Pure logic, no rendering. Testable and portable to web/native.

import { GameState } from './types';
import {
  dayKey, weekKey, dayChallenge, defaultState, normalize, isPremium, tierValue,
  premiumXPBoost, premiumGoldBoost, boosterActive, boosterDef, xpMultNow, goldMultNow,
  comboNow, comboMult, critXP, energyCost, refillEnergy, SAVE_KEY,
} from './state';
import { addXP, addGold, dropLoot } from './rewards';
import { runAllChecks, trackWeekly, bumpStreak, dayReset, questsToday, dailyQuests, checkDailyChallenge, checkWeekly, checkStory, checkTiered, checkMilestones, weeklyVal, tieredVal } from './missions';
import { startBossBattle, bossStrike, bossHeal, retreatBoss, currentBoss, bossUnlocked } from './bosses';
import { checkAchievements } from './achievements';
import { buySkill } from './skills';
import { equipGear } from './inventory';
import { generateSuggestion, completeSuggestion } from './suggestions';
import { recordStackActivity } from './stacking';
import { startTrial, trialStrike, trialStatus, trialProgress } from './trials';
import { currentSeason, addSeasonXP, seasonTier } from './seasons';
import { bout, nextOpponent } from './bouts';
import { recordDay } from './analytics';
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
export * from './suggestions';
export * from './stacking';
export * from './trials';
export * from './seasons';
export * from './bouts';
export * from './analytics';

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
    s.stats[q.stat as keyof typeof s.stats] += 0.4;
    s.statGrowth[q.stat as keyof typeof s.statGrowth] += 0.1;
    s.bossDamage += q.xp;
    bumpStreak(s);
    runAllChecks(s);
    checkAchievements(s);
    return true;
  },

  logActivity(s: GameState, actId: string, dur: number, intensity: number): { ok: boolean; xp: number; gold: number } {
    const a = ACTIVITIES.find(x => x.id === actId);
    if (!a) return { ok: false, xp: 0, gold: 0 };
    const cost = energyCost(dur);
    if (s.energy < cost) return { ok: false, xp: 0, gold: 0 };
    s.energy -= cost;
    const raw = Math.round(dur * a.xpPerMin * intensity);
    const xp = addXP(s, raw).xp;
    const gold = addGold(s, Math.round(dur * a.goldPerMin * intensity));
    s.stats[a.stat as keyof typeof s.stats] += dur * 0.12;
    s.statGrowth[a.stat as keyof typeof s.statGrowth] += dur * 0.02;
    s.workouts++;
    s.totalWorkoutMin += dur;
    s.workoutsToday++;
    s.statsTrainedToday[a.stat] = 1;
    if (a.id === 'steps') s.stepsToday += Math.round(dur * 110);
    if (a.stat === 'str') s.strengthMinToday += dur;
    if (a.stat === 'vig') s.cardioMinToday += dur;
    if (a.stat === 'foc') s.meditationMinToday += dur;
    comboNow(s).n++;
    trackWeekly(s, 'workouts', 1);
    trackWeekly(s, 'minWeekly', dur);
    if (a.id === 'steps') trackWeekly(s, 'stepsWeekly', Math.round(dur * 110));
    s.activities.push({ icon: a.icon, name: a.name, xp, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    s.bossDamage += xp;
    bumpStreak(s);
    runAllChecks(s);
    recordStackActivity(s, actId);
    checkAchievements(s);
    addSeasonXP(s, xp);
    if (Math.random() < a.drop) dropLoot(s, false);
    return { ok: true, xp, gold };
  },

  quickWater(s: GameState): number {
    s.waterToday += 1;
    s.totalWater += 1;
    s.stats.vit += 0.2;
    s.statGrowth.vit += 0.05;
    s.statsTrainedToday.vit = 1;
    trackWeekly(s, 'waterWeekly', 1);
    const g = addGold(s, 8);
    checkDailyChallenge(s);
    return g;
  },
  quickSleep(s: GameState): number {
    s.sleepHours = Math.max(s.sleepHours, 8);
    s.stats.vit += 0.5;
    s.statGrowth.vit += 0.1;
    s.statsTrainedToday.vit = 1;
    addXP(s, 40);
    const g = addGold(s, 15);
    s.bossDamage += 40;
    return g;
  },
  quickSteps(s: GameState): number {
    s.stepsToday += 2000;
    s.stepsTodayAbs += 2000;
    s.stats.vig += 0.3;
    s.statGrowth.vig += 0.08;
    s.statsTrainedToday.vig = 1;
    trackWeekly(s, 'stepsWeekly', 2000);
    addXP(s, 30);
    const g = addGold(s, 10);
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
    const yesterday = dayKey(new Date(Date.now() - 86400000));
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
