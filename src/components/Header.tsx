// Screen header, styled as a system readout: a tracked kicker line, a heavy
// title, and a hairline rule that fades out. Appears on every screen, so it
// carries most of the app-wide anime feel on its own.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../theme/icons';
import type { IconFamily } from '../theme/iconNames';
import { useTheme } from '../context/ThemeContext';

export function ScreenHeader({ icon, iconFamily, title, subtitle, accent }: {
  icon: string; iconFamily?: IconFamily; title: string; subtitle?: string; accent?: string;
}) {
  const { colors } = useTheme();
  const c = accent || colors.sys;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.kicker, { color: c }]}>System</Text>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { borderColor: `${c}66`, backgroundColor: `${c}12` }]}>
          <Icon name={icon} size={20} color={c} family={iconFamily} />
          {/* corner ticks */}
          <View style={[styles.tick, { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2, borderColor: c }]} />
          <View style={[styles.tick, { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderColor: c }]} />
        </View>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.mut }]}>{subtitle}</Text> : null}
      <View style={styles.ruleWrap}>
        <View style={[styles.rule, { backgroundColor: c }]} />
        <View style={[styles.ruleFade, { backgroundColor: `${c}22` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 14, paddingBottom: 10 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  tick: { position: 'absolute', width: 8, height: 8 },
  title: { fontWeight: '900', fontSize: 22, letterSpacing: 0.5 },
  subtitle: { fontSize: 12.5, marginTop: 8, lineHeight: 18 },
  ruleWrap: { flexDirection: 'row', marginTop: 12, height: 1 },
  rule: { width: 46, height: 1 },
  ruleFade: { flex: 1, height: 1 },
});
