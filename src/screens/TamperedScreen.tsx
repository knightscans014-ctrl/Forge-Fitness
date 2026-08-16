// Shown when the app detects a tampered / re-signed APK (invalid signature)
// or a blocked environment. Refuses to run — protects server-authority features.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../theme/icons';
import { colors } from '../theme/colors';
import { TamperSignal } from '../services/hardening';

export default function TamperedScreen({ signals }: { signals: TamperSignal }) {
  return (
    <View style={styles.screen}>
      <View style={styles.iconWrap}>
        <Icon name="shield-alert" size={52} color={colors.hp} family="mci" />
      </View>
      <Text style={styles.title}>Security Check Failed</Text>
      <Text style={styles.sub}>This version of FORGE appears to be modified.</Text>
      <Text style={styles.detail}>
        For your safety, the app can't run on a tampered or unsigned copy.
        Please download the official APK from the FORGE website.
      </Text>
      {signals.isRooted ? <Text style={styles.warn}>⚠ Rooted device detected</Text> : null}
      {signals.isEmulator ? <Text style={styles.warn}>⚠ Emulator detected</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.hp + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { color: colors.ink, fontWeight: '900', fontSize: 22, textAlign: 'center' },
  sub: { color: colors.mut, fontSize: 15, textAlign: 'center', marginTop: 8 },
  detail: { color: colors.mut2, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  warn: { color: colors.hp, fontSize: 13, fontWeight: '700', marginTop: 16, textAlign: 'center' },
});
