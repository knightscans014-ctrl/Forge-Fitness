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
  { id: 'A', lvl: 22, title: 'High Hunter', icon: '🟪', color: '#b18cff' },
  { id: 'S', lvl: 32, title: 'Iron Sovereign', icon: '👑', color: '#ffd166' },
  // Endgame. S used to be the ceiling and was reachable inside a week, which
  // left long-term players with a rank badge that could never change again.
  // These four extend the ladder to roughly the three-year mark.
  { id: 'SS', lvl: 45, title: 'Sovereign', icon: '🔱', color: '#ff8a5c' },
  { id: 'SSS', lvl: 60, title: 'Ascendant', icon: '⚜️', color: '#ff2d55' },
  { id: 'NATIONAL', lvl: 80, title: 'National Level', icon: '🌐', color: '#5ef2ff' },
  { id: 'MONARCH', lvl: 100, title: 'Monarch of Iron', icon: '👁️', color: '#ffffff' },
];

/**
 * Total XP required to reach a level.
 *
 * Was `100 * l^1.5`, which is far too shallow: XP income is roughly flat per
 * day (~900 for a committed player) while the cost per level grew by only
 * ~2 XP per level. Simulating a year of real play through the engine gave
 * level 358 and S-rank on day 6 — the ladder was finished before the habit
 * was.
 *
 * The quadratic term keeps the first few sessions generous (level 2 costs 138
 * XP, about one workout) and the l^2.7 term takes over later so the curve
 * keeps its shape into the hundreds of days. Measured against replayed XP
 * traces for three player profiles:
 *
 *   casual (20m walk)          d7=8   d30=19  d365=49   d730=62
 *   regular (30m strength)     d7=10  d30=20  d365=50   d730=63
 *   committed (75m, int 2)     d7=18  d30=31  d365=69   d730=88
 *
 * NOTE: level is derived from totalXP, never stored, so this reprices every
 * existing save — see normalize()'s levelCurveV2 migration, which grants the
 * XP difference so nobody is demoted.
 */
export function xpForLevel(l: number): number {
  return Math.floor(25 * Math.pow(l, 2) + 6 * Math.pow(l, 2.7));
}
/** Hard ceiling on level. Far past reachable play (~3y of maximal effort is
 *  ~level 100) but low enough that the search below can never run long. */
export const MAX_LEVEL = 20000;

/**
 * Level implied by a total XP value.
 *
 * Binary search rather than the old `while (xp >= xpForLevel(l+1)) l++`. That
 * loop stepped one level at a time, so a corrupt or hostile save with
 * totalXP = 1e308 walked toward ~1e114 iterations and froze the app on load.
 * normalize() calls this during migration, so a slow path here is a startup
 * hang, not just a slow screen.
 */
export function levelFromXP(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  let lo = 1, hi = MAX_LEVEL;
  if (xp >= xpForLevel(hi)) return hi;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (xp >= xpForLevel(mid)) lo = mid; else hi = mid - 1;
  }
  return lo;
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
  const { totalAffixes } = require('./loot');
  h += totalAffixes(s).hpBonus || 0;
  return h;
}
import { gearPower as inventoryGearPower } from './inventory';
export function computePower(s: GameState): number {
  const { totalAffixes } = require('./loot');
  const t = totalAffixes(s);
  return Math.round(
    s.totalXP / 10 + s.stats.str * 3 + s.stats.vig * 3 + s.stats.vit * 2 + s.stats.foc * 2
    + inventoryGearPower(s) + (t.power || 0)
    + (t.statStr || 0) * 3 + (t.statVig || 0) * 3 + (t.statVit || 0) * 2 + (t.statFoc || 0) * 2
  );
}
export function critChance(s: GameState): number {
  let c = 0.05 + (s.cls === 'assassin' ? 0.12 : 0);
  c += (s.skills.s_crit || 0) * 0.03;
  const { totalAffixes } = require('./loot');
  c += (totalAffixes(s).critBonus || 0) / 100;
  return Math.min(c, 0.75);
}
export function damageResist(s: GameState): number {
  let r = (s.skills.s_guardian || 0) * 0.05;
  if (s.cls === 'paladin') r += 0.1;
  return Math.min(r, 0.5);
}
