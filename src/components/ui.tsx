// Small reusable UI primitives.
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

export function Card({ children, style, border }: { children: React.ReactNode; style?: any; border?: string }) {
  return <View style={[styles.card, border ? { borderColor: border } : null, style]}>{children}</View>;
}
export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const content = <View style={styles.pad}>{children}</View>;
  if (!scroll) return <View style={styles.screen}>{content}</View>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 120 }}>
      {content}
    </ScrollView>
  );
}
export function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <View style={[styles.pill, color ? { borderColor: color } : null]}>
      <Text style={[styles.pillText, color ? { color } : null]}>{children}</Text>
    </View>
  );
}
export function Btn({ title, onPress, kind = 'primary', small, disabled }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'gold' | 'green' | 'danger'; small?: boolean; disabled?: boolean;
}) {
  const bg = kind === 'gold' ? '#ffd166' : kind === 'green' ? '#37e08a' : kind === 'danger' ? '#e0344c' : kind === 'ghost' ? colors.card2 : '#ff8a5c';
  const fg = kind === 'gold' ? '#231500' : kind === 'green' ? '#06281a' : kind === 'ghost' ? colors.ink : '#fff';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.btn, { backgroundColor: bg }, small && styles.btnSmall, disabled && styles.btnDisabled]}>
      <Text style={[styles.btnText, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>
    </Pressable>
  );
}
export function StatRow({ icon, iconBg, name, desc, right }: { icon: string; iconBg?: string; name: string; desc?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: iconBg || colors.card2 }]}>
        <Text style={{ fontSize: 19 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statName}>{name}</Text>
        {desc ? <Text style={styles.statDesc}>{desc}</Text> : null}
      </View>
      {right}
    </View>
  );
}
export function Bar({ pct, color }: { pct: number; color?: string }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color || colors.gold }]} />
    </View>
  );
}
export function Loader() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 16, paddingTop: 12 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, marginVertical: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line },
  pillText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  btn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 11, alignSelf: 'flex-start' },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontWeight: '800', fontSize: 15 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statName: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  statDesc: { color: colors.mut, fontSize: 11.5 },
  barTrack: { height: 8, borderRadius: 99, backgroundColor: '#1a1e36', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99 },
});
