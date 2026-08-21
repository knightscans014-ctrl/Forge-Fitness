// Plan tab — the body/nutrition/training pillar.
//
// Body: profile, computed targets, and the weight log.
// Nutrition: today's intake, the meal log, and offline food search.
// Training lands here next.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Pill, Btn, Bar, SystemLabel, EmptyState } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import NutritionPanel from '../components/NutritionPanel';
import { Screen } from '../components/ui';
import { colors } from '../theme/colors';
import {
  ENGINE, bmr, tdee, macroTargets, bmi, bmiBand,
  defaultProfile, weightTrend, currentWeight, goalProgress,
  ACTIVITY_LABEL, GOAL_LABEL,
} from '../engine';
import type { BodyProfile, ActivityLevel, BodyGoal, Sex } from '../engine';

const SEXES: Sex[] = ['male', 'female', 'other'];
const ACTS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'athlete'];
const GOALS: BodyGoal[] = ['cut', 'recomp', 'bulk'];

/** A labelled number field with -/+ steppers, so it works without a keyboard. */
function NumField({ label, value, unit, step = 1, min, max, onChange }: {
  label: string; value: number; unit: string; step?: number;
  min: number; max: number; onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.stepRow}>
        <Pressable
          style={s.stepBtn}
          onPress={() => onChange(clamp(Math.round((value - step) * 10) / 10))}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text style={s.stepTxt}>−</Text>
        </Pressable>
        <View style={s.valBox}>
          <TextInput
            style={s.valInput}
            value={String(value)}
            keyboardType="numeric"
            onChangeText={t => {
              const n = parseFloat(t.replace(/[^0-9.]/g, ''));
              if (!isNaN(n)) onChange(clamp(n));
            }}
            accessibilityLabel={label}
          />
          <Text style={s.valUnit}>{unit}</Text>
        </View>
        <Pressable
          style={s.stepBtn}
          onPress={() => onChange(clamp(Math.round((value + step) * 10) / 10))}
          accessibilityLabel={`Increase ${label}`}
        >
          <Text style={s.stepTxt}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Horizontal chip picker for the enum fields. */
function ChipRow<T extends string>({ label, options, value, render, onPick }: {
  label: string; options: readonly T[]; value: T;
  render: (v: T) => string; onPick: (v: T) => void;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.chipWrap}>
        {options.map(o => (
          <Pressable
            key={o}
            onPress={() => onPick(o)}
            style={[s.chip, value === o && s.chipOn]}
            accessibilityLabel={render(o)}
          >
            <Text style={[s.chipTxt, value === o && s.chipTxtOn]}>{render(o)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MacroCell({ label, grams, kcal, color }: {
  label: string; grams: number; kcal: number; color: string;
}) {
  return (
    <View style={s.macroCell}>
      <Text style={[s.macroG, { color }]}>{grams}g</Text>
      <Text style={s.macroLabel}>{label}</Text>
      <Text style={s.macroKcal}>{kcal} kcal</Text>
    </View>
  );
}

export default function PlanScreen() {
  const state = useGame(st => st.state)!;
  const { mutate, notify } = useGame();
  const [editing, setEditing] = useState(false);
  const [weighIn, setWeighIn] = useState(false);
  const [draft, setDraft] = useState<BodyProfile>(state.body || defaultProfile());
  const [scale, setScale] = useState<number>(currentWeight(state) || 70);

  const body = state.body;
  const targets = macroTargets(body);
  const trend = weightTrend(state, 30);
  const gp = goalProgress(state);
  const bmiVal = bmi(body);

  function openEdit() {
    setDraft(state.body ? { ...state.body } : defaultProfile());
    setEditing(true);
  }

  function saveProfile() {
    mutate(st => {
      st.body = ENGINE.sanitizeProfile({ ...draft, updatedAt: ENGINE.dayKey() });
      // First-ever profile seeds the weight log so trends have a starting point.
      if (st.body && !st.weightLog.length) ENGINE.logWeight(st, st.body.weightKg);
    });
    setEditing(false);
    notify('Body profile saved — targets updated');
  }

  function saveWeight() {
    mutate(st => { ENGINE.logWeight(st, scale); });
    setWeighIn(false);
    notify(`Logged ${scale}kg`);
  }

  return (
    <Screen>
      <ScreenHeader
        icon="clipboard-outline"
        title="Plan"
        subtitle="Your body, your numbers, your targets"
        accent={colors.sys}
      />

      {!body ? (
        <Card>
          <EmptyState
            icon="body-outline"
            title="No body profile yet"
            message="Tell FORGE your height, weight, age and goal. It works out how much you should eat to get there — all offline, nothing sent anywhere."
          />
          <Btn title="Set up my profile" onPress={openEdit} />
        </Card>
      ) : (
        <>
          {/* ---- Daily targets ---- */}
          <Card border={colors.sys} glow>
            <View style={s.rowBetween}>
              <SystemLabel>Daily targets</SystemLabel>
              <Pill color={colors.sys}>{GOAL_LABEL[body.goal]}</Pill>
            </View>

            <View style={s.kcalRow}>
              <Text style={s.kcalBig}>{targets?.kcal ?? '—'}</Text>
              <Text style={s.kcalUnit}>kcal / day</Text>
            </View>
            <Text style={s.kcalSub}>
              BMR {bmr(body)} · maintenance {tdee(body)} kcal
              {body.goal !== 'recomp' &&
                ` · ${body.goal === 'cut' ? '20% deficit' : '10% surplus'}`}
            </Text>

            <View style={s.macroRow}>
              <MacroCell label="Protein" grams={targets?.protein ?? 0} kcal={(targets?.protein ?? 0) * 4} color={colors.sys} />
              <MacroCell label="Carbs" grams={targets?.carb ?? 0} kcal={(targets?.carb ?? 0) * 4} color={colors.gold} />
              <MacroCell label="Fat" grams={targets?.fat ?? 0} kcal={(targets?.fat ?? 0) * 9} color={colors.warning} />
            </View>

            <View style={s.waterNote}>
              <Text style={s.waterTxt}>💧 Water target {targets?.waterL ?? 2}L/day</Text>
            </View>
          </Card>

          {/* ---- Body stats ---- */}
          <Card>
            <View style={s.rowBetween}>
              <SystemLabel>Body</SystemLabel>
              <Pressable onPress={openEdit} accessibilityLabel="Edit body profile">
                <Text style={s.link}>Edit</Text>
              </Pressable>
            </View>

            <View style={s.statGrid}>
              <View style={s.statCell}>
                <Text style={s.statVal}>{currentWeight(state) || body.weightKg}</Text>
                <Text style={s.statKey}>kg now</Text>
              </View>
              <View style={s.statCell}>
                <Text style={s.statVal}>{body.heightCm}</Text>
                <Text style={s.statKey}>cm tall</Text>
              </View>
              <View style={s.statCell}>
                <Text style={s.statVal}>{bmiVal || '—'}</Text>
                <Text style={s.statKey}>BMI</Text>
              </View>
              <View style={s.statCell}>
                <Text style={[s.statVal, trend != null && { color: trend < 0 ? colors.success : trend > 0 ? colors.gold : colors.mut }]}>
                  {trend == null ? '—' : `${trend > 0 ? '+' : ''}${trend}`}
                </Text>
                <Text style={s.statKey}>kg / 30d</Text>
              </View>
            </View>

            {!!bmiVal && <Text style={s.bmiBand}>{bmiBand(bmiVal)}</Text>}
            <Text style={s.disclaimer}>
              BMI is a rough population screen, not a verdict — it reads muscle as
              excess weight. Use the trend, not the label.
            </Text>

            {gp != null && body.targetWeightKg != null && (
              <View style={s.goalWrap}>
                <View style={s.rowBetween}>
                  <Text style={s.goalTxt}>Toward {body.targetWeightKg}kg</Text>
                  <Text style={s.goalPct}>{Math.round(gp * 100)}%</Text>
                </View>
                <Bar pct={gp * 100} color={colors.sys} />
              </View>
            )}

            <Btn title="Log today's weight" onPress={() => { setScale(currentWeight(state) || body.weightKg); setWeighIn(true); }} />
          </Card>

          {/* ---- Weight history ---- */}
          <Card>
            <SystemLabel>Weigh-ins</SystemLabel>
            {state.weightLog.length < 2 ? (
              <Text style={s.hint}>
                Log your weight a few days running and the trend shows up here.
                One weigh-in a day is plenty — daily swings are mostly water.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sparkWrap}>
                {state.weightLog.slice(-30).map(e => {
                  const all = state.weightLog.slice(-30).map(x => x.kg);
                  const lo = Math.min(...all), hi = Math.max(...all);
                  const span = hi - lo || 1;
                  const h = 14 + ((e.kg - lo) / span) * 54;
                  return (
                    <View key={e.date} style={s.sparkCol}>
                      <Text style={s.sparkVal}>{e.kg}</Text>
                      <View style={[s.sparkBar, { height: h }]} />
                      <Text style={s.sparkDay}>{e.date.slice(8)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Card>
        </>
      )}

      {/* ---- Nutrition ---- */}
      <NutritionPanel targets={targets} />

      {/* ---- Coming next ---- */}
      <Card>
        <SystemLabel>Coming next</SystemLabel>
        <Text style={s.hint}>
          Training — exercise library, workout templates and set logging.
        </Text>
      </Card>

      {/* ---- Profile editor ---- */}
      <Modal visible={editing} animationType="slide" transparent onRequestClose={() => setEditing(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <ScrollView>
              <Text style={s.modalTitle}>Body profile</Text>
              <Text style={s.modalSub}>
                Stays on this device. Used only to work out your calorie and protein targets.
              </Text>

              <NumField label="Height" value={draft.heightCm} unit="cm" min={90} max={250}
                onChange={n => setDraft(d => ({ ...d, heightCm: n }))} />
              <NumField label="Weight" value={draft.weightKg} unit="kg" step={0.5} min={25} max={300}
                onChange={n => setDraft(d => ({ ...d, weightKg: n }))} />
              <NumField label="Age" value={draft.age} unit="yr" min={13} max={100}
                onChange={n => setDraft(d => ({ ...d, age: n }))} />

              <ChipRow label="Sex" options={SEXES} value={draft.sex}
                render={v => v[0].toUpperCase() + v.slice(1)}
                onPick={v => setDraft(d => ({ ...d, sex: v }))} />
              <Text style={s.fieldNote}>
                Affects the BMR formula only — men and women carry different average
                lean mass. Pick whichever gives you the closer estimate.
              </Text>

              <ChipRow label="Activity level" options={ACTS} value={draft.activity}
                render={v => v[0].toUpperCase() + v.slice(1)}
                onPick={v => setDraft(d => ({ ...d, activity: v }))} />
              <Text style={s.fieldNote}>{ACTIVITY_LABEL[draft.activity]}</Text>

              <ChipRow label="Goal" options={GOALS} value={draft.goal}
                render={v => GOAL_LABEL[v]}
                onPick={v => setDraft(d => ({ ...d, goal: v }))} />

              <NumField
                label="Goal weight (optional)"
                value={draft.targetWeightKg ?? draft.weightKg}
                unit="kg" step={0.5} min={25} max={300}
                onChange={n => setDraft(d => ({ ...d, targetWeightKg: n }))} />
              {draft.targetWeightKg != null && (
                <Pressable onPress={() => setDraft(d => ({ ...d, targetWeightKg: null }))}>
                  <Text style={s.clearLink}>Clear goal weight</Text>
                </Pressable>
              )}

              <View style={s.previewBox}>
                <Text style={s.previewLabel}>That works out to</Text>
                <Text style={s.previewVal}>
                  {macroTargets(draft)?.kcal ?? '—'} kcal · {macroTargets(draft)?.protein ?? '—'}g protein
                </Text>
              </View>

              <Btn title="Save profile" onPress={saveProfile} />
              <Btn title="Cancel" kind="ghost" onPress={() => setEditing(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---- Weigh-in ---- */}
      <Modal visible={weighIn} animationType="fade" transparent onRequestClose={() => setWeighIn(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Today&apos;s weight</Text>
            <NumField label="Weight" value={scale} unit="kg" step={0.1} min={25} max={300}
              onChange={setScale} />
            <Text style={s.fieldNote}>
              Replaces any earlier entry for today, so re-weighing won&apos;t skew the trend.
            </Text>
            <Btn title="Save" onPress={saveWeight} />
            <Btn title="Cancel" kind="ghost" onPress={() => setWeighIn(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  link: { color: colors.sys, fontSize: 12, fontWeight: '800' },

  kcalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  kcalBig: { color: colors.sys, fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  kcalUnit: { color: colors.mut, fontSize: 13, fontWeight: '700', marginBottom: 9 },
  kcalSub: { color: colors.mut2, fontSize: 11, marginTop: 2, marginBottom: 14 },

  macroRow: { flexDirection: 'row', gap: 8 },
  macroCell: { flex: 1, backgroundColor: colors.bg2, borderRadius: 10, padding: 10, alignItems: 'center' },
  macroG: { fontSize: 19, fontWeight: '900' },
  macroLabel: { color: colors.mut, fontSize: 10.5, fontWeight: '700', marginTop: 2 },
  macroKcal: { color: colors.mut3, fontSize: 9.5, marginTop: 1 },

  waterNote: { marginTop: 12, alignItems: 'center' },
  waterTxt: { color: colors.mut, fontSize: 12, fontWeight: '600' },

  statGrid: { flexDirection: 'row', gap: 8, marginTop: 2 },
  statCell: { flex: 1, alignItems: 'center', backgroundColor: colors.bg2, borderRadius: 10, paddingVertical: 10 },
  statVal: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  statKey: { color: colors.mut2, fontSize: 10, fontWeight: '700', marginTop: 2 },

  bmiBand: { color: colors.mut, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  disclaimer: { color: colors.mut3, fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 4, marginBottom: 12 },

  goalWrap: { marginBottom: 14 },
  goalTxt: { color: colors.mut, fontSize: 12, fontWeight: '700' },
  goalPct: { color: colors.sys, fontSize: 12, fontWeight: '900' },

  hint: { color: colors.mut2, fontSize: 12, lineHeight: 18, marginTop: 4 },

  sparkWrap: { marginTop: 10 },
  sparkCol: { alignItems: 'center', width: 40 },
  sparkVal: { color: colors.mut2, fontSize: 8.5, marginBottom: 3 },
  sparkBar: { width: 8, borderRadius: 4, backgroundColor: colors.sys, opacity: 0.75 },
  sparkDay: { color: colors.mut3, fontSize: 9, marginTop: 4 },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.bg2, borderRadius: 16, padding: 18, maxHeight: '88%', borderWidth: 1, borderColor: colors.sysFaint },
  modalTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: colors.mut2, fontSize: 11.5, lineHeight: 16, marginBottom: 16 },

  field: { marginBottom: 14 },
  fieldLabel: { color: colors.mut, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 },
  fieldNote: { color: colors.mut3, fontSize: 10.5, lineHeight: 15, marginTop: -8, marginBottom: 14 },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.sysFaint },
  stepTxt: { color: colors.sys, fontSize: 22, fontWeight: '900', lineHeight: 24 },
  valBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.bg, borderRadius: 10, height: 42 },
  valInput: { color: colors.ink, fontSize: 19, fontWeight: '900', textAlign: 'right', minWidth: 56, padding: 0 },
  valUnit: { color: colors.mut2, fontSize: 12, fontWeight: '700' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.mut3 },
  chipOn: { backgroundColor: colors.sysDeep, borderColor: colors.sys },
  chipTxt: { color: colors.mut, fontSize: 11.5, fontWeight: '700' },
  chipTxtOn: { color: colors.sys },

  clearLink: { color: colors.mut2, fontSize: 11, textDecorationLine: 'underline', marginTop: -8, marginBottom: 14 },

  previewBox: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: colors.sysFaint },
  previewLabel: { color: colors.mut2, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  previewVal: { color: colors.sys, fontSize: 15, fontWeight: '900', marginTop: 4 },
});
