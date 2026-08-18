// Aura celebration overlay (in-app visual feedback).
//
// This is the app's biggest anime moment: the screen is taken over by an aura
// loop, a system window snaps open over it, and the headline scales in. Kept
// to Animated + Image so there is no native animation dependency.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Modal, Easing, Image, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

// Aura backgrounds per celebration type.
const AURA_BG: Record<string, any> = {
  LEVEL: require('../../assets/mc/a_levelup.gif'),
  RANK: require('../../assets/mc/a_rankup.gif'),
  BOSS: require('../../assets/mc/a_boss.gif'),
  LEGEND: require('../../assets/mc/a_legend.gif'),
  STREAK: require('../../assets/mc/a_streak.gif'),
};

// Full-screen aura celebration for level-ups, rank-ups, boss kills, streaks.
export function AuraOverlay({ visible, title, subtitle, big, accent, onClose }: {
  visible: boolean; title: string; subtitle?: string; big: string; accent?: string; onClose?: () => void;
}) {
  const zoom = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const c = accent || colors.sys;

  useEffect(() => {
    if (!visible) return;
    zoom.setValue(0); fade.setValue(0); sweep.setValue(0);
    Animated.parallel([
      Animated.timing(zoom, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      // A light sweep that crosses the panel once as it opens.
      Animated.timing(sweep, { toValue: 1, duration: 900, delay: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
    // Slow breathing glow underneath, runs while the overlay is up.
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    loop.start();
    if (Haptics.notificationAsync) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return () => loop.stop();
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.auraBg} onPress={onClose}>
        <Image source={AURA_BG[bigType(title)] || AURA_BG.LEVEL} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {/* Scrim: the GIFs are bright, and the headline has to stay readable. */}
        <View style={[StyleSheet.absoluteFill, s.scrim]} />

        <Animated.View
          style={[
            s.panel,
            {
              borderColor: `${c}88`,
              shadowColor: c,
              opacity: fade,
              transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
            },
          ]}
        >
          {/* corner brackets */}
          <View style={[s.corner, { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3, borderColor: c }]} />
          <View style={[s.corner, { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3, borderColor: c }]} />
          <View style={[s.corner, { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: c }]} />
          <View style={[s.corner, { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3, borderColor: c }]} />

          {/* glow wash */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: c, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.1] }) },
            ]}
          />

          {/* sweep */}
          <Animated.View
            pointerEvents="none"
            style={[
              s.sweep,
              {
                backgroundColor: c,
                opacity: sweep.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.35, 0] }),
                transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-220, 220] }) }, { rotate: '18deg' }],
              },
            ]}
          />

          <Text style={[s.kicker, { color: c }]}>{title}</Text>
          <View style={[s.rule, { backgroundColor: `${c}55` }]} />
          <Text style={[s.big, { color: c, textShadowColor: c }]}>{big}</Text>
          {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
          {onClose ? <Text style={s.tap}>Tap to continue</Text> : null}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// Map celebration title -> aura type for background selection.
export function bigType(title: string): string {
  if (/LEGEND|MONARCH|AWAKEN/i.test(title)) return 'LEGEND';
  if (/STREAK|FLAME|CONSISTEN/i.test(title)) return 'STREAK';
  if (/RANK|PROMOTE/i.test(title)) return 'RANK';
  if (/BOSS|SLAIN|VICTORY/i.test(title)) return 'BOSS';
  return 'LEVEL';
}

const s = StyleSheet.create({
  auraBg: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scrim: { backgroundColor: 'rgba(4,5,12,0.62)' },
  panel: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 30,
    marginHorizontal: 26,
    minWidth: 280,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(8,10,22,0.82)',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 12,
  },
  corner: { position: 'absolute', width: 18, height: 18 },
  sweep: { position: 'absolute', top: -60, bottom: -60, width: 60 },
  kicker: { fontSize: 11, letterSpacing: 4, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' },
  rule: { height: 1, alignSelf: 'stretch', marginVertical: 14 },
  big: {
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  sub: { fontSize: 14, color: colors.ink2, marginTop: 12, textAlign: 'center', fontWeight: '600', lineHeight: 20 },
  tap: { color: colors.mut, marginTop: 22, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
});
