// Achievement definitions + auto-check.

import { GameState, AchievementDef } from './types';
import { addXP, addGold } from './rewards';

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a1', icon: '🌟', name: 'First Steps', cond: s => s.totalXP >= 100 },
  { id: 'a2', icon: '🔥', name: 'On Fire', cond: s => s.streak >= 3 },
  { id: 'a3', icon: '⚡', name: 'Streak Hero', cond: s => s.streak >= 7 },
  { id: 'a4', icon: '💪', name: 'Workout Novice', cond: s => s.workouts >= 5 },
  { id: 'a5', icon: '🏆', name: 'Workout Junkie', cond: s => s.workouts >= 30 },
  { id: 'a6', icon: '🚀', name: 'Rising Star', cond: s => s.level >= 8 },
  { id: 'a7', icon: '👑', name: 'Legend in Forging', cond: s => s.level >= 15 },
  { id: 'a8', icon: '💧', name: 'Hydrated', cond: s => s.totalWater >= 30 },
  { id: 'a9', icon: '🐉', name: 'Dragon Slayer', cond: s => s.bosses.length >= 1 },
  { id: 'a10', icon: '🎁', name: 'Looter', cond: s => s.inventory.length >= 3 },
  { id: 'a11', icon: '⚔️', name: 'Boss Killer', cond: s => s.bosses.length >= 3 },
  { id: 'a12', icon: '🛡️', name: 'Well-Equipped', cond: s => (s.equipped.weapon && s.equipped.armor && s.equipped.accessory ? 3 : (s.equipped.weapon || s.equipped.armor || s.equipped.accessory ? 1 : 0)) >= 2 },
  { id: 'a13', icon: '💎', name: 'Millionaire', cond: s => s.gold >= 1000 },
  { id: 'a14', icon: '🎯', name: 'Perfectionist', cond: s => s.combo.n >= 20 },
  { id: 'a15', icon: '👑', name: 'S-Rank Hunter', cond: s => s.level >= 30 },
];

export interface AchievementResult { id: string; name: string; xp: number; gold: number; }

export function checkAchievements(s: GameState): AchievementResult[] {
  const out: AchievementResult[] = [];
  ACHIEVEMENTS.forEach(a => {
    if (s.achievements.includes(a.id)) return;
    if (a.cond(s)) {
      s.achievements.push(a.id);
      const xp = addXP(s, 50).xp;
      const gold = addGold(s, 30);
      out.push({ id: a.id, name: a.name, xp, gold });
    }
  });
  return out;
}
