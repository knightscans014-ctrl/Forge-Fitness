// State creation, persistence hooks, day/week keys, and multiplier math.

import { GameState } from './types';
import { CLASSES, DAILY_CHALLENGES, BOOSTERS, PREMIUM_TIERS } from './content';

export const SAVE_KEY = 'forge_save_v4';

export function dayKey(d?: Date): string {
  const t = d || new Date();
  return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
}
export function weekKey(d?: Date): string {
  const now = d || new Date();
  const day = (now.getDay() + 6) % 7;
  const d0 = new Date(now);
  d0.setDate(now.getDate() - day);
  return `${d0.getFullYear()}-${d0.getMonth() + 1}-${d0.getDate()}`;
}
export function dayChallengeSeed(): string {
  const n = dayKey().split('-').reduce((a, b) => a + +b, 0);
  return DAILY_CHALLENGES[Math.abs(n) % DAILY_CHALLENGES.length].id;
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
    premium: false,
    tier: null,
    creatorCode: false,
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
    bossesDefeated: 0,
    suggestion: null,
    suggestionDone: false,
    guild: { name: 'Shadow Guild', icon: '🗡️' },
    guildRaid: null,
    season: null,
    seasonXP: 0,
    history: [],
    stackProgress: {},
    duels: [],
    duelStreak: 0,
  };
}

export function normalize(s: GameState): GameState {
  // Backfill any fields missing from older saves.
  if (!s.inventory) s.inventory = [];
  if (!s.equipped) s.equipped = {};
  if (!s.daily) s.daily = { lastClaim: null, claimStreak: 0 };
  if (!s.weekly) s.weekly = { workouts: 0, stepsWeekly: 0, minWeekly: 0, waterWeekly: 0, statsTrained: 0, questsWeekly: 0, claimed: [] };
  if (!s.story) s.story = { sm1: [], sm2: [], sm3: [] };
  if (!s.milestones) s.milestones = { workouts: 0, streak: 0, level: 1, bossCount: 0, claimed: [] };
  if (!s.tiered) s.tiered = {};
  if (!s.boosters) s.boosters = [];
  if (!s.combo) s.combo = { n: 0, date: dayKey() };
  if (!s.statsTrainedToday) s.statsTrainedToday = {};
  if (s.dailyChallengeDone === undefined) s.dailyChallengeDone = false;
  if (s.dailyChallenge === undefined) s.dailyChallenge = dayChallengeSeed();
  // v5 backfills
  if (!s.achievements) s.achievements = [];
  if (!s.bossBattle) s.bossBattle = null;
  if (!s.guild) s.guild = { name: 'Shadow Guild', icon: '🗡️' };
  if (!s.guildRaid) s.guildRaid = null;
  if (!s.season) s.season = null;
  if (!s.history) s.history = [];
  if (!s.stackProgress) s.stackProgress = {};
  if (!s.duels) s.duels = [];
  if (!s.suggestion) s.suggestion = null;
  return s;
}

// ---- Multipliers / premium ----
export function isPremium(s: GameState): boolean {
  return !!s.premium || !!s.creatorCode;
}
export function tierValue(s: GameState): number {
  if (s.premium) {
    const t = PREMIUM_TIERS.find(x => x.id === s.tier) || PREMIUM_TIERS[0];
    return t ? t.value : 1;
  }
  return s.creatorCode ? 1 : 0;
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
  return m;
}
export function goldMultNow(s: GameState): number {
  let m = s.goldMult * (1 + premiumGoldBoost(s));
  if (boosterActive(s, 'b_gold')) m *= 2;
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
export function energyCost(min: number): number {
  return Math.ceil(min * 0.6);
}
export function refillEnergy(s: GameState): void {
  if (s.energyRegenAt !== dayKey()) {
    s.energy = s.maxEnergy;
    s.energyRegenAt = dayKey();
  }
}
