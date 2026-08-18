import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Image } from 'react-native';
import { useGame } from '../context/GameContext';
import { Icon } from '../theme/icons';
import { colors } from '../theme/colors';
import { CLASSES } from '../engine';

// Class icon mapping (vector, not emoji)
const CLASS_ICON: Record<string, { name: string; family: 'ion' | 'mci' }> = {
  warrior: { name: 'shield', family: 'mci' },
  ranger: { name: 'bow-arrow', family: 'ion' },
  monk: { name: 'meditation', family: 'mci' },
  mage: { name: 'auto-fix', family: 'ion' },
  assassin: { name: 'knife', family: 'mci' },
  paladin: { name: 'sword-cross', family: 'mci' },
};

export default function OnboardingScreen() {
  const newGame = useGame(s => s.newGame);
  const [step, setStep] = useState(0); // 0 = welcome, 1 = class select
  const [name, setName] = useState('');
  const [cls, setCls] = useState('warrior');

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {step === 0 ? (
          <>
            {/* Splash / welcome */}
            <View style={styles.logoWrap}>
              <View style={styles.logoMark}>
                <Icon name="shield-half-full" size={46} color="#fff" family="mci" />
              </View>
              <Text style={styles.logoText}>FORGE</Text>
            </View>
            <Text style={styles.tagline}>Turn your training into a legend.</Text>

            <View style={styles.featureList}>
              {[
                { icon: 'sword', label: 'Real workouts, real XP — earn power by training' },
                { icon: 'trophy', label: 'Climb from F-rank to Monarch of Iron' },
                { icon: 'rocket', label: 'Aura moments, loot, weekly trials & bouts' },
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.gold + '1f' }]}>
                    <Icon name={f.icon} size={18} color={colors.gold} family={f.icon === 'trophy' ? 'ion' : 'ion'} />
                  </View>
                  <Text style={styles.featureText}>{f.label}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.primaryBtn} onPress={() => setStep(1)}>
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.stepHeader}>
              <Pressable onPress={() => setStep(0)} style={styles.backBtn}>
                <Icon name="chevron-back" size={22} color={colors.ink} />
              </Pressable>
              <Text style={styles.stepTitle}>Choose Your Class</Text>
              <View style={styles.stepSpacer} />
            </View>
            <Text style={styles.stepSub}>Each class shapes how you grow.</Text>

            <TextInput
              style={styles.input}
              placeholder="Adventurer name"
              placeholderTextColor={colors.mut2}
              maxLength={18}
              value={name}
              onChangeText={setName}
            />

            {CLASSES.map(c => {
              const icon = CLASS_ICON[c.id] || { name: 'help', family: 'ion' };
              const selected = cls === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCls(c.id)}
                  style={[styles.classCard, selected && { borderColor: c.color, backgroundColor: c.color + '0d' }]}
                >
                  <View style={[styles.classIcon, { backgroundColor: c.color + '22' }]}>
                    <Icon name={icon.name} size={26} color={c.color} family={icon.family} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.className, { color: c.color }]}>{c.name}</Text>
                    <Text style={styles.classDesc}>{c.desc}</Text>
                  </View>
                  <View style={[styles.radio, selected && { borderColor: c.color, backgroundColor: c.color }]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              style={[styles.primaryBtn, { marginTop: 16 }]}
              onPress={() => newGame(name.trim() || 'Adventurer', cls)}
            >
              <Text style={styles.primaryBtnText}>Begin the Forge</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: { padding: 24, paddingBottom: 60, flexGrow: 1, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 6 },
  logoMark: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.gold, marginBottom: 16 },
  logoText: { fontSize: 38, fontWeight: '900', color: colors.ink, letterSpacing: 6 },
  tagline: { color: colors.mut, textAlign: 'center', fontSize: 16, marginBottom: 28 },
  featureList: { gap: 16, marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  featureText: { color: colors.ink, fontSize: 14, flex: 1 },
  primaryBtn: { backgroundColor: colors.accent2, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { color: colors.ink, fontWeight: '900', fontSize: 20 },
  stepSpacer: { width: 36 },
  stepSub: { color: colors.mut, fontSize: 13, marginBottom: 14 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 13, color: colors.ink, marginBottom: 14 },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 10 },
  classIcon: { width: 50, height: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  className: { fontWeight: '900', fontSize: 16 },
  classDesc: { color: colors.mut, fontSize: 12, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.mut2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
});
