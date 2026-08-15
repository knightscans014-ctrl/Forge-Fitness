// Level curve, ranks, and derived combat values.

import { GameState, StatId } from './types';

export const STATS: { id: StatId; name: string; icon: string; color: string; desc: string }[] = [
  { id: 'str', name: 'Strength', icon: '💪', color: '#ff8a5c', desc: 'Heavy training & strength sessions' },
  { id: 'vig', name: 'Vigor', icon: '🏃', color: '#4dc3ff', desc: 'Cardio, running, steps & conditioning' },
  { id: 'vit', name: 'Vitality', icon: '❤️', color: '#7cffb2', desc: 'Sleep, rest, hydration & recovery' },
  { id: 'flx', name: 'Flex', icon: '🤸', color: '#ffd166', desc: 'Mobility, yoga & stretching' },
  { id: 'foc', name: 'Focus', icon: '🧠', color: '#b18cff', desc: 'Meditation & mindfulness' },
];

export const RANKS: { id: string; lvl: number; title: string; icon: string; color: string }[] = [
  { id: 'F', lvl: 0, title: 'Novice Hunter', icon: '🥉', color: '#9fb0c8' },
  { id: 'E', lvl: 3, title: 'Aspiring Hunter', icon: '🥉', color: '#7f8ea8' },
  { id: 'D', lvl: 6, title: 'Rookie Hunter', icon: '🥈', color: '#6fd6ff' },
  { id: 'C', lvl: 10, title: 'Regular Hunter', icon: '🟦', color: '#4dc3ff' },
  { id: 'B', lvl: 15, title: 'Elite Hunter', icon: '🟩', color: '#37e08a' },
  { id: 'A', lvl: 20, title: 'High Hunter', icon: '🟪', color: '#b18cff' },
  { id: 'S', lvl: 30, title: 'Iron Sovereign', icon: '👑', color: '#ffd166' },
];

export function xpForLevel(l: number): number {
  return Math.floor(100 * Math.pow(l, 1.5));
}
export function levelFromXP(xp: number): number {
  let l = 1;
  while (xp >= xpForLevel(l + 1)) l++;
  return l;
}
export function rankForLevel(l: number) {
  let r = RANKS[0];
  for (const x of RANKS) if (l >= x.lvl) r = x;
  return r;
}
export function nextRank(l: number) {
  for (let i = 0; i < RANKS.length - 1; i++) {
    if (l >= RANKS[i].lvl && l < RANKS[i + 1].lvl) return RANKS[i + 1];
  }
  return null;
}
export function rankProgressPct(l: number): number {
  const nr = nextRank(l);
  if (!nr) return 100;
  const lo = rankForLevel(l).lvl;
  const hi = nr.lvl;
  return Math.min(100, Math.round(((l - lo) / (hi - lo)) * 100));
}

export function statLevels(s: GameState) {
  const out: Record<string, number> = {};
  for (const st of STATS) out[st.id] = Math.min(10, 1 + Math.floor(s.stats[st.id] / 4));
  return out;
}
export function effectiveMaxHP(s: GameState): number {
  let h = s.maxHP + s.stats.vit * 2;
  if (s.cls === 'paladin') h += 15;
  return h;
}
import { gearPower as inventoryGearPower } from './inventory';
export function computePower(s: GameState): number {
  return Math.round(
    s.totalXP / 10 + s.stats.str * 3 + s.stats.vig * 3 + s.stats.vit * 2 + s.stats.foc * 2 + inventoryGearPower(s)
  );
}
export function critChance(s: GameState): number {
  let c = 0.05 + (s.cls === 'assassin' ? 0.12 : 0);
  c += (s.skills.s_crit || 0) * 0.03;
  return Math.min(c, 0.55);
}
export function damageResist(s: GameState): number {
  let r = (s.skills.s_guardian || 0) * 0.05;
  if (s.cls === 'paladin') r += 0.1;
  return Math.min(r, 0.5);
}
