// Premium reusable UI primitives with modern dynamic theming
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import type { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Icon, type IconFamily } from '../theme/icons';

export function Card({ children, style, border, glow, onPress, accessibilityLabel }: { 
  children: React.ReactNode; 
  style?: StyleProp<ViewStyle>; 
  border?: string; 
  glow?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors, shadows } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.sysFaint,
      ...shadows.sm,
    },
    border ? { borderColor: border } : null, 
    glow && [styles.cardGlow, { borderColor: colors.gold, shadowColor: colors.gold }],
    style
  ];
  
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.cardPressed
        ]}
      >
        {children}
      </Pressable>
    );
  }
  
  return <View style={cardStyle}>{children}</View>;
}

export function Screen({ children, scroll = true }: { 
  children: React.ReactNode; 
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  const content = <View style={styles.pad}>{children}</View>;
  if (!scroll) return <View style={[styles.screen, { backgroundColor: colors.bg }]}>{content}</View>;
  return (
    <ScrollView 
      style={[styles.screen, { backgroundColor: colors.bg }]} 
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {content}
    </ScrollView>
  );
}

export function Pill({ children, color, filled }: { 
  children: React.ReactNode; 
  color?: string;
  filled?: boolean;
}) {
  const { colors } = useTheme();
  const c = color || colors.ink;
  return (
    <View style={[
      styles.pill,
      {
        backgroundColor: colors.card2,
        borderColor: colors.line,
      },
      color ? { 
        borderColor: color,
        backgroundColor: filled ? `${color}15` : undefined
      } : null
    ]}>
      <Text style={[styles.pillText, { color: c }]}>{children}</Text>
    </View>
  );
}

export function Btn({ 
  title, 
  onPress, 
  kind = 'primary', 
  small, 
  disabled,
  icon,
  fullWidth,
  accessibilityLabel,
  accessibilityHint
}: {
  title: string; 
  onPress: () => void; 
  kind?: 'primary' | 'ghost' | 'gold' | 'green' | 'danger' | 'mana';
  small?: boolean; 
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();

  const bg = kind === 'gold' ? colors.gold
    : kind === 'green' ? colors.success
    : kind === 'danger' ? colors.danger
    : kind === 'mana' ? colors.mana
    : kind === 'ghost' ? 'transparent'
    : colors.sys;

  const fg = kind === 'gold' ? '#231500'
    : kind === 'green' ? '#06281a'
    : kind === 'mana' ? '#fff'
    : kind === 'ghost' ? colors.sys
    : '#04222b';

  const extra = kind === 'ghost'
    ? { borderWidth: 1, borderColor: colors.sysDim }
    : { shadowColor: bg, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 10 };
    
  return (
    <Pressable 
      onPress={onPress} 
      disabled={disabled} 
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        extra,
        small && styles.btnSmall, 
        fullWidth && styles.btnFull,
        disabled && styles.btnDisabled,
        pressed && styles.btnPressed
      ]}
    >
      {icon && <Icon name={icon} size={small ? 16 : 18} color={fg} family="ion" style={{ marginRight: 6 }} />}
      <Text style={[styles.btnText, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>
    </Pressable>
  );
}

export function StatRow({ 
  icon, 
  iconBg, 
  name, 
  desc, 
  right,
  iconFamily = 'mci'
}: { 
  icon: string; 
  iconBg?: string; 
  name: string; 
  desc?: string; 
  right?: React.ReactNode;
  iconFamily?: IconFamily;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.line }]}>
      <View style={[styles.statIcon, { backgroundColor: iconBg || colors.card3 }]}>
        <Icon name={icon} size={20} color={colors.ink} family={iconFamily} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statName, { color: colors.ink }]}>{name}</Text>
        {desc ? <Text style={[styles.statDesc, { color: colors.mut }]}>{desc}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Bar({ pct, color, height = 8 }: { 
  pct: number; 
  color?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.barTrack, { height, borderRadius: height / 2, backgroundColor: colors.card3 }]}>
      <View style={[
        styles.barFill, 
        { 
          width: `${Math.max(0, Math.min(100, pct))}%`, 
          backgroundColor: color || colors.gold,
          borderRadius: height / 2
        }
      ]} />
    </View>
  );
}

export function SectionHeader({ 
  title, 
  subtitle, 
  action,
  icon
}: { 
  title: string; 
  subtitle?: string;
  action?: React.ReactNode;
  icon?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <Icon name={icon} size={18} color={colors.gold} family="ion" />}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
          {subtitle && <Text style={[styles.sectionSubtitle, { color: colors.mut }]}>{subtitle}</Text>}
        </View>
      </View>
      {action}
    </View>
  );
}

export function EmptyState({ 
  icon, 
  title, 
  message,
  action
}: { 
  icon: string; 
  title: string; 
  message: string;
  action?: React.ReactNode;
}) {
  const { colors, shadows } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.card2, ...shadows.sm }]}>
        <Icon name={icon} size={48} color={colors.mut3} family="ion" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.mut }]}>{message}</Text>
      {action && <View style={{ marginTop: 16 }}>{action}</View>}
    </View>
  );
}

export function Loader() {
  const { colors, shadows } = useTheme();
  return (
    <View style={[styles.loaderContainer, { backgroundColor: colors.bg }]}>
      <View style={[styles.loaderGlow, { backgroundColor: colors.card2, ...shadows.sysGlow }]}>
        <ActivityIndicator size="large" color={colors.sys} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Anime "system window" layer
// ---------------------------------------------------------------------------

/** The four clipped corner brackets that frame a system pane. */
export function CornerBrackets({ color, size = 14, inset = -1 }: {
  color?: string; size?: number; inset?: number;
}) {
  const { colors } = useTheme();
  const c = color || colors.sys;
  const base = { position: 'absolute' as const, width: size, height: size, borderColor: c };
  return (
    <>
      <View pointerEvents="none" style={[base, { top: inset, left: inset, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 }]} />
      <View pointerEvents="none" style={[base, { top: inset, right: inset, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 }]} />
      <View pointerEvents="none" style={[base, { bottom: inset, left: inset, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 }]} />
      <View pointerEvents="none" style={[base, { bottom: inset, right: inset, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 }]} />
    </>
  );
}

/** Faint horizontal scan lines. Purely decorative; never intercepts touches. */
export function ScanLines({ rows = 9, opacity = 0.05, color }: {
  rows?: number; opacity?: number; color?: string;
}) {
  const { colors } = useTheme();
  const c = color || colors.sys;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c, opacity }} />
      ))}
    </View>
  );
}

/**
 * A framed panel with a label on its top edge — the signature container.
 */
export function SystemWindow({ label, accent, children, style, scan = true, glow }: {
  label?: string;
  accent?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scan?: boolean;
  glow?: boolean;
}) {
  const { colors, shadows } = useTheme();
  const c = accent || colors.sys;

  return (
    <View style={[
      styles.sysWindow, 
      { 
        backgroundColor: colors.glass,
        borderColor: `${c}55` 
      }, 
      glow && { ...shadows.sysGlow, shadowColor: c }, 
      style
    ]}>
      {scan && <ScanLines color={c} />}
      <CornerBrackets color={c} />
      {label ? (
        <View style={[styles.sysLabelWrap, { backgroundColor: colors.bg2, borderColor: `${c}55` }]}>
          <Text style={[styles.sysLabel, { color: c }]}>{label}</Text>
        </View>
      ) : null}
      <View style={label ? { marginTop: 6 } : undefined}>{children}</View>
    </View>
  );
}

/** Difficulty chip for a quest: light / core / elite. */
export function TierBadge({ tier }: { tier: 'light' | 'core' | 'elite' }) {
  const { colors } = useTheme();
  const cfg = {
    light: { c: colors.xpa, t: 'LIGHT' },
    core: { c: colors.sys, t: 'CORE' },
    elite: { c: colors.crimson, t: 'ELITE' },
  }[tier];
  return (
    <View style={[styles.tierBadge, { borderColor: `${cfg.c}66`, backgroundColor: `${cfg.c}14` }]}>
      <Text style={[styles.tierText, { color: cfg.c }]}>{cfg.t}</Text>
    </View>
  );
}

/** Wide-tracked all-caps line used above titles. */
export function SystemLabel({ children, color, style }: {
  children: React.ReactNode; color?: string; style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const c = color || colors.sys;
  return <Text style={[styles.sysLabel, { color: c }, style]}>{children}</Text>;
}

/** A bar that reads as an energy gauge: notched track, glowing fill, cap tick. */
export function SystemBar({ pct, color, height = 10, label }: {
  pct: number; color?: string; height?: number; label?: string;
}) {
  const { colors } = useTheme();
  const c = color || colors.sys;
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View>
      {label ? <Text style={[styles.sysBarLabel, { color: c }]}>{label}</Text> : null}
      <View style={[styles.sysBarTrack, { backgroundColor: colors.bg, height, borderColor: `${c}44` }]}>
        <View style={[styles.sysBarFill, { width: `${w}%`, backgroundColor: c, shadowColor: c }]} />
        {/* notches */}
        <View pointerEvents="none" style={styles.sysBarNotches}>
          {Array.from({ length: 9 }, (_, i) => (
            <View key={i} style={{ width: StyleSheet.hairlineWidth, height: '100%', backgroundColor: colors.bg, opacity: 0.5 }} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
  },
  pad: { 
    paddingHorizontal: 16, 
    paddingTop: 12,
  },
  card: { 
    borderWidth: 1, 
    borderRadius: 6, 
    padding: 16, 
    marginVertical: 8,
  },
  cardGlow: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 0,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  pill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 999, 
    borderWidth: 1, 
  },
  pillText: { 
    fontSize: 12, 
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btn: { 
    borderRadius: 5, 
    paddingVertical: 14, 
    paddingHorizontal: 18, 
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnSmall: { 
    paddingVertical: 9, 
    paddingHorizontal: 14, 
    borderRadius: 4, 
    alignSelf: 'flex-start',
  },
  btnFull: {
    width: '100%',
  },
  btnDisabled: { 
    opacity: 0.5,
    transform: [{ scale: 0.98 }],
  },
  btnPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  btnText: { 
    fontWeight: '900', 
    fontSize: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  statRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    gap: 12,
  },
  statIcon: { 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  statName: { 
    fontWeight: '800', 
    fontSize: 15,
  },
  statDesc: { 
    fontSize: 12,
    marginTop: 2,
  },
  barTrack: { 
    overflow: 'hidden',
  },
  barFill: { 
    height: '100%',
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 24, 
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  sectionTitle: { 
    fontWeight: '900', 
    fontSize: 17,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderGlow: {
    padding: 24,
    borderRadius: 60,
  },

  // ---- system window layer ----
  sysWindow: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    paddingTop: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  sysLabelWrap: {
    position: 'absolute',
    top: -1,
    left: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  sysLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  tierBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  sysBarLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sysBarTrack: {
    borderWidth: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sysBarFill: {
    height: '100%',
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  sysBarNotches: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
});
