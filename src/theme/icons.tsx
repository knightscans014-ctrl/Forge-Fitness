// Premium vector icon system — replaces emoji chrome with crisp vector icons.
// Uses @expo/vector-icons (Ionicons + MaterialCommunityIcons), bundled with Expo.

import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from './colors';

export type IconName = string;

// The glyph-name unions the two icon libraries actually accept. `IconName` is
// intentionally a plain string -- names arrive from the data tables in
// iconNames.ts, so they cannot be checked at this boundary by the compiler.
// icons.test.ts validates every table entry against the real glyph maps
// instead. Casting to these unions rather than `any` keeps the assertion
// narrow: only the name is unchecked, size/color/style stay type-safe.
type IonName = React.ComponentProps<typeof Ionicons>['name'];
type MciName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export type { IconFamily } from './iconNames';
import type { IconFamily } from './iconNames';

// Central Icon component — pick the right family + name.
export function Icon({ name, size = 22, color = colors.ink, family = 'ion', style }: {
  name: IconName; size?: number; color?: string; family?: IconFamily; style?: StyleProp<TextStyle>;
}) {
  if (family === 'mci') {
    return <MaterialCommunityIcons name={name as MciName} size={size} color={color} style={style} />;
  }
  return <Ionicons name={name as IonName} size={size} color={color} style={style} />;
}

// The tables live in a JSX-free module so they can be tested directly.
// Re-exported here so existing `from '../theme/icons'` imports keep working.
export { TAB_ICONS, ICONS, icon } from './iconNames';
