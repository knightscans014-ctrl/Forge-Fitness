import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { Icon } from '../theme/icons';
import { colors } from '../theme/colors';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true); setError(null);
    if (mode === 'login') {
      const res = await auth.emailSignIn(email, password);
      if (res.error) setError(res.error);
    } else {
      const res = await auth.emailSignUp(email, password, name);
      if (res.error) setError(res.error);
      else { setError('Check your inbox to confirm your email.'); }
    }
    setLoading(false);
  }

  async function google() {
    setLoading(true); setError(null);
    const res = await auth.googleSignIn();
    if (res.error) setError(res.error);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          <View style={styles.logoMark}>
            <Icon name="shield-half-full" size={40} color="#fff" family="mci" />
          </View>
          <Text style={styles.logo}>FORGE</Text>
          <Text style={styles.tagline}>Continue your legend</Text>
        </View>

        {/* Mode tabs */}
        <View style={styles.modeRow}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <Pressable key={m} onPress={() => { setMode(m); setError(null); }} style={[styles.modeTab, mode === m && styles.modeTabActive]}>
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m === 'login' ? 'Sign In' : 'Create Account'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          {mode === 'signup' ? (
            <View style={styles.inputWrap}>
              <Icon name="person" size={18} color={colors.mut2} />
              <TextInput style={styles.input} placeholder="Display name" placeholderTextColor={colors.mut2} value={name} onChangeText={setName} />
            </View>
          ) : null}
          <View style={styles.inputWrap}>
            <Icon name="mail" size={18} color={colors.mut2} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.mut2} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View style={styles.inputWrap}>
            <Icon name="lock-closed" size={18} color={colors.mut2} />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.mut2} value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryBtn} onPress={submit} disabled={loading}>
            <Text style={styles.primaryBtnText}>{loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Pressable style={styles.googleBtn} onPress={google} disabled={loading}>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: { padding: 24, paddingBottom: 40, justifyContent: 'center', flexGrow: 1 },
  brandWrap: { alignItems: 'center', marginBottom: 30 },
  logoMark: { width: 84, height: 84, borderRadius: 24, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logo: { fontSize: 36, fontWeight: '900', color: colors.ink, letterSpacing: 5 },
  tagline: { color: colors.mut, fontSize: 14, marginTop: 6 },
  modeRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 4, marginBottom: 20 },
  modeTab: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  modeTabActive: { backgroundColor: colors.card2 },
  modeText: { color: colors.mut, fontWeight: '700' },
  modeTextActive: { color: colors.ink },
  form: { gap: 12 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 14 },
  input: { flex: 1, color: colors.ink, paddingVertical: 14, fontSize: 15 },
  error: { color: colors.hp, fontSize: 13, textAlign: 'center' },
  primaryBtn: { backgroundColor: colors.accent2, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  divider: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { color: colors.mut2, fontSize: 12 },
  googleBtn: { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  googleBtnText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  terms: { color: colors.mut2, fontSize: 11, textAlign: 'center', marginTop: 24 },
});
