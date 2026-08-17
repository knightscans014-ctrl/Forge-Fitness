// Premium reusable UI primitives with modern design
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { colors, shadows } from '../theme/colors';
import { Icon, type IconFamily } from '../theme/icons';

export function Card({ children, style, border, glow, onPress }: { 
  children: React.ReactNode; 
  style?: any; 
  border?: string; 
  glow?: boolean;
  onPress?: () => void;
}) {
  const cardStyle = [
    styles.card, 
    border ? { borderColor: border } : null, 
    glow && styles.cardGlow,
    style
  ];
  
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [
        cardStyle, 
        pressed && styles.cardPressed
      ]}>
        {children}
      </Pressable>
    );
  }
  
  return <View style={cardStyle}>{children}</View>;
}

export function Screen({ children, scroll = true, gradient }: { 
  children: React.ReactNode; 
  scroll?: boolean;
  gradient?: boolean;
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
  fullWidth
}: {
  title: string; 
  onPress: () => void; 
  kind?: 'primary' | 'ghost' | 'gold' | 'green' | 'danger' | 'mana';
  small?: boolean; 
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
}) {
  const bg = kind === 'gold' ? colors.gold 
    : kind === 'green' ? colors.success 
    : kind === 'danger' ? colors.danger 
    : kind === 'mana' ? colors.mana 
    : kind === 'ghost' ? colors.card2 
    : colors.accent2;
  
  const fg = kind === 'gold' ? '#231500' 
    : kind === 'green' ? '#06281a' 
    : kind === 'mana' ? '#fff'
    : kind === 'ghost' ? colors.ink 
    : '#fff';
    
  return (
    <Pressable 
      onPress={onPress} 
      disabled={disabled} 
      style={({ pressed }) => [
        styles.btn, 
        { backgroundColor: bg }, 
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

export function GradientBar({ pct, colors: gradientColors, height = 8 }: { 
  pct: number; 
  colors: string[];
  height?: number;
}) {
  return (
    <View style={[styles.barTrack, { height, borderRadius: height / 2, backgroundColor: colors.card3 }]}>
      <View style={[
        styles.barFillGradient, 
        { 
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: '100%',
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
        <ActivityIndicator size="large" color={colors.gold} />
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
    borderColor: colors.line, 
    borderRadius: 20, 
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
    borderRadius: 16, 
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
    borderRadius: 12, 
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
    fontSize: 15,
    letterSpacing: 0.3,
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
  barFillGradient: {
    // Note: For actual gradients, use react-native-linear-gradient
    backgroundColor: colors.gold,
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
    ...shadows.glow,
  },
});
