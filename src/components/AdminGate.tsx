// Invisible admin gate.
// Wrap any element with this to add a stealth trigger: tapping it 5 times in a
// row (2s) opens a hidden code prompt. Entering the admin secret + being the
// owner navigates to the admin panel. Nothing indicates this exists in the UI.

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../theme/icons';
import { Btn } from './ui';
import { colors } from '../theme/colors';
import { checkAdminCode, isOwnerEmail } from '../services/adminAccess';

const TAPS_REQUIRED = 5;
const WINDOW_MS = 2000;

export function AdminGate({ children, style }: { children: React.ReactNode; style?: any }) {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const taps = useRef<number[]>([]);

  const user = auth.auth.status === 'signedIn' ? auth.auth.user : null;

  function onTap() {
    const now = Date.now();
    taps.current = [...taps.current.filter(t => now - t < WINDOW_MS), now];
    if (taps.current.length >= TAPS_REQUIRED) {
      taps.current = [];
      // Owner check first (silently denies if not owner).
      if (!isOwnerEmail(user?.email)) return;
      setShowCode(true);
    }
  }

  function submit() {
    if (checkAdminCode(code.trim())) {
      setShowCode(false);
      setCode('');
      navigation.navigate('Admin');
    } else {
      setShowCode(false);
      setCode('');
    }
  }

  return (
    <>
      <Pressable onPress={onTap} style={style} delayLongPress={0}>
        {children}
      </Pressable>
      <Modal transparent visible={showCode} animationType="fade" onRequestClose={() => setShowCode(false)}>
        <View style={styles.bg}>
          <View style={styles.dialog}>
            <Text style={styles.title}>Access</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter code"
              placeholderTextColor={colors.mut2}
              secureTextEntry
              autoCapitalize="none"
              value={code}
              onChangeText={setCode}
              onSubmitEditing={submit}
            />
            <View style={{ height: 12 }} />
            <Btn title="Enter" onPress={submit} />
            <View style={{ height: 8 }} />
            <Btn kind="ghost" title="Cancel" onPress={() => setShowCode(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(4,5,10,0.7)', alignItems: 'center', justifyContent: 'center' },
  dialog: { backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 22, width: '82%', maxWidth: 340 },
  title: { color: colors.ink, fontWeight: '900', fontSize: 20, textAlign: 'center', marginBottom: 12 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 13, color: colors.ink },
});
