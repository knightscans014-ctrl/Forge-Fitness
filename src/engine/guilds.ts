// Guilds + weekly shared raid boss.

import { GameState, GuildRaidState } from './types';
import { computePower } from './levels';
import { addXP, addGold } from './rewards';
import { dayKey } from './state';

export const RAID_BOSSES = ['🐲 Shadow Wyrm', '🌋 Molten Golem', '🌀 Storm Titan', '💀 Lich King'];

// Raid resets weekly. Contribution is scaled by combat power + energy spent.
export function raidStatus(s: GameState): { active: boolean; hp: number; maxHp: number; name: string } | null {
  if (s.weekKey !== weekKey2()) return null; // no raid yet this week
  if (!s.guildRaid) return null;
  return { active: !s.guildRaid.defeated, hp: Math.max(0, s.guildRaid.bossHp), maxHp: s.guildRaid.bossMaxHp, name: s.guildRaid.bossName };
}
function weekKey2(): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const d0 = new Date(now);
  d0.setDate(now.getDate() - day);
  return `${d0.getFullYear()}-${d0.getMonth() + 1}-${d0.getDate()}`;
}

export function startRaid(s: GameState): void {
  if (s.weekKey !== weekKey2()) {
    s.weekKey = weekKey2();
  }
  const bossName = RAID_BOSSES[Math.abs(dayKey().split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % RAID_BOSSES.length];
  const maxHp = 5000 + computePower(s) * 4;
  s.guildRaid = { startedAt: Date.now(), bossName, bossMaxHp: maxHp, bossHp: maxHp, contributed: 0, players: [], defeated: false };
}

// Contribution scales with power. Costs energy. Returns dmg done.
export function raidStrike(s: GameState): number {
  if (!s.guildRaid || s.guildRaid.defeated) return 0;
  const cost = 10;
  if (s.energy < cost) return 0;
  s.energy -= cost;
  const dmg = Math.round(computePower(s) * (1.5 + Math.random() * 1.5));
  s.guildRaid.bossHp -= dmg;
  s.guildRaid.contributed += dmg;
  // Simulate a couple guild mates also striking
  if (!s.guildRaid.players.some(p => p.name === 'Atlas')) s.guildRaid.players.push({ name: 'Atlas', icon: '🦾', dmg: 0 });
  s.guildRaid.players[0].dmg += Math.round(dmg * 0.7);

  if (s.guildRaid.bossHp <= 0) {
    s.guildRaid.defeated = true;
    s.guildRaid.bossHp = 0;
    // big reward
    addXP(s, 800);
    addGold(s, 400);
  }
  return dmg;
}

export function raidRank(s: GameState): number {
  if (!s.guildRaid) return 0;
  const me = computePower(s);
  const total = me + s.guildRaid.players.reduce((a, p) => a + p.dmg, 0);
  if (total === 0) return 0;
  return Math.round((me / total) * 100);
}
