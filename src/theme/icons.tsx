// Premium vector icon system — replaces emoji chrome with crisp vector icons.
// Uses @expo/vector-icons (Ionicons + MaterialCommunityIcons), bundled with Expo.

import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from './colors';

export type IconName = string;
export type { IconFamily } from './iconNames';
import type { IconFamily } from './iconNames';

// Central Icon component — pick the right family + name.
export function Icon({ name, size = 22, color = colors.ink, family = 'ion', style }: {
  name: IconName; size?: number; color?: string; family?: IconFamily; style?: StyleProp<TextStyle>;
}) {
  if (family === 'mci') {
    return <MaterialCommunityIcons name={name as any} size={size} color={color} style={style} />;
  }
  return <Ionicons name={name as any} size={size} color={color} style={style} />;
}

// The tables live in a JSX-free module so they can be tested directly.
// Re-exported here so existing `from '../theme/icons'` imports keep working.
export { TAB_ICONS, ICONS, icon } from './iconNames';
