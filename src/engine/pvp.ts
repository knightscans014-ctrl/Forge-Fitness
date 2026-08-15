// PvP duels against AI rivals. Win = rewards + duel streak.

import { GameState } from './types';
import { computePower, critChance } from './levels';
import { addXP, addGold } from './rewards';

export interface Rival {
  name: string;
  icon: string;
  lvl: number;
  power: number;
  desc: string;
}
export const RIVALS: Rival[] = [
  { name: 'Atlas', icon: '🦾', lvl: 9, power: 160, desc: 'The Guild Leader — relentless strength' },
  { name: 'Nyx', icon: '🌙', lvl: 7, power: 130, desc: 'Shadow of the arena' },
  { name: 'Rook', icon: '🐺', lvl: 6, power: 110, desc: 'Fast and aggressive' },
  { name: 'Ember', icon: '🔥', lvl: 4, power: 80, desc: 'Fiery up-and-comer' },
  { name: 'Sage', icon: '🦉', lvl: 3, power: 60, desc: 'Calculating and precise' },
];

// Return the next rival you haven't beaten (or the strongest available).
export function nextRival(s: GameState): Rival {
  const beaten = new Set(s.duels.map(d => d.rival));
  const unbeaten = RIVALS.filter(r => !beaten.has(r.name));
  if (unbeaten.length) return unbeaten[0];
  return RIVALS[0];
}

export interface DuelResult {
  win: boolean;
  rival: Rival;
  playerRoll: number;
  rivalRoll: number;
  xp: number;
  gold: number;
}

// One-shot duel: compare combat power with crit variance.
export function duel(s: GameState, rival: Rival): DuelResult {
  const playerPower = computePower(s) * (1 + (Math.random() - 0.35) * 0.4);
  const rivalPower = rival.power * (1 + (Math.random() - 0.35) * 0.4);
  const win = playerPower >= rivalPower;
  if (win) {
    const existing = s.duels.find(d => d.rival === rival.name);
    if (existing) existing.wins++;
    else s.duels.push({ rival: rival.name, wins: 1 });
    s.duelStreak = (s.duelStreak || 0) + 1;
    const xp = addXP(s, 120 + s.duelStreak * 20).xp;
    const gold = addGold(s, 60 + s.duelStreak * 10);
    return { win, rival, playerRoll: Math.round(playerPower), rivalRoll: Math.round(rivalPower), xp, gold };
  } else {
    s.duelStreak = 0;
    return { win, rival, playerRoll: Math.round(playerPower), rivalRoll: Math.round(rivalPower), xp: 0, gold: 0 };
  }
}
