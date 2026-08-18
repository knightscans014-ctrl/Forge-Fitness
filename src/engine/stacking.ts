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
//
// This reads `activitiesToday` (activity ids: `steps`, `water`, `meditation`)
// and NOT `statsTrainedToday`, which keys on stat ids (`vig`, `foc`, `vit`).
// Chains are written in activity ids, so matching them against stat ids meant
// no chain could ever complete: a player could do cardio + mobility + recovery
// -- exactly the Heart Builder chain -- and the screen still read 0/3 with no
// reward. The whole feature was unreachable.
export function recordStackActivity(s: GameState, actId: string): { id: string; name: string; xp: number; gold: number }[] {
  const awarded: { id: string; name: string; xp: number; gold: number }[] = [];
  const today = s.activitiesToday || {};
  STACKS.forEach(stk => {
    if (!stk.chain.includes(actId)) return;
    const distinctDone = stk.chain.filter(id => today[id]).length;
    // stackProgress mirrors the distinct count so the UI and the completion
    // test can never disagree; it used to increment once per logged activity,
    // so repeating one activity three times "progressed" a three-step chain.
    s.stackProgress[stk.id] = distinctDone;
    if (distinctDone < stk.chain.length) return;
    const claimed = 'stack_' + stk.id;
    if (s.stackClaimed?.[claimed]) return;
    if (!s.stackClaimed) s.stackClaimed = {};
    s.stackClaimed[claimed] = 1;
    const xp = addXP(s, 100).xp;
    const gold = addGold(s, 40);
    awarded.push({ id: stk.id, name: stk.name, xp, gold });
  });
  return awarded;
}

export function stackProgress(s: GameState, stk: StackDef): { done: number; total: number } {
  const today = s.activitiesToday || {};
  const done = stk.chain.filter(id => today[id]).length;
  return { done, total: stk.chain.length };
}
