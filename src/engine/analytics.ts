// Progress analytics: rolling daily history + derived insights.

import { GameState, DailyRecord } from './types';
import { dayKey } from './state';

// Record today's totals into history (call once per day / on activity).
export function recordDay(s: GameState): void {
  if (!s.history) s.history = [];
  const today = dayKey();
  const last = s.history[s.history.length - 1];
  if (!last || last.date !== today) {
    s.history.push({ date: today, xp: s.totalXP, gold: s.gold, workouts: s.workouts, minutes: s.totalWorkoutMin });
    // cap history
    if (s.history.length > 90) s.history = s.history.slice(-90);
  }
}

export function last7Days(s: GameState): DailyRecord[] {
  if (!s.history) return [];
  return s.history.slice(-7);
}
export function workoutsThisWeek(s: GameState): number {
  if (!s.history) return s.workouts;
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - 6);
  const startKey = `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
  const idx = s.history.findIndex(r => r.date >= startKey);
  if (idx === -1) return 0;
  let count = 0;
  for (let i = idx; i < s.history.length; i++) count += s.history[i].workouts - (s.history[i - 1] ? s.history[i - 1].workouts : 0) || 0;
  return count;
}
export function trend(s: GameState): { direction: 'up' | 'down' | 'flat'; pct: number } {
  if (!s.history || s.history.length < 2) return { direction: 'flat', pct: 0 };
  const h = s.history.slice(-2);
  const prev = h[0].workouts;
  const cur = h[1].workouts;
  if (cur > prev) return { direction: 'up', pct: Math.round(((cur - prev) / Math.max(1, prev)) * 100) };
  if (cur < prev) return { direction: 'down', pct: Math.round(((prev - cur) / Math.max(1, cur)) * 100) };
  return { direction: 'flat', pct: 0 };
}
