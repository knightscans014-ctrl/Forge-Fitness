// Boss battle state machine (active, turn-based combat).

import { GameState, BossDef, BossBattleState } from './types';
import { computePower, critChance, damageResist } from './levels';
import { addXP, addGold, dropLoot } from './rewards';

export const BOSSES: BossDef[] = [
  { id: 'b1', icon: '🐉', name: 'The Couch Dragon', lvl: 3, hp: 90, atk: 6, xp: 150, gold: 60, unlock: 'Complete 3 daily quests' },
  { id: 'b2', icon: '⚡', name: 'Zero-Drop Titan', lvl: 5, hp: 150, atk: 9, xp: 220, gold: 90, unlock: 'Reach a 7-day streak' },
  { id: 'b3', icon: '🔥', name: 'Phx, the Reinvented', lvl: 8, hp: 230, atk: 13, xp: 320, gold: 130, unlock: 'Reach level 8' },
  { id: 'b4', icon: '🌋', name: 'Mount Habit', lvl: 12, hp: 340, atk: 18, xp: 480, gold: 200, unlock: 'Log 30 total workouts' },
  { id: 'b5', icon: '👑', name: 'Overlord Procrast', lvl: 16, hp: 520, atk: 24, xp: 700, gold: 300, unlock: 'Reach a 30-day streak' },
];

export function currentBoss(s: GameState): BossDef | null {
  return BOSSES.find(b => !s.bosses.includes(b.id)) || null;
}
export function bossUnlocked(s: GameState, b: BossDef): boolean {
  const need: Record<string, boolean> = {
    b1: s.bosses.length + 1 >= 0, // always available as first
  };
  const n = {
    b1: () => questsDoneToday(s) >= 3,
    b2: () => s.streak >= 7,
    b3: () => s.level >= 8,
    b4: () => s.workouts >= 30,
    b5: () => s.streak >= 30,
  } as Record<string, () => boolean>;
  return (n[b.id] || (() => false))();
}
function questsDoneToday(s: GameState): number {
  return s.questsDone.length;
}

export function startBossBattle(s: GameState): BossBattleState | null {
  const b = currentBoss(s);
  if (!b) return null;
  s.bossBattle = { bossId: b.id, bossHp: b.hp, bossMaxHp: b.hp, bossAtk: b.atk, log: [] };
  return s.bossBattle;
}

export interface StrikeResult {
  dmg: number;
  crit: boolean;
  bossDmg: number;
  bossDefeated: boolean;
  playerDefeated: boolean;
  reward?: { xp: number; gold: number; loot: boolean };
}

export function bossStrike(s: GameState): StrikeResult | null {
  const b = s.bossBattle;
  if (!b) return null;
  if (s.energy < 4) return null; // not enough energy
  s.energy -= 4;

  const power = computePower(s);
  const crit = Math.random() < critChance(s);
  let dmg = Math.round(power * (0.85 + Math.random() * 0.4));
  if (crit) dmg = Math.round(dmg * 2);
  b.bossHp -= dmg;
  b.log.push({ t: `You strike for ${dmg}${crit ? ' CRIT!' : ''}`, c: crit ? 'crit' : 'you' });

  const bossDmg = Math.round(b.bossAtk * (1 - damageResist(s)) * (0.8 + Math.random() * 0.5));
  s.hp -= bossDmg;
  const bossDef = BOSSES.find(x => x.id === b.bossId);
  b.log.push({ t: `${bossDef ? bossDef.name : 'Boss'} hits back for ${bossDmg}`, c: 'boss' });

  const res: StrikeResult = { dmg, crit, bossDmg, bossDefeated: false, playerDefeated: false };

  if (b.bossHp <= 0) {
    res.bossDefeated = true;
    const boss = BOSSES.find(x => x.id === b.bossId)!;
    s.bosses.push(boss.id);
    s.bossesDefeated = (s.bossesDefeated || 0) + 1;
    const xp = addXP(s, boss.xp).xp;
    const gold = addGold(s, boss.gold);
    const loot = dropLoot(s, true) !== null;
    res.reward = { xp, gold, loot };
    s.bossBattle = null;
    return res;
  }
  if (s.hp <= 0) {
    res.playerDefeated = true;
    s.hp = Math.max(10, Math.round((s.maxHP + s.stats.vit * 2) * 0.2));
    s.bossBattle = null;
    return res;
  }
  return res;
}

export function bossHeal(s: GameState): boolean {
  if (!s.bossBattle) return false;
  if (s.gold < 20) return false;
  s.gold -= 20;
  s.hp = Math.min(s.maxHP + s.stats.vit * 2, s.hp + 25);
  return true;
}
export function retreatBoss(s: GameState): void {
  s.bossBattle = null;
}
