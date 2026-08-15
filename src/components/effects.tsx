// Aura celebration overlay + toast notifications (in-app visual feedback).

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Modal, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

// Full-screen aura celebration for level-ups, rank-ups, boss kills.
export function AuraOverlay({ visible, title, subtitle, big, accent, onClose }: {
  visible: boolean; title: string; subtitle?: string; big: string; accent?: string; onClose?: () => void;
}) {
  const zoom = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      zoom.setValue(0); fade.setValue(0);
      Animated.parallel([
        Animated.timing(zoom, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      if (Haptics.notificationAsync) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[s.auraBg, { backgroundColor: accent || colors.mana }]}>
        <Animated.View style={[s.auraInner, { opacity: fade, transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
          <Text style={s.up}>{title}</Text>
          <Text style={[s.big, { color: accent || colors.gold }]}>{big}</Text>
          {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
          {onClose ? <Text style={s.tap} onPress={onClose}>Tap to continue</Text> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  auraBg: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.95 },
  auraInner: { alignItems: 'center', padding: 30 },
  up: { fontSize: 15, letterSpacing: 5, color: '#fff', fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' },
  big: { fontSize: 38, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  sub: { fontSize: 15, color: '#fff', marginTop: 10, textAlign: 'center', fontWeight: '600' },
  tap: { color: '#fff', marginTop: 20, fontSize: 13, fontWeight: '700', opacity: 0.9 },
});
