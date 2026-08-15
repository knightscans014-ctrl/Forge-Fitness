// Habit stacking: chain related activities for a combo bonus.
// A stack completes when all its activities have been done today.

import { GameState, StackDef } from './types';
import { addXP, addGold } from './rewards';

export const STACKS: StackDef[] = [
  { id: 'st1', icon: '🌅', name: 'Morning Rising', desc: 'Steps + hydration + meditation', chain: ['steps', 'water', 'meditation'] },
  { id: 'st2', icon: '🏋️', name: 'Gain Day', desc: 'Strength + recovery + hydration', chain: ['strength', 'recovery', 'water'] },
  { id: 'st3', icon: '❤️', name: 'Heart Builder', desc: 'Cardio + mobility + recovery', chain: ['cardio', 'mobility', 'recovery'] },
  { id: 'st4', icon: '🧘', name: 'Zen Master', desc: 'Meditation + mobility + recovery', chain: ['meditation', 'mobility', 'recovery'] },
];

// Call after logging any activity. Returns any stacking rewards awarded.
export function recordStackActivity(s: GameState, actId: string): { id: string; name: string; xp: number; gold: number }[] {
  const awarded: { id: string; name: string; xp: number; gold: number }[] = [];
  STACKS.forEach(stk => {
    if (!stk.chain.includes(actId)) return;
    // mark this step as done today
    s.stackProgress[stk.id] = (s.stackProgress[stk.id] || 0) + 1;
    // count unique chain activities done today
    const doneSet = new Set(stk.chain.filter(id => s.statsTrainedToday[id] || id === actId || stk.chain.indexOf(id) >= 0 && id !== actId && s.statsTrainedToday[id]));
    // simpler: compute distinct chain items done
    const distinctDone = stk.chain.filter(id => s.statsTrainedToday[id] || id === actId).length;
    const complete = distinctDone >= stk.chain.length;
    if (complete && !s.statsTrainedToday['stack_' + stk.id]) {
      s.statsTrainedToday['stack_' + stk.id] = 1;
      const xp = addXP(s, 100).xp;
      const gold = addGold(s, 40);
      awarded.push({ id: stk.id, name: stk.name, xp, gold });
    }
  });
  return awarded;
}

export function stackProgress(s: GameState, stk: StackDef): { done: number; total: number } {
  const done = stk.chain.filter(id => s.statsTrainedToday[id]).length;
  return { done, total: stk.chain.length };
}
