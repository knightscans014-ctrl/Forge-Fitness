// Skill tree: permanent passive buffs. Rank up with skill points.

import { GameState, SkillDef } from './types';

export const SKILLS: SkillDef[] = [
  { id: 's_guardian', icon: '🛡️', name: 'Guardian', max: 5, de: '+5% damage resist per rank' },
  { id: 's_chest', icon: '💰', name: 'Treasure Hunter', max: 5, de: '+6% gold from all sources per rank' },
  { id: 's_sage', icon: '📖', name: 'Sage', max: 5, de: '+6% XP gain per rank' },
  { id: 's_regen', icon: '♻️', name: 'Regenerator', max: 5, de: '+2 max energy per rank' },
  { id: 's_crit', icon: '🎯', name: 'Critical', max: 5, de: '+3% boss crit chance per rank' },
  { id: 's_master', icon: '🎓', name: 'Mastery', max: 5, de: '+1 bonus stat growth per rank' },
];

export function buySkill(s: GameState, id: string): boolean {
  const sk = SKILLS.find(x => x.id === id);
  if (!sk) return false;
  const r = s.skills[id] || 0;
  if (r >= sk.max || s.skillPoints <= 0) return false;
  s.skills[id] = r + 1;
  s.skillPoints--;
  if (id === 's_chest') s.goldMult += 0.06;
  if (id === 's_sage') s.xpMult += 0.06;
  if (id === 's_regen') s.maxEnergy += 2;
  return true;
}
