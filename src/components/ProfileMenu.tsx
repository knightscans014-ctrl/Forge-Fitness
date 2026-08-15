// Profile menu: shows signed-in user, sign out.
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { Icon } from '../theme/icons';
import { Btn } from './ui';
import { colors } from '../theme/colors';

export function ProfileMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const auth = useAuth();
  const user = auth.auth.status === 'signedIn' ? auth.auth.user : null;
  const resetGame = useGame(s => s.newGame);

  async function handleSignOut() {
    await auth.signOut();
    onClose();
  }
  function handleReset() {
    resetGame('Adventurer', 'warrior');
    onClose();
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.bg}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Icon name="person" size={26} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name || 'Adventurer'}</Text>
              <Text style={styles.email}>{user?.email || 'Signed in'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.close}>
              <Icon name="close" size={22} color={colors.mut} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Account</Text>
          <Text style={styles.meta}>Sign-in: {user?.provider === 'google' ? 'Google' : 'Email'}</Text>

          <Btn kind="danger" title="Sign Out" onPress={handleSignOut} />
          <View style={{ height: 8 }} />
          <Btn kind="ghost" title="Reset Character" onPress={handleReset} />
          <View style={{ height: 8 }} />
          <Btn kind="ghost" title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(4,5,10,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg2, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  email: { color: colors.mut, fontSize: 13 },
  close: { padding: 4 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 16 },
  label: { color: colors.mut, fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  meta: { color: colors.ink, fontSize: 14, marginTop: 6 },
});
