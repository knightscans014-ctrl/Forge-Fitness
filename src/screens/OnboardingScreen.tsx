import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useGame } from '../context/GameContext';
import { Btn } from '../components/ui';
import { colors } from '../theme/colors';
import { CLASSES } from '../engine';

export default function OnboardingScreen() {
  const newGame = useGame(s => s.newGame);
  const [name, setName] = useState('');
  const [cls, setCls] = useState('warrior');

  return (
    <KeyboardAvoidingView style={s.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner}>
        <Text style={s.logo}>⚔️</Text>
        <Text style={s.title}>FORGE</Text>
        <Text style={s.sub}>Gamified Fitness RPG — turn your training into a legend.</Text>

        <TextInput style={s.input} placeholder="Adventurer name..." placeholderTextColor={colors.mut2} maxLength={18} value={name} onChangeText={setName} />

        <Text style={s.label}>CHOOSE YOUR CLASS</Text>
        {CLASSES.map(c => (
          <Pressable key={c.id} onPress={() => setCls(c.id)} style={[s.class, cls === c.id && s.classSel]}>
            <View style={[s.ci, { backgroundColor: `${c.color}22` }]}><Text style={{ fontSize: 26 }}>{c.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cn, { color: c.color }]}>{c.name}</Text>
              <Text style={s.cd}>{c.desc}</Text>
            </View>
          </Pressable>
        ))}

        <View style={{ height: 12 }} />
        <Btn title="Begin the Forge" onPress={() => newGame(name.trim() || 'Adventurer', cls)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  inner: { padding: 20, paddingBottom: 60, alignItems: 'center' },
  logo: { fontSize: 44, marginTop: 30 },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: 1 },
  sub: { color: colors.mut, textAlign: 'center', marginBottom: 18 },
  input: { width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 13, color: colors.ink, marginVertical: 8 },
  label: { color: colors.mut, fontSize: 12, fontWeight: '700', alignSelf: 'flex-start', marginTop: 14 },
  class: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line, borderRadius: 18, padding: 14, marginTop: 10 },
  classSel: { borderColor: colors.accent2, backgroundColor: 'rgba(255,138,92,0.07)' },
  ci: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cn: { fontWeight: '900', fontSize: 15 },
  cd: { color: colors.mut, fontSize: 12 },
});
