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

export function generateSuggestion(s: GameState) {
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
