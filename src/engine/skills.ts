// Skill tree: permanent passive buffs. Rank up with skill points.

import { GameState, SkillDef } from './types';

/**
 * Ranks are 10 deep, not 5. Points are granted per level-up, so the old
 * 30-point tree was fully bought out long before a committed player's first
 * year ended — every level after that granted a currency with nothing to spend
 * it on. 60 ranks keeps the tree live for roughly two years under the retuned
 * curve while the per-rank values stay small enough not to break the caps in
 * critChance() (0.75) and damageResist() (0.50).
 */

export const SKILLS: SkillDef[] = [
  { id: 's_guardian', icon: '🛡️', name: 'Guardian', max: 10, de: '+3% damage resist per rank' },
  { id: 's_chest', icon: '💰', name: 'Treasure Hunter', max: 10, de: '+4% gold from all sources per rank' },
  { id: 's_sage', icon: '📖', name: 'Sage', max: 10, de: '+4% XP gain per rank' },
  { id: 's_regen', icon: '♻️', name: 'Regenerator', max: 10, de: '+2 max energy per rank' },
  { id: 's_crit', icon: '🎯', name: 'Critical', max: 10, de: '+2% boss crit chance per rank' },
  { id: 's_master', icon: '🎓', name: 'Mastery', max: 10, de: '+4% stat gain from all training per rank' },
];

export function buySkill(s: GameState, id: string): boolean {
  const sk = SKILLS.find(x => x.id === id);
  if (!sk) return false;
  const r = s.skills[id] || 0;
  if (r >= sk.max || s.skillPoints <= 0) return false;
  s.skills[id] = r + 1;
  s.skillPoints--;
  if (id === 's_chest') s.goldMult += 0.04;
  if (id === 's_sage') s.xpMult += 0.04;
  if (id === 's_regen') s.maxEnergy += 2;
  return true;
}

/**
 * Multiplier applied to every stat gain.
 *
 * Mastery was previously defined in SKILLS and read by nothing — buying it
 * consumed a point and changed no number anywhere in the game. This is the
 * missing half.
 */
export function statGainMult(s: GameState): number {
  return 1 + (s.skills?.s_master || 0) * 0.04;
}
