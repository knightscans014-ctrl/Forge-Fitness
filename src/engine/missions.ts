// Mission/quest resolution: daily, weekly, story, tiered, milestones, challenge.

import { GameState } from './types';
import {
  WEEKLY_QUESTS, STORY_MISSIONS, TIERED_MISSIONS, MILESTONE_MISSIONS, DAILY_POOL, DAILY_CHALLENGES,
} from './content';
import { dayKey, weekKey } from './state';
import { addXP, addGold } from './rewards';

// Deterministic daily quest subset (rotate by day)
export function dailyQuests(s: GameState) {
  const seed = dayKey().split('-').reduce((a, b) => a + +b, 0);
  const pool = DAILY_POOL;
  const start = seed % pool.length;
  const out: typeof pool = [];
  for (let i = 0; i < 6; i++) out.push(pool[(start + i) % pool.length]);
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
export function trackWeekly(s: GameState, stat: string, val: number): void {
  if (s.weekKey !== weekKey()) resetWeekly(s);
  (s.weekly as any)[stat] += val;
}
export function weeklyVal(s: GameState, stat: string): number {
  return (s.weekly as any)[stat] || 0;
}
export function dayReset(s: GameState): void {
  if (s.lastDay !== dayKey()) {
    s.lastDay = dayKey();
    s.workoutsToday = 0;
    s.strengthMinToday = 0;
    s.cardioMinToday = 0;
    s.meditationMinToday = 0;
    s.statsTrainedToday = {};
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
export function checkMilestones(s: GameState): MissionResult[] {
  const out: MissionResult[] = [];
  const ms = { workouts: s.workouts, streak: s.bestStreak, level: s.level, bossCount: s.bosses.length };
  MILESTONE_MISSIONS.forEach(m => {
    if (s.milestones.claimed.includes(m.id)) return;
    if (ms[m.stat as keyof typeof ms] >= m.target) {
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
