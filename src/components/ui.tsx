// Premium reusable UI primitives with modern design
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors, shadows } from '../theme/colors';
import { Icon, type IconFamily } from '../theme/icons';

export function Card({ children, style, border, glow, onPress, accessibilityLabel }: { 
  children: React.ReactNode; 
  style?: any; 
  border?: string; 
  glow?: boolean;
  onPress?: () => void;
  // A tappable Card has no inherent text of its own, so callers that make one
  // interactive should say what it does.
  accessibilityLabel?: string;
}) {
  const cardStyle = [
    styles.card, 
    border ? { borderColor: border } : null, 
    glow && styles.cardGlow,
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
  const content = <View style={styles.pad}>{children}</View>;
  if (!scroll) return <View style={styles.screen}>{content}</View>;
  return (
    <ScrollView 
      style={styles.screen} 
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
  return (
    <View style={[
      styles.pill, 
      color ? { 
        borderColor: color,
        backgroundColor: filled ? color + '15' : undefined
      } : null
    ]}>
      <Text style={[styles.pillText, color ? { color } : null]}>{children}</Text>
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
  // Defaults to `title`. Override when the visible text is not enough on its
  // own -- e.g. a bare "Claim" that needs "Claim daily reward".
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
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

  // Ghost reads as an empty system frame; solid kinds get a matching glow.
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
      // Screen readers announce a dimmed button as unavailable rather than
      // letting the user activate it and wonder why nothing happened.
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
  return (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: iconBg || colors.card3 }]}>
        <Icon name={icon} size={20} color={colors.ink} family={iconFamily} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statName}>{name}</Text>
        {desc ? <Text style={styles.statDesc}>{desc}</Text> : null}
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
  return (
    <View style={[styles.barTrack, { height, borderRadius: height / 2 }]}>
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
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <Icon name={icon} size={18} color={colors.gold} family="ion" />}
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
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
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={48} color={colors.mut3} family="ion" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action && <View style={{ marginTop: 16 }}>{action}</View>}
    </View>
  );
}

export function Loader() {
  return (
    <View style={styles.loaderContainer}>
      <View style={styles.loaderGlow}>
        <ActivityIndicator size="large" color={colors.sys} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Anime "system window" layer
//
// The look these build toward is the status panel from a levelling-system
// anime: a translucent cyan-edged pane with clipped corners, a small tracked
// label riding on the top edge, and a glow. Everything below is composed from
// plain Views so there is no gradient/blur/SVG dependency.
// ---------------------------------------------------------------------------

/** The four clipped corner brackets that frame a system pane. */
export function CornerBrackets({ color = colors.sys, size = 14, inset = -1 }: {
  color?: string; size?: number; inset?: number;
}) {
  const base = { position: 'absolute' as const, width: size, height: size, borderColor: color };
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
export function ScanLines({ rows = 9, opacity = 0.05, color = colors.sys }: {
  rows?: number; opacity?: number; color?: string;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color, opacity }} />
      ))}
    </View>
  );
}

/**
 * A framed panel with a label on its top edge — the signature container.
 * `accent` recolours the whole frame, so a rank aura or a danger red can drive
 * it without a second component.
 */
export function SystemWindow({ label, accent = colors.sys, children, style, scan = true, glow }: {
  label?: string;
  accent?: string;
  children: React.ReactNode;
  style?: any;
  scan?: boolean;
  glow?: boolean;
}) {
  return (
      <View style={[styles.sysWindow, { borderColor: `${accent}55` }, glow && { ...shadows.sysGlow, shadowColor: accent }, style]}>
      {scan && <ScanLines color={accent} />}
      <CornerBrackets color={accent} />
      {label ? (
        <View style={[styles.sysLabelWrap, { borderColor: `${accent}55` }]}>
          <Text style={[styles.sysLabel, { color: accent }]}>{label}</Text>
        </View>
      ) : null}
      <View style={label ? { marginTop: 6 } : undefined}>{children}</View>
    </View>
  );
}

/** Difficulty chip for a quest: light / core / elite. */
export function TierBadge({ tier }: { tier: 'light' | 'core' | 'elite' }) {
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
export function SystemLabel({ children, color = colors.sys, style }: {
  children: React.ReactNode; color?: string; style?: any;
}) {
  return <Text style={[styles.sysLabel, { color }, style]}>{children}</Text>;
}

/** A bar that reads as an energy gauge: notched track, glowing fill, cap tick. */
export function SystemBar({ pct, color = colors.sys, height = 10, label }: {
  pct: number; color?: string; height?: number; label?: string;
}) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View>
      {label ? <Text style={[styles.sysBarLabel, { color }]}>{label}</Text> : null}
      <View style={[styles.sysBarTrack, { height, borderColor: `${color}44` }]}>
        <View style={[styles.sysBarFill, { width: `${w}%`, backgroundColor: color, shadowColor: color }]} />
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
    backgroundColor: colors.bg,
  },
  pad: { 
    paddingHorizontal: 16, 
    paddingTop: 12,
  },
  card: { 
    backgroundColor: colors.card, 
    borderWidth: 1, 
    borderColor: colors.sysFaint, 
    borderRadius: 6, 
    padding: 16, 
    marginVertical: 8,
    ...shadows.sm,
  },
  cardGlow: {
    borderColor: colors.gold,
    ...shadows.glow,
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
    backgroundColor: colors.card2, 
    borderWidth: 1, 
    borderColor: colors.line,
  },
  pillText: { 
    color: colors.ink, 
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
    ...shadows.md,
  },
  btnSmall: { 
    paddingVertical: 9, 
    paddingHorizontal: 14, 
    borderRadius: 4, 
    alignSelf: 'flex-start',
    ...shadows.sm,
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
    borderBottomColor: colors.line, 
    gap: 12,
  },
  statIcon: { 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: colors.card3,
  },
  statName: { 
    color: colors.ink, 
    fontWeight: '800', 
    fontSize: 15,
  },
  statDesc: { 
    color: colors.mut, 
    fontSize: 12,
    marginTop: 2,
  },
  barTrack: { 
    backgroundColor: colors.card3, 
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
    borderBottomColor: colors.line,
  },
  sectionTitle: { 
    color: colors.ink, 
    fontWeight: '900', 
    fontSize: 17,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    color: colors.mut,
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
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadows.sm,
  },
  emptyTitle: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    color: colors.mut,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  loaderGlow: {
    padding: 24,
    borderRadius: 60,
    backgroundColor: colors.card2,
    ...shadows.sysGlow,
  },

  // ---- system window layer ----
  sysWindow: {
    backgroundColor: colors.glass,
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
    backgroundColor: colors.bg2,
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
    backgroundColor: colors.bg,
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
