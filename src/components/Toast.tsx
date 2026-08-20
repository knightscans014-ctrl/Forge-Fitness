// Toast notification component — displays the latest message.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useGame } from '../context/GameContext';

export function ToastHost() {
  const notifications = useGame(s => s.notifications);
  const [msg, setMsg] = useState<string | null>(null);
  // useRef, not a bare `new Animated.Value(0)`: a fresh value on every render
  // means the animation drives one instance while the rendered view is bound
  // to another, so the toast never actually fades.
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notifications.length === 0) return;
    const last = notifications[notifications.length - 1];
    setMsg(last);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setMsg(null));
    // Depends on the count, not the array: `notify` pushes onto the list, so a
    // new message always changes the length, and re-running on identity alone
    // would restart the fade on unrelated store updates.
  }, [notifications.length, notifications, opacity]);

  if (!msg) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>{msg}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#1c2038', borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, alignItems: 'center' },
  text: { color: colors.ink, fontWeight: '700', fontSize: 13.5, textAlign: 'center' },
});
