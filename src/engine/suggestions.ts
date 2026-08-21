// "The System" — AI-style quest suggestions based on weakest stat.

import { GameState } from './types';
import { STATS } from './levels';
import { addXP, addGold } from './rewards';

export function weakestStat(s: GameState): string {
  let mn = STATS[0].id, val = 1e9;
  for (const st of STATS) if (s.stats[st.id] < val) { val = s.stats[st.id]; mn = st.id; }
  return mn;
}

const TEMPLATES: Record<string, { icon: string; text: string; xp: number; gold: number }[]> = {
  str: [
    { icon: '🏋️', text: 'Strength Call — 20+ min lifting', xp: 80, gold: 25 },
    { icon: '💪', text: 'Push Power — 5x5 heavy compound lifts', xp: 90, gold: 30 },
  ],
  vig: [
    { icon: '🏃', text: 'Heart Ignition — 20+ min cardio', xp: 80, gold: 25 },
    { icon: '👟', text: 'Step up — hit 8,000 steps', xp: 70, gold: 20 },
  ],
  vit: [
    { icon: '💧', text: 'Hydrate — log 2L of water', xp: 50, gold: 15 },
    { icon: '😴', text: 'Deep Rest — get 7h+ sleep', xp: 60, gold: 18 },
  ],
  flx: [
    { icon: '🤸', text: 'Stretch Flow — 15 min mobility', xp: 65, gold: 20 },
    { icon: '🧘', text: 'Release — yoga / foam rolling', xp: 70, gold: 22 },
  ],
  foc: [
    { icon: '🧠', text: 'Clear Mind — meditate 10+ min', xp: 65, gold: 20 },
    { icon: '📖', text: 'Deep Work — 25 min focused session', xp: 75, gold: 24 },
  ],
};

/**
 * Rerolls allowed per day.
 *
 * The templates for a stat pay out different XP, so a free unlimited reroll is
 * a "spin until you see the 75" button -- the reward stops tracking the work.
 * A small budget keeps the escape hatch (you genuinely cannot meditate at
 * work) without making the dice the optimal strategy.
 */
export const MAX_REROLLS_PER_DAY = 2;

/** Rerolls the player has left today. */
export function rerollsLeft(s: GameState): number {
  return Math.max(0, MAX_REROLLS_PER_DAY - (s.suggestionRerolls || 0));
}

/**
 * Rolls the day's suggestion. `manual` marks a player-initiated reroll, which
 * is budgeted; the automatic first roll of the day is not.
 *
 * Returns null when a manual reroll is refused, so the UI can say why.
 */
export function generateSuggestion(s: GameState, manual = false) {
  if (manual) {
    // Never spend a reroll re-rolling something already paid out; that is the
    // faucet dayReset exists to close.
    if (s.suggestionDone) return null;
    if (rerollsLeft(s) <= 0) return null;
    s.suggestionRerolls = (s.suggestionRerolls || 0) + 1;
  }
  const st = weakestStat(s);
  const arr = TEMPLATES[st] || TEMPLATES.vig;
  const q = arr[Math.floor(Math.random() * arr.length)];
  s.suggestion = { id: 'sug_' + Date.now(), ...q, stat: st };
  s.suggestionDone = false;
  return s.suggestion;
}

export function completeSuggestion(s: GameState): boolean {
  const q = s.suggestion;
  if (!q || s.suggestionDone) return false;
  if (s.energy < 6) return false;
  s.energy -= 6;
  s.suggestionDone = true;
  addXP(s, q.xp);
  addGold(s, q.gold);
  s.stats[q.stat as keyof typeof s.stats] += 0.5;
  return true;
}
