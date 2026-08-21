import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useGame } from '../context/GameContext';
import { Icon } from '../theme/icons';
import { colors } from '../theme/colors';
import { CLASSES, ENGINE, macroTargets, defaultProfile, ACTIVITY_LABEL, GOAL_LABEL } from '../engine';
import type { BodyProfile, ActivityLevel, BodyGoal, Sex } from '../engine';

const SEXES: Sex[] = ['male', 'female', 'other'];
const ACTS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'athlete'];
const GOALS: BodyGoal[] = ['cut', 'recomp', 'bulk'];

// Class icon mapping (vector, not emoji)
const CLASS_ICON: Record<string, { name: string; family: 'ion' | 'mci' }> = {
  warrior: { name: 'shield', family: 'mci' },
  ranger: { name: 'bow-arrow', family: 'mci' },
  monk: { name: 'meditation', family: 'mci' },
  mage: { name: 'auto-fix', family: 'mci' },
  assassin: { name: 'knife', family: 'mci' },
  paladin: { name: 'sword-cross', family: 'mci' },
};

export default function OnboardingScreen() {
  const newGame = useGame(s => s.newGame);
  const mutate = useGame(s => s.mutate);
  const [step, setStep] = useState(0); // 0 = welcome, 1 = class select, 2 = body
  const [name, setName] = useState('');
  const [cls, setCls] = useState('warrior');
  const [body, setBody] = useState<BodyProfile>(defaultProfile());

  /**
   * Create the save, optionally with a body profile.
   *
   * The profile step is skippable, and skipping has to leave a genuinely
   * playable game -- so `withBody: false` just creates the character and the
   * whole nutrition pillar stays dormant until they fill it in from Plan.
   */
  function finish(withBody: boolean) {
    newGame(name.trim() || 'Adventurer', cls);
    if (withBody) {
      mutate(st => {
        st.body = ENGINE.sanitizeProfile({ ...body, updatedAt: ENGINE.dayKey() });
        if (st.body) ENGINE.logWeight(st, st.body.weightKg);
      });
    }
  }

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
              {([
                // Each row carries its own family: "sword" only exists in
                // MaterialCommunityIcons, and the Ionicons default renders a
                // blank box for it.
                { icon: 'sword', family: 'mci', label: 'Real workouts, real XP — earn power by training' },
                { icon: 'trophy', family: 'ion', label: 'Climb from F-rank to Monarch of Iron' },
                { icon: 'rocket', family: 'ion', label: 'Aura moments, loot, weekly trials & bouts' },
              ] as const).map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.gold + '1f' }]}>
                    <Icon name={f.icon} size={18} color={colors.gold} family={f.family} />
                  </View>
                  <Text style={styles.featureText}>{f.label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.primaryBtn}
              onPress={() => setStep(1)}
              accessibilityRole="button"
              accessibilityLabel="Get started"
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </Pressable>
          </>
        ) : step === 1 ? (
          <>
            <View style={styles.stepHeader}>
              <Pressable
                onPress={() => setStep(0)}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Icon name="chevron-back" size={22} color={colors.ink} />
              </Pressable>
              <Text style={styles.stepTitle}>Choose Your Class</Text>
              <View style={styles.stepSpacer} />
            </View>
            <Text style={styles.stepSub}>Each class shapes how you grow.</Text>

            <TextInput
              style={styles.input}
              accessibilityLabel="Adventurer name"
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
                  accessibilityRole="radio"
                  accessibilityLabel={`${c.name}. ${c.desc}`}
                  accessibilityState={{ selected }}
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
              onPress={() => setStep(2)}
              accessibilityRole="button"
              accessibilityLabel="Continue to body profile"
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.stepHeader}>
              <Pressable
                onPress={() => setStep(1)}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Icon name="chevron-back" size={22} color={colors.ink} />
              </Pressable>
              <Text style={styles.stepTitle}>Your Body</Text>
              <View style={styles.stepSpacer} />
            </View>
            <Text style={styles.stepSub}>
              So FORGE can work out how much you should eat. Stays on this device.
              You can skip this and set it later.
            </Text>

            <View style={styles.bodyRow}>
              <View style={styles.bodyField}>
                <Text style={styles.bodyLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.bodyInput}
                  keyboardType="numeric"
                  accessibilityLabel="Height in centimetres"
                  value={String(body.heightCm)}
                  onChangeText={t => {
                    const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                    setBody(b => ({ ...b, heightCm: isNaN(n) ? 0 : n }));
                  }}
                />
              </View>
              <View style={styles.bodyField}>
                <Text style={styles.bodyLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.bodyInput}
                  keyboardType="numeric"
                  accessibilityLabel="Weight in kilograms"
                  value={String(body.weightKg)}
                  onChangeText={t => {
                    const n = parseFloat(t.replace(/[^0-9.]/g, ''));
                    setBody(b => ({ ...b, weightKg: isNaN(n) ? 0 : n }));
                  }}
                />
              </View>
              <View style={styles.bodyField}>
                <Text style={styles.bodyLabel}>Age</Text>
                <TextInput
                  style={styles.bodyInput}
                  keyboardType="numeric"
                  accessibilityLabel="Age in years"
                  value={String(body.age)}
                  onChangeText={t => {
                    const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                    setBody(b => ({ ...b, age: isNaN(n) ? 0 : n }));
                  }}
                />
              </View>
            </View>

            <Text style={styles.bodyLabel}>Sex</Text>
            <View style={styles.chipWrap}>
              {SEXES.map(v => (
                <Pressable
                  key={v}
                  onPress={() => setBody(b => ({ ...b, sex: v }))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: body.sex === v }}
                  accessibilityLabel={v}
                  style={[styles.chip, body.sex === v && styles.chipOn]}
                >
                  <Text style={[styles.chipTxt, body.sex === v && styles.chipTxtOn]}>
                    {v[0].toUpperCase() + v.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.bodyNote}>Used only by the calorie formula.</Text>

            <Text style={styles.bodyLabel}>Activity level</Text>
            <View style={styles.chipWrap}>
              {ACTS.map(v => (
                <Pressable
                  key={v}
                  onPress={() => setBody(b => ({ ...b, activity: v }))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: body.activity === v }}
                  accessibilityLabel={ACTIVITY_LABEL[v]}
                  style={[styles.chip, body.activity === v && styles.chipOn]}
                >
                  <Text style={[styles.chipTxt, body.activity === v && styles.chipTxtOn]}>
                    {v[0].toUpperCase() + v.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.bodyNote}>{ACTIVITY_LABEL[body.activity]}</Text>

            <Text style={styles.bodyLabel}>Goal</Text>
            <View style={styles.chipWrap}>
              {GOALS.map(v => (
                <Pressable
                  key={v}
                  onPress={() => setBody(b => ({ ...b, goal: v }))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: body.goal === v }}
                  accessibilityLabel={GOAL_LABEL[v]}
                  style={[styles.chip, body.goal === v && styles.chipOn]}
                >
                  <Text style={[styles.chipTxt, body.goal === v && styles.chipTxtOn]}>
                    {GOAL_LABEL[v]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Your daily target</Text>
              <Text style={styles.previewVal}>
                {macroTargets(body)?.kcal ?? '—'} kcal · {macroTargets(body)?.protein ?? '—'}g protein
              </Text>
            </View>

            <Pressable
              style={[styles.primaryBtn, { marginTop: 4 }]}
              onPress={() => finish(true)}
              accessibilityRole="button"
              accessibilityLabel="Begin the Forge"
            >
              <Text style={styles.primaryBtnText}>Begin the Forge</Text>
            </Pressable>

            <Pressable
              style={styles.skipBtn}
              onPress={() => finish(false)}
              accessibilityRole="button"
              accessibilityLabel="Skip body profile and begin"
            >
              <Text style={styles.skipTxt}>Skip for now</Text>
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
  bodyRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  bodyField: { flex: 1 },
  bodyLabel: { color: colors.mut, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  bodyInput: { backgroundColor: colors.bg2, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, color: colors.ink, fontSize: 17, fontWeight: '800', borderWidth: 1, borderColor: colors.sysFaint },
  bodyNote: { color: colors.mut3, fontSize: 10.5, lineHeight: 15, marginTop: 6, marginBottom: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.mut3 },
  chipOn: { backgroundColor: colors.sysDeep, borderColor: colors.sys },
  chipTxt: { color: colors.mut, fontSize: 11.5, fontWeight: '700' },
  chipTxtOn: { color: colors.sys },
  previewBox: { backgroundColor: colors.bg2, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.sysFaint },
  previewLabel: { color: colors.mut2, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  previewVal: { color: colors.sys, fontSize: 15, fontWeight: '900', marginTop: 4 },
  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipTxt: { color: colors.mut2, fontSize: 13, fontWeight: '700' },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 13, color: colors.ink, marginBottom: 14 },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 10 },
  classIcon: { width: 50, height: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  className: { fontWeight: '900', fontSize: 16 },
  classDesc: { color: colors.mut, fontSize: 12, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.mut2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
});
