// Premium vector icon system — replaces emoji chrome with crisp vector icons.
// Uses @expo/vector-icons (Ionicons + MaterialCommunityIcons), bundled with Expo.

import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from './colors';

export type IconName = string;

// Central Icon component — pick the right family + name.
export function Icon({ name, size = 22, color = colors.ink, family = 'ion' }: {
  name: IconName; size?: number; color?: string; family?: 'ion' | 'mci';
}) {
  if (family === 'mci') {
    return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  }
  return <Ionicons name={name as any} size={size} color={color} />;
}

// ---- Tab bar icons (active/inactive variants) ----
export const TAB_ICONS: Record<string, { active: string; inactive: string; family?: 'ion' | 'mci' }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Missions: { active: 'list-circle', inactive: 'list-circle-outline', family: 'mci' },
  Battle: { active: 'sword', inactive: 'sword', family: 'mci' },
  Character: { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
  Log: { active: 'flash', inactive: 'flash-outline' },
  Guild: { active: 'account-group', inactive: 'account-group-outline' },
  Progress: { active: 'chart-box', inactive: 'chart-box-outline' },
  Social: { active: 'trophy', inactive: 'trophy-outline' },
  Shop: { active: 'store', inactive: 'store-outline' },
};

// ---- Semantic icon map for content (classes, stats, actions) ----
export const ICONS: Record<string, { name: string; family?: 'ion' | 'mci' }> = {
  // classes
  warrior: { name: 'shield', family: 'mci' },
  ranger: { name: 'bow-arrow' },
  monk: { name: 'meditation' },
  mage: { name: 'auto-fix' },
  assassin: { name: 'knife', family: 'mci' },
  paladin: { name: 'sword-cross', family: 'mci' },
  // stats
  str: { name: 'weight-lifter' },
  vig: { name: 'speedometer' },
  vit: { name: 'heart' },
  flx: { name: 'accessibility' },
  foc: { name: 'brain', family: 'mci' },
  // activities
  strength: { name: 'barbell', family: 'mci' },
  cardio: { name: 'run' },
  steps: { name: 'walk' },
  mobility: { name: 'yoga' },
  meditation: { name: 'meditation' },
  recovery: { name: 'bed', family: 'mci' },
  // currencies / resources
  gold: { name: 'coin', family: 'mci' },
  xp: { name: 'star' },
  energy: { name: 'flash' },
  hp: { name: 'heart' },
  // actions / nav
  quest: { name: 'clipboard-list', family: 'mci' },
  boss: { name: 'dragon', family: 'mci' },
  loot: { name: 'package-variant-closed', family: 'mci' },
  boost: { name: 'rocket' },
  gear: { name: 'shield-half-full', family: 'mci' },
  streak: { name: 'flame' },
  rank: { name: 'trophy' },
  duel: { name: 'sword' },
  raid: { name: 'account-multiple', family: 'mci' },
  season: { name: 'calendar-star', family: 'mci' },
  crown: { name: 'crown', family: 'mci' },
  lock: { name: 'lock-closed' },
  check: { name: 'checkmark-circle' },
  back: { name: 'chevron-back' },
  close: { name: 'close' },
  more: { name: 'ellipsis-horizontal' },
  settings: { name: 'settings' },
  notification: { name: 'notifications' },
  chevronRight: { name: 'chevron-forward' },
  sparkles: { name: 'sparkles' },
  water: { name: 'water' },
  sleep: { name: 'moon' },
  lightning: { name: 'flash' },
  play: { name: 'play-circle' },
  reload: { name: 'refresh' },
  shield: { name: 'shield-checkmark' },
  award: { name: 'medal', family: 'mci' },
};

export function icon(name: string): { name: string; family?: 'ion' | 'mci' } {
  return ICONS[name] || { name: 'help-circle' };
}
