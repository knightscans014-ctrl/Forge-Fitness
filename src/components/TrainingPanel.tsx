// Training section of the Plan tab: templates, the exercise library, set
// logging, and the personal-best board.
//
// The design bet here is that logging a set has to be faster than not logging
// it. Recent exercises sit at the top, the weight and rep fields prefill from
// your last set of that movement, and the previous best is on screen while you
// type — so "beat it by one rep" is a decision, not a memory test.

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Pill, Btn, SystemLabel, EmptyState } from './ui';
import { colors } from '../theme/colors';
import {
  TEMPLATES, searchExercises, recentExercises, logSet, removeSet,
  setsOn, setsFor, personalBest, allPersonalBests, overloadToday, volumeOn,
} from '../engine';
import type { Exercise, WorkoutTemplate } from '../engine';

const EQUIP_ICON: Record<string, string> = {
  bodyweight: '🤸',
  barbell: '🏋️',
  dumbbell: '💪',
  machine: '⚙️',
  kettlebell: '🔔',
};

/** One row in the "logged today" list. */
function SetRow({ name, weight, reps, onRemove }: {
  name: string; weight: number; reps: number; onRemove: () => void;
}) {
  return (
    <View style={s.setRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.setName}>{name}</Text>
      </View>
      <Text style={s.setNums}>
        {weight > 0 ? `${weight}kg × ${reps}` : `${reps} reps`}
      </Text>
      <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel={`Remove ${name}`}>
        <Text style={s.remove}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function TrainingPanel() {
  const state = useGame(st => st.state)!;
  const mutate = useGame(st => st.mutate);
  const notify = useGame(st => st.notify);

  const [browsing, setBrowsing] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Exercise | null>(null);
  const [weight, setWeight] = useState('0');
  const [reps, setReps] = useState('8');
  const [openTemplate, setOpenTemplate] = useState<WorkoutTemplate | null>(null);

  const today = setsOn(state);
  const recent = recentExercises(state, 6);
  const bests = allPersonalBests(state);
  const beaten = overloadToday(state);
  const volume = volumeOn(state);

  const results = useMemo(() => searchExercises(query, 50), [query]);

  // Opening an exercise prefills from your last set of it, because the
  // overwhelmingly common case is "same as last time, maybe one more rep".
  const openExercise = useCallback((ex: Exercise) => {
    const history = setsFor(state, ex.id);
    const last = history[history.length - 1];
    setPicked(ex);
    setWeight(String(last ? last.weight : (ex.bodyweight ? 0 : 20)));
    setReps(String(last ? last.reps : 8));
  }, [state]);

  function save() {
    if (!picked) return;
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    const ex = picked;

    // Snapshot the benchmark before logging, so we can tell the player they
    // beat it in the same breath as saving.
    const before = personalBest(state, ex.id);

    let ok = false;
    mutate(st => { ok = logSet(st, ex.id, w, r) !== null; });

    if (!ok) {
      notify(ex.bodyweight
        ? 'Reps need to be a real number'
        : 'That set needs a weight and reps');
      return;
    }

    const isPR = before && (ex.bodyweight
      ? r > before.reps
      : (w > before.weight && r >= before.reps) || (w === before.weight && r > before.reps));

    if (isPR) {
      notify(`New best on ${ex.name} — ${w > 0 ? `${w}kg × ${r}` : `${r} reps`}`);
    } else {
      notify(`Logged ${ex.name}`);
    }
    setPicked(null);
  }

  return (
    <>
      {/* ---- Today's session ---- */}
      <Card border={beaten.length ? colors.gold : undefined} glow={beaten.length > 0}>
        <View style={s.rowBetween}>
          <SystemLabel>Training today</SystemLabel>
          {volume > 0 && <Pill color={colors.sys}>{volume.toLocaleString()} kg moved</Pill>}
        </View>

        {today.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title="No sets logged"
            message="Log what you actually lifted. Once there's history, FORGE can tell when you genuinely beat it — that's what unlocks Progressive Overload."
          />
        ) : (
          <View style={s.setList}>
            {today.map(e => (
              <SetRow
                key={e.id}
                name={e.name}
                weight={e.weight}
                reps={e.reps}
                onRemove={() => mutate(st => removeSet(st, e.id))}
              />
            ))}
          </View>
        )}

        {beaten.length > 0 && (
          <View style={s.prBox}>
            <Text style={s.prTitle}>📈 Progressive overload</Text>
            {beaten.map(h => (
              <Text key={h.exerciseId} style={s.prLine}>
                {h.name} — {h.how}
              </Text>
            ))}
            <Text style={s.prNote}>
              The Progressive Overload quest is unlocked. You earned it; the app checked.
            </Text>
          </View>
        )}

        <Btn title="Log a set" onPress={() => { setQuery(''); setBrowsing(true); }} />
      </Card>

      {/* ---- Quick repeat ---- */}
      {recent.length > 0 && (
        <Card>
          <SystemLabel>Straight back to it</SystemLabel>
          <View style={s.chipWrap}>
            {recent.map(ex => {
              const pb = personalBest(state, ex.id);
              return (
                <Pressable key={ex.id} style={s.recentChip} onPress={() => openExercise(ex)}>
                  <Text style={s.recentName}>{ex.name}</Text>
                  {pb && (
                    <Text style={s.recentPb}>
                      best {pb.weight > 0 ? `${pb.weight}kg × ${pb.reps}` : `${pb.reps} reps`}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}

      {/* ---- Templates ---- */}
      <Card>
        <SystemLabel>Workout templates</SystemLabel>
        <Text style={s.hint}>
          Proven splits, not invented ones. Tap to see the movements, then log
          each set as you go.
        </Text>
        {TEMPLATES.map(t => (
          <Pressable key={t.id} style={s.tplRow} onPress={() => setOpenTemplate(t)}>
            <View style={{ flex: 1 }}>
              <Text style={s.tplName}>{t.name}</Text>
              <Text style={s.tplFocus}>{t.focus}</Text>
            </View>
            <Text style={s.tplDays}>{t.days.length} days</Text>
          </Pressable>
        ))}
      </Card>

      {/* ---- Personal bests ---- */}
      {bests.length > 0 && (
        <Card>
          <SystemLabel>Personal bests</SystemLabel>
          {bests.slice(0, 12).map(b => (
            <View key={b.exerciseId} style={s.pbRow}>
              <Text style={s.pbName} numberOfLines={1}>{b.name}</Text>
              <Text style={s.pbVal}>
                {b.weight > 0 ? `${b.weight}kg × ${b.reps}` : `${b.reps} reps`}
              </Text>
              <Text style={s.pbDate}>{b.date.slice(5)}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* ---- Exercise browser ---- */}
      <Modal visible={browsing} animationType="slide" transparent onRequestClose={() => setBrowsing(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Exercise library</Text>
            <TextInput
              style={s.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search a movement, muscle or kit…"
              placeholderTextColor={colors.mut3}
              accessibilityLabel="Search exercises"
              autoCorrect={false}
            />
            <ScrollView style={s.resultList} keyboardShouldPersistTaps="handled">
              {results.map(ex => (
                <Pressable
                  key={ex.id}
                  style={s.exRow}
                  onPress={() => { setBrowsing(false); openExercise(ex); }}
                >
                  <Text style={s.exIcon}>{EQUIP_ICON[ex.equipment]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.exName}>{ex.name}</Text>
                    <Text style={s.exMeta}>{ex.muscles.join(' · ')}</Text>
                  </View>
                  {ex.compound && <Pill color={colors.sys}>compound</Pill>}
                </Pressable>
              ))}
              {results.length === 0 && (
                <Text style={s.hint}>Nothing matches that. Try a muscle group.</Text>
              )}
            </ScrollView>
            <Btn title="Close" kind="ghost" onPress={() => setBrowsing(false)} />
          </View>
        </View>
      </Modal>

      {/* ---- Set entry ---- */}
      <Modal visible={!!picked} animationType="fade" transparent onRequestClose={() => setPicked(null)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            {picked && (() => {
              const pb = personalBest(state, picked.id);
              return (
                <>
                  <Text style={s.modalTitle}>{picked.name}</Text>
                  <Text style={s.cue}>{picked.cue}</Text>

                  {pb ? (
                    <View style={s.benchBox}>
                      <Text style={s.benchLabel}>Best so far</Text>
                      <Text style={s.benchVal}>
                        {pb.weight > 0 ? `${pb.weight}kg × ${pb.reps}` : `${pb.reps} reps`}
                      </Text>
                      <Text style={s.benchNote}>
                        Beat it by one rep or 2.5kg to clear Progressive Overload.
                      </Text>
                    </View>
                  ) : (
                    <View style={s.benchBox}>
                      <Text style={s.benchLabel}>First time</Text>
                      <Text style={s.benchNote}>
                        This set becomes the benchmark. Overload counts from next session.
                      </Text>
                    </View>
                  )}

                  <View style={s.entryRow}>
                    <View style={s.entryField}>
                      <Text style={s.fieldLabel}>
                        {picked.bodyweight ? 'Added weight' : 'Weight'}
                      </Text>
                      <TextInput
                        style={s.entryInput}
                        value={weight}
                        onChangeText={setWeight}
                        keyboardType="numeric"
                        accessibilityLabel="Weight in kilograms"
                      />
                      <Text style={s.entryUnit}>kg</Text>
                    </View>
                    <View style={s.entryField}>
                      <Text style={s.fieldLabel}>
                        {picked.id === 'x_plank' ? 'Seconds' : 'Reps'}
                      </Text>
                      <TextInput
                        style={s.entryInput}
                        value={reps}
                        onChangeText={setReps}
                        keyboardType="numeric"
                        accessibilityLabel="Repetitions"
                      />
                      <Text style={s.entryUnit}>{picked.id === 'x_plank' ? 'sec' : 'reps'}</Text>
                    </View>
                  </View>

                  <Btn title="Log set" onPress={save} />
                  <Btn title="Cancel" kind="ghost" onPress={() => setPicked(null)} />
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ---- Template detail ---- */}
      <Modal visible={!!openTemplate} animationType="slide" transparent onRequestClose={() => setOpenTemplate(null)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <ScrollView>
              <Text style={s.modalTitle}>{openTemplate?.name}</Text>
              <Text style={s.modalSub}>{openTemplate?.focus}</Text>
              {openTemplate?.days.map(d => (
                <View key={d.name} style={s.dayBlock}>
                  <Text style={s.dayName}>{d.name}</Text>
                  {d.exerciseIds.map(id => {
                    const ex = searchExercises('', 100).find(e => e.id === id);
                    if (!ex) return null;
                    return (
                      <Pressable
                        key={id}
                        style={s.dayEx}
                        onPress={() => { setOpenTemplate(null); openExercise(ex); }}
                      >
                        <Text style={s.dayExIcon}>{EQUIP_ICON[ex.equipment]}</Text>
                        <Text style={s.dayExName}>{ex.name}</Text>
                        <Text style={s.dayExLog}>log</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              <Btn title="Close" kind="ghost" onPress={() => setOpenTemplate(null)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  hint: { color: colors.mut2, fontSize: 12, lineHeight: 18, marginTop: 2, marginBottom: 10 },

  setList: { marginBottom: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.bg2 },
  setName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  setNums: { color: colors.sys, fontSize: 13, fontWeight: '900' },
  remove: { color: colors.mut3, fontSize: 15, fontWeight: '900', paddingHorizontal: 4 },

  prBox: { backgroundColor: colors.bg2, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.gold },
  prTitle: { color: colors.gold, fontSize: 13, fontWeight: '900', marginBottom: 6 },
  prLine: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  prNote: { color: colors.mut2, fontSize: 10.5, lineHeight: 15, marginTop: 6 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  recentChip: { backgroundColor: colors.bg2, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: colors.sysFaint },
  recentName: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  recentPb: { color: colors.mut2, fontSize: 9.5, marginTop: 2 },

  tplRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.bg2 },
  tplName: { color: colors.ink, fontSize: 13.5, fontWeight: '800' },
  tplFocus: { color: colors.mut2, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  tplDays: { color: colors.sys, fontSize: 11, fontWeight: '800' },

  pbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.bg2 },
  pbName: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700' },
  pbVal: { color: colors.gold, fontSize: 12, fontWeight: '900' },
  pbDate: { color: colors.mut3, fontSize: 9.5, width: 38, textAlign: 'right' },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.bg2, borderRadius: 16, padding: 18, maxHeight: '88%', borderWidth: 1, borderColor: colors.sysFaint },
  modalTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginBottom: 4 },
  modalSub: { color: colors.mut2, fontSize: 11.5, lineHeight: 16, marginBottom: 14 },

  search: { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, height: 44, color: colors.ink, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.sysFaint },
  resultList: { maxHeight: 380, marginBottom: 10 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bg },
  exIcon: { fontSize: 17 },
  exName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  exMeta: { color: colors.mut2, fontSize: 10, marginTop: 1, textTransform: 'capitalize' },

  cue: { color: colors.mut, fontSize: 12, lineHeight: 17, marginBottom: 14 },

  benchBox: { backgroundColor: colors.bg, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.sysFaint },
  benchLabel: { color: colors.mut2, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  benchVal: { color: colors.gold, fontSize: 20, fontWeight: '900', marginTop: 3 },
  benchNote: { color: colors.mut2, fontSize: 10.5, lineHeight: 15, marginTop: 4 },

  entryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  entryField: { flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.sysFaint },
  fieldLabel: { color: colors.mut, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  entryInput: { color: colors.ink, fontSize: 26, fontWeight: '900', textAlign: 'center', minWidth: 70, padding: 0 },
  entryUnit: { color: colors.mut2, fontSize: 10.5, fontWeight: '700', marginTop: 2 },

  dayBlock: { marginBottom: 16 },
  dayName: { color: colors.sys, fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  dayEx: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.bg },
  dayExIcon: { fontSize: 15 },
  dayExName: { flex: 1, color: colors.ink, fontSize: 12.5, fontWeight: '700' },
  dayExLog: { color: colors.sys, fontSize: 10.5, fontWeight: '800' },
});
