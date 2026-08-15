// Reward application: XP, gold, level-ups, rank-ups, criticals.

import { GameState, GearItem } from './types';
import { xpForLevel, levelFromXP, rankForLevel } from './levels';
import { xpMultNow, goldMultNow, comboMult, critXP, boosterActive } from './state';

export interface RewardEvent {
  xp: number;
  gold: number;
  leveledUp: number;
  rankUps: { from: string; to: string }[];
  crit: boolean;
  skillPoints: number;
}

// Add raw XP (before multipliers). Returns normalized event. Mutates state.
export function addXP(s: GameState, raw: number): RewardEvent {
  let xp = Math.round(raw * xpMultNow(s) * comboMult(s));
  const crit = critXP(s);
  if (crit) xp = Math.round(xp * 1.5);
  s.lastCrit = crit;

  const before = s.level;
  s.totalXP += xp;
  s.level = levelFromXP(s.totalXP);
  const leveledUp = s.level - before;

  let skillPoints = 0;
  for (let i = 0; i < leveledUp; i++) skillPoints += s.cls === 'mage' ? 2 : 1;
  s.skillPoints += skillPoints;

  const rankUps: { from: string; to: string }[] = [];
  if (leveledUp > 0) {
    const rb = rankForLevel(before).id;
    const rn = rankForLevel(s.level).id;
    if (rn !== rb) rankUps.push({ from: rb, to: rn });
  }

  return { xp, gold: 0, leveledUp, rankUps, crit, skillPoints };
}

export function addGold(s: GameState, raw: number): number {
  const g = Math.round(raw * goldMultNow(s));
  s.gold += g;
  return g;
}

// ---- Gear / loot ----
const GEAR_NAMES: Record<string, string[]> = {
  weapon: ['Rusty Blade', 'Iron Longsword', 'Storm Fang', 'Dragonfang Saber', 'Blade of Dawn'],
  armor: ['Worn Cuirass', 'Reinforced Plate', 'Void Mail', 'Aegis of Might', 'Titan Plate'],
  accessory: ['Old Charm', 'Frost Ring', 'Phoenix Amulet', 'Soul Amulet', 'Crown of Will'],
};
const GEAR_ICONS: Record<string, string> = { weapon: '🗡️', armor: '🛡️', accessory: '🧿' };

export function rollRarity(): GearItem['rarity'] {
  const r = Math.random();
  if (r < 0.6) return 'common';
  if (r < 0.85) return 'rare';
  if (r < 0.97) return 'epic';
  return 'legendary';
}
export function makeGear(slot: GearItem['slot'], rarity: GearItem['rarity']): GearItem {
  const idx = Math.floor(Math.random() * GEAR_NAMES[slot].length);
  const base = ({ common: 3, rare: 8, epic: 16, legendary: 30 } as Record<string, number>)[rarity];
  const power = base + Math.floor(Math.random() * base);
  return {
    id: 'g' + Date.now() + Math.floor(Math.random() * 999),
    slot,
    rarity,
    name: GEAR_NAMES[slot][idx],
    power,
    icon: GEAR_ICONS[slot],
  };
}
export function dropLoot(s: GameState, guaranteed: boolean): GearItem | null {
  let rarity: GearItem['rarity'] = guaranteed ? 'legendary' : rollRarity();
  if (!guaranteed && Math.random() < 0.03) rarity = 'epic';
  // Lucky Charm booster: dramatically boost drop quality
  if (boosterActive(s, 'b_luck')) {
    if (!guaranteed) {
      if (Math.random() < 0.4) rarity = 'epic';
      if (Math.random() < 0.15) rarity = 'legendary';
    }
  }
  const slots: GearItem['slot'][] = ['weapon', 'armor', 'accessory'];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const g = makeGear(slot, rarity);
  s.inventory.push(g);
  return g;
}
