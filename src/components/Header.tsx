// Professional screen header with a vector icon + title + optional subtitle.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../theme/icons';
import { colors } from '../theme/colors';

export function ScreenHeader({ icon, title, subtitle, accent }: {
  icon: string; title: string; subtitle?: string; accent?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: (accent || colors.mana) + '22' }]}>
          <Icon name={icon} size={20} color={accent || colors.mana} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontWeight: '900', fontSize: 22 },
  subtitle: { color: colors.mut, fontSize: 13, marginTop: 6 },
});
