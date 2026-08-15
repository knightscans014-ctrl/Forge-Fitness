// Seasons / ranked ladder. Each season resets seasonal XP with a theme.

import { GameState, SeasonInfo } from './types';
import { rankForLevel } from './levels';

const SEASON_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

export function currentSeason(s: GameState): SeasonInfo {
  if (s.season && Date.now() < s.season.end) return s.season;
  // create/reset a new season
  const id = Math.floor(Date.now() / SEASON_MS);
  const start = id * SEASON_MS;
  s.season = { id: String(id), name: seasonName(id), start, end: start + SEASON_MS };
  s.seasonXP = 0;
  return s.season;
}
export function seasonName(id: number): string {
  const names = ['Ember', 'Frost', 'Storm', 'Verdant', 'Shadow', 'Dawn'];
  return `Season of ${names[((id % names.length) + names.length) % names.length]}`;
}
export function addSeasonXP(s: GameState, xp: number): void {
  if (s.season && Date.now() < s.season.end) s.seasonXP += xp;
}
export function seasonTier(s: GameState): { icon: string; label: string } {
  const xp = s.seasonXP || 0;
  const tiers = [
    { icon: '🥉', label: 'Bronze' }, { icon: '🥈', label: 'Silver' }, { icon: '🥇', label: 'Gold' },
    { icon: '💎', label: 'Diamond' }, { icon: '👑', label: 'Monarch' },
  ];
  return tiers[Math.min(tiers.length - 1, Math.floor(xp / 2000))];
}
