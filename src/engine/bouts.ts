// Training bouts against scripted sparring partners.
//
// These are not other players and never were — each opponent is a fixed
// difficulty benchmark with a set power level. Beating one is a measure of
// your own progress, like clearing a boss. Win = rewards + a bout streak.

import { GameState } from './types';
import { computePower } from './levels';
import { addXP, addGold } from './rewards';

export interface Opponent {
  name: string;
  icon: string;
  lvl: number;
  power: number;
  desc: string;
}
export const OPPONENTS: Opponent[] = [
  { name: 'Sage', icon: '🦉', lvl: 3, power: 60, desc: 'Training dummy — calculating and precise' },
  { name: 'Ember', icon: '🔥', lvl: 4, power: 80, desc: 'Sparring partner — fiery and quick' },
  { name: 'Rook', icon: '🐺', lvl: 6, power: 110, desc: 'Veteran sparrer — fast and aggressive' },
  { name: 'Nyx', icon: '🌙', lvl: 7, power: 130, desc: 'Shadow of the training hall' },
  { name: 'Atlas', icon: '🦾', lvl: 9, power: 160, desc: 'Final benchmark — relentless strength' },
];

// Return the next opponent you haven't beaten (weakest first), or the
// toughest one once the whole ladder is cleared.
export function nextOpponent(s: GameState): Opponent {
  const beaten = new Set(s.bouts.map(d => d.opponent));
  const unbeaten = OPPONENTS.filter(r => !beaten.has(r.name));
  if (unbeaten.length) return unbeaten[0];
  return OPPONENTS[OPPONENTS.length - 1];
}

export interface BoutResult {
  win: boolean;
  opponent: Opponent;
  playerRoll: number;
  opponentRoll: number;
  xp: number;
  gold: number;
}

// One-shot bout: compare combat power with some variance.
export function bout(s: GameState, opponent: Opponent): BoutResult {
  const playerPower = computePower(s) * (1 + (Math.random() - 0.35) * 0.4);
  const opponentPower = opponent.power * (1 + (Math.random() - 0.35) * 0.4);
  const win = playerPower >= opponentPower;
  if (win) {
    const existing = s.bouts.find(d => d.opponent === opponent.name);
    if (existing) existing.wins++;
    else s.bouts.push({ opponent: opponent.name, wins: 1 });
    s.boutStreak = (s.boutStreak || 0) + 1;
    const xp = addXP(s, 120 + s.boutStreak * 20).xp;
    const gold = addGold(s, 60 + s.boutStreak * 10);
    return { win, opponent, playerRoll: Math.round(playerPower), opponentRoll: Math.round(opponentPower), xp, gold };
  } else {
    s.boutStreak = 0;
    return { win, opponent, playerRoll: Math.round(playerPower), opponentRoll: Math.round(opponentPower), xp: 0, gold: 0 };
  }
}
