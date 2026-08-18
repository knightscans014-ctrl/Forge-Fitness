// Weekly Trial — a solo endurance boss that resets every week.
//
// This is single-player. The boss has a large HP pool that you chip away at
// across the week, so it rewards showing up repeatedly rather than one big
// session. Nobody else contributes; progress is entirely yours.

import { GameState, WeeklyTrialState } from './types';
import { computePower } from './levels';
import { addXP, addGold } from './rewards';
import { dayKey } from './state';

export const TRIAL_BOSSES = ['🐲 Shadow Wyrm', '🌋 Molten Golem', '🌀 Storm Titan', '💀 Lich King'];

export function trialStatus(s: GameState): { active: boolean; hp: number; maxHp: number; name: string } | null {
  if (s.weekKey !== weekKey2()) return null; // no trial yet this week
  if (!s.weeklyTrial) return null;
  return { active: !s.weeklyTrial.defeated, hp: Math.max(0, s.weeklyTrial.bossHp), maxHp: s.weeklyTrial.bossMaxHp, name: s.weeklyTrial.bossName };
}
function weekKey2(): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const d0 = new Date(now);
  d0.setDate(now.getDate() - day);
  return `${d0.getFullYear()}-${d0.getMonth() + 1}-${d0.getDate()}`;
}

export function startTrial(s: GameState): void {
  if (s.weekKey !== weekKey2()) {
    s.weekKey = weekKey2();
  }
  const bossName = TRIAL_BOSSES[Math.abs(dayKey().split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % TRIAL_BOSSES.length];
  const maxHp = 5000 + computePower(s) * 4;
  s.weeklyTrial = { startedAt: Date.now(), bossName, bossMaxHp: maxHp, bossHp: maxHp, damageDealt: 0, defeated: false };
}

// Damage scales with power. Costs energy. Returns dmg done.
export function trialStrike(s: GameState): number {
  if (!s.weeklyTrial || s.weeklyTrial.defeated) return 0;
  const cost = 10;
  if (s.energy < cost) return 0;
  s.energy -= cost;
  const dmg = Math.round(computePower(s) * (1.5 + Math.random() * 1.5));
  s.weeklyTrial.bossHp -= dmg;
  s.weeklyTrial.damageDealt += dmg;

  if (s.weeklyTrial.bossHp <= 0) {
    s.weeklyTrial.defeated = true;
    s.weeklyTrial.bossHp = 0;
    // big reward
    addXP(s, 800);
    addGold(s, 400);
  }
  return dmg;
}

// How much of the boss's total HP you have carved off, as a percentage.
export function trialProgress(s: GameState): number {
  if (!s.weeklyTrial) return 0;
  const { damageDealt, bossMaxHp } = s.weeklyTrial;
  if (bossMaxHp <= 0) return 0;
  return Math.min(100, Math.round((damageDealt / bossMaxHp) * 100));
}
