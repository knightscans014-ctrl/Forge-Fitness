// Mission/quest resolution: daily, weekly, story, tiered, milestones, challenge.

import { GameState } from './types';
import {
  WEEKLY_QUESTS, STORY_MISSIONS, TIERED_MISSIONS, MILESTONE_MISSIONS, DAILY_POOL, DAILY_CHALLENGES,
} from './content';
import { dayKey, weekKey } from './state';
import { addXP, addGold } from './rewards';

/** How many quests of each difficulty make up a day's slate. */
const SLATE = { light: 2, core: 3, elite: 1 } as const;
export const DAILY_SLATE_SIZE = SLATE.light + SLATE.core + SLATE.elite;

/** Small deterministic PRNG (mulberry32) so a given day always rolls the same slate. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn a day key into a stable 32-bit seed. */
function daySeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The quests offered today.
 *
 * The pool is large now, so a sliding window would show almost the same six
 * quests two days running. Instead each day deterministically shuffles the
 * pool and draws a fixed mix of difficulties: a couple of easy wins, three
 * real ones, and one that is meant to be hard. Same day, same slate, on every
 * device and every render — no state is stored.
 */
export function dailyQuests(s?: GameState, key: string = dayKey()) {
  const rand = rng(daySeed(key));
  const out: typeof DAILY_POOL = [];

  (Object.keys(SLATE) as (keyof typeof SLATE)[]).forEach(tier => {
    const bucket = DAILY_POOL.filter(q => q.tier === tier);
    // Fisher-Yates on a copy, driven by the seeded PRNG.
    for (let i = bucket.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
    }
    out.push(...bucket.slice(0, SLATE[tier]));
  });

  // Backfill from anything unused if a bucket is ever too small to fill.
  if (out.length < DAILY_SLATE_SIZE) {
    for (const q of DAILY_POOL) {
      if (out.length >= DAILY_SLATE_SIZE) break;
      if (!out.includes(q)) out.push(q);
    }
  }
  return out;
}
export function questsToday(s: GameState): number {
  return dailyQuests(s).filter(q => s.questsDone.includes(q.id)).length;
}

// ---- reset / tracking ----
export function resetWeekly(s: GameState): void {
  s.weekKey = weekKey();
  s.weekly = { workouts: 0, stepsWeekly: 0, minWeekly: 0, waterWeekly: 0, statsTrained: 0, questsWeekly: 0, claimed: [] };
}
export function trackWeekly(s: GameState, stat: 'workouts' | 'stepsWeekly' | 'minWeekly' | 'waterWeekly' | 'statsTrained' | 'questsWeekly', val: number): void {
  if (s.weekKey !== weekKey()) resetWeekly(s);
  s.weekly[stat] += val;
}
export function weeklyVal(s: GameState, stat: 'workouts' | 'stepsWeekly' | 'minWeekly' | 'waterWeekly' | 'statsTrained' | 'questsWeekly'): number {
  return s.weekly[stat] || 0;
}
export function dayReset(s: GameState): void {
  if (s.lastDay !== dayKey()) {
    s.lastDay = dayKey();
    // Daily quests are *daily*. Without this the completed list grows forever
    // and every quest a player has ever finished stays ticked off, so the
    // slate is permanently exhausted.
    s.questsDone = [];
    s.dayDone = dayKey();
    s.workoutsToday = 0;
    s.strengthMinToday = 0;
    s.cardioMinToday = 0;
    s.meditationMinToday = 0;
    s.statsTrainedToday = {};
    s.activitiesToday = {};
    s.stackClaimed = {};
    s.stackProgress = {};
    // These are per-day counters and were never being cleared, so they grew
    // without bound: a player drinking 2L a day read "Water 10/2L" by day five
    // and daily challenges c2/c3/c9/c13/c19/c21/c22 silently auto-completed
    // from carry-over. The lifetime totals (totalWater, stepsTodayAbs) are
    // deliberately NOT reset here.
    s.waterToday = 0;
    s.stepsToday = 0;
    s.stepsTodayAbs = 0;
    s.sleepHours = 0;
    // Tiered missions are measured against today-counters (cardioMinToday,
    // waterToday, workoutsToday...), so they are daily content. Without this
    // reset each of the 7 missions paid out its 3 tiers exactly once in the
    // lifetime of a save and was dead thereafter.
    s.tiered = {};
    s.dailyChallengeDone = false;
    if (s.weekKey !== weekKey()) resetWeekly(s);
    if (s.combo.date !== dayKey()) s.combo = { n: 0, date: dayKey() };
  }
}
export function bumpStreak(s: GameState): void {
  const today = dayKey();
  if (s.lastActiveDay === today) return;
  if (dayKey(new Date(Date.now() - 86400000)) === s.lastActiveDay) s.streak++;
  else s.streak = 1;
  s.lastActiveDay = today;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
}

export interface MissionResult { kind: string; name: string; xp: number; gold: number; }

export function checkWeekly(s: GameState): MissionResult[] {
  if (s.weekKey !== weekKey()) resetWeekly(s);
  const out: MissionResult[] = [];
  WEEKLY_QUESTS.forEach(w => {
    if (s.weekly.claimed.includes(w.id)) return;
    if (weeklyVal(s, w.stat) >= w.target) {
      s.weekly.claimed.push(w.id);
      const xp = addXP(s, w.xp).xp;
      const gold = addGold(s, w.gold);
      out.push({ kind: 'weekly', name: w.title, xp, gold });
    }
  });
  return out;
}
export function checkStory(s: GameState): MissionResult[] {
  const out: MissionResult[] = [];
  STORY_MISSIONS.forEach(arc => {
    arc.steps.forEach((st, si) => {
      if (s.story[arc.id]?.includes(si)) return;
      if (st.check(s)) {
        (s.story[arc.id] ||= []).push(si);
        const xp = addXP(s, st.xp).xp;
        const gold = addGold(s, st.gold);
        out.push({ kind: 'story', name: `${arc.name} — ${st.name}`, xp, gold });
      }
    });
  });
  return out;
}
export function tieredVal(s: GameState, id: string): number {
  if (id === 'tm1') return s.cardioMinToday || 0;
  if (id === 'tm2') return s.stepsTodayAbs || s.stepsToday || 0;
  if (id === 'tm3') return s.waterToday || 0;
  if (id === 'tm4') return s.strengthMinToday || 0;
  if (id === 'tm5') return s.meditationMinToday || 0;
  if (id === 'tm6') return s.workoutsToday || 0;
  if (id === 'tm7') return Object.keys(s.statsTrainedToday || {}).length;
  return 0;
}
export function checkTiered(s: GameState): MissionResult[] {
  const out: MissionResult[] = [];
  TIERED_MISSIONS.forEach(tm => {
    const val = tieredVal(s, tm.id);
    const cur = s.tiered[tm.id] ?? -1;
    for (let i = cur + 1; i < 3; i++) {
      if (val >= tm.tiers[i].v) {
        s.tiered[tm.id] = i;
        const xp = addXP(s, tm.xp[i]).xp;
        const gold = addGold(s, tm.gold[i]);
        out.push({ kind: 'tiered', name: `${tm.name} ${tm.tiers[i].lvl}`, xp, gold });
      }
    }
  });
  return out;
}
/** Current value of every counter a milestone can be measured against. */
export function milestoneStats(s: GameState): Record<string, number> {
  return {
    workouts: s.workouts,
    streak: s.bestStreak,
    level: s.level,
    bossCount: s.bosses.length,
    minutes: s.totalWorkoutMin || 0,
    water: s.totalWater || 0,
    achievements: s.achievements?.length || 0,
    xp: s.totalXP || 0,
  };
}
export function checkMilestones(s: GameState): MissionResult[] {
  const out: MissionResult[] = [];
  const ms = milestoneStats(s);
  MILESTONE_MISSIONS.forEach(m => {
    if (s.milestones.claimed.includes(m.id)) return;
    if ((ms[m.stat] || 0) >= m.target) {
      s.milestones.claimed.push(m.id);
      const xp = addXP(s, m.xp).xp;
      const gold = addGold(s, m.gold);
      out.push({ kind: 'milestone', name: m.name, xp, gold });
    }
  });
  return out;
}
export function checkDailyChallenge(s: GameState): MissionResult[] {
  const out: MissionResult[] = [];
  const dc = DAILY_CHALLENGES.find(c => c.id === s.dailyChallenge) || DAILY_CHALLENGES[0];
  if (!s.dailyChallengeDone && dc.check(s)) {
    s.dailyChallengeDone = true;
    const xp = addXP(s, dc.xp).xp;
    const gold = addGold(s, dc.gold);
    out.push({ kind: 'challenge', name: dc.name, xp, gold });
  }
  return out;
}
export function runAllChecks(s: GameState): MissionResult[] {
  const res = [
    ...checkWeekly(s),
    ...checkStory(s),
    ...checkTiered(s),
    ...checkMilestones(s),
    ...checkDailyChallenge(s),
  ];
  return res;
}
