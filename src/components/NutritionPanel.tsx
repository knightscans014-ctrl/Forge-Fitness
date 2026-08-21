// Nutrition section of the Plan tab: today's intake against target, the
// meal log, and the food search that feeds it.
//
// Search runs against the bundled offline database — no network, no API key.
// The portion picker defaults to the food's household portion ("1 roti",
// "1 katori") rather than making people guess grams, because they will guess
// badly and then distrust the numbers.

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, FlatList } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Pill, Btn, Bar, SystemLabel } from './ui';
import { colors } from '../theme/colors';
import {
  searchFoods, macrosFor, logMeal, removeMeal, mealsOn, dayTotals, adherence,
  addCustomFood,
} from '../engine';
import type { Food, MacroTargets } from '../engine';

/** One macro's progress against its target. */
function MacroLine({ label, have, want, unit, color }: {
  label: string; have: number; want: number; unit: string; color: string;
}) {
  const pct = want > 0 ? Math.min(100, (have / want) * 100) : 0;
  const over = want > 0 && have > want * 1.1;
  return (
    <View style={s.macroLine}>
      <View style={s.rowBetween}>
        <Text style={s.macroLabel}>{label}</Text>
        <Text style={s.macroNums}>
          <Text style={{ color: over ? colors.warning : colors.ink, fontWeight: '900' }}>
            {Math.round(have)}
          </Text>
          <Text style={s.macroWant}> / {Math.round(want)}{unit}</Text>
        </Text>
      </View>
      <Bar pct={pct} color={over ? colors.warning : color} />
    </View>
  );
}

export default function NutritionPanel({ targets }: { targets: MacroTargets | null }) {
  const state = useGame(st => st.state)!;
  const mutate = useGame(st => st.mutate);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', kcal: '', protein: '', carb: '', fat: '' });

  const today = mealsOn(state);
  const totals = dayTotals(state);
  const adh = adherence(state, targets);

  // Debouncing is unnecessary here: the search is a synchronous pass over
  // 7,500 rows in memory, which is well under a frame.
  const results = useMemo(
    () => (query.trim() ? searchFoods(query, 30, state) : []),
    [query, state],
  );

  const openFood = useCallback((f: Food) => {
    setPicked(f);
    setGrams(f.portionG || 100);
  }, []);

  const confirmLog = useCallback(() => {
    if (!picked) return;
    const f = picked;
    const g = grams;
    mutate(st => { logMeal(st, f.id, g); });
    setPicked(null);
    setQuery('');
    setSearching(false);
  }, [picked, grams, mutate]);

  const saveCustom = useCallback(() => {
    const input = {
      name: draft.name,
      kcal: Number(draft.kcal),
      protein: Number(draft.protein),
      carb: Number(draft.carb),
      fat: Number(draft.fat),
      portionG: 100,
      portionLabel: '100 g',
    };
    let made: Food | null = null;
    mutate(st => {
      const c = addCustomFood(st, input);
      if (c) made = { ...c, cat: 'My foods' };
    });
    if (made) {
      setAdding(false);
      setDraft({ name: '', kcal: '', protein: '', carb: '', fat: '' });
      openFood(made);
    }
  }, [draft, mutate, openFood]);

  const draftValid = draft.name.trim() !== '' && draft.kcal.trim() !== '' &&
    [draft.kcal, draft.protein, draft.carb, draft.fat].every(v => v === '' || isFinite(Number(v)));

  const preview = picked ? macrosFor(picked, grams) : null;
  const kcalLeft = targets ? Math.round(targets.kcal - totals.kcal) : 0;

  return (
    <>
      <Card border={colors.sys}>
        <View style={s.rowBetween}>
          <SystemLabel>Today&apos;s intake</SystemLabel>
          {!!targets && (
            <Pill color={kcalLeft >= 0 ? colors.sys : colors.warning}>
              {kcalLeft >= 0 ? `${kcalLeft} left` : `${-kcalLeft} over`}
            </Pill>
          )}
        </View>

        {!targets ? (
          <Text style={s.hint}>
            Set up your body profile above and FORGE will score every meal
            against a real calorie and protein target.
          </Text>
        ) : (
          <>
            <View style={s.kcalRow}>
              <Text style={s.kcalBig}>{totals.kcal}</Text>
              <Text style={s.kcalUnit}>of {targets.kcal} kcal</Text>
            </View>
            <Bar pct={adh ? Math.min(100, adh.kcal * 100) : 0} color={colors.sys} />

            <View style={s.macroBlock}>
              <MacroLine label="Protein" have={totals.protein} want={targets.protein} unit="g" color={colors.sys} />
              <MacroLine label="Carbs" have={totals.carb} want={targets.carb} unit="g" color={colors.gold} />
              <MacroLine label="Fat" have={totals.fat} want={targets.fat} unit="g" color={colors.warning} />
            </View>
          </>
        )}

        <Btn title="Log food" onPress={() => setSearching(true)} />
      </Card>

      {/* ---- Today's meals ---- */}
      <Card>
        <View style={s.rowBetween}>
          <SystemLabel>Meals today</SystemLabel>
          {today.length > 0 && <Text style={s.count}>{today.length}</Text>}
        </View>

        {today.length === 0 ? (
          <Text style={s.hint}>
            Nothing logged yet. Search the offline database — it knows roti, dal
            and paneer as well as it knows chicken breast.
          </Text>
        ) : (
          today.map(m => (
            <View key={m.id} style={s.mealRow}>
              <View style={s.mealMain}>
                <Text style={s.mealName} numberOfLines={1}>{m.name}</Text>
                <Text style={s.mealSub}>
                  {m.grams}g · P{Math.round(m.protein)} C{Math.round(m.carb)} F{Math.round(m.fat)}
                </Text>
              </View>
              <Text style={s.mealKcal}>{m.kcal}</Text>
              <Pressable
                onPress={() => mutate(st => { removeMeal(st, m.id); })}
                hitSlop={10}
                accessibilityLabel={`Remove ${m.name}`}
              >
                <Text style={s.mealDel}>×</Text>
              </Pressable>
            </View>
          ))
        )}
      </Card>

      {/* ---- Food search ---- */}
      <Modal visible={searching} animationType="slide" transparent onRequestClose={() => setSearching(false)}>
        <View style={s.modalWrap}>
          <View style={s.searchCard}>
            <View style={s.rowBetween}>
              <Text style={s.modalTitle}>Find food</Text>
              <Pressable onPress={() => { setSearching(false); setQuery(''); }} hitSlop={12}>
                <Text style={s.close}>×</Text>
              </Pressable>
            </View>

            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="banana, dal, chicken breast…"
              placeholderTextColor={colors.mut3}
              autoFocus
              autoCorrect={false}
              accessibilityLabel="Search foods"
            />

            {query.trim() === '' ? (
              <Text style={s.searchHint}>
                7,500 foods, stored on your phone. Works in aeroplane mode.
              </Text>
            ) : results.length === 0 ? (
              <View>
                <Text style={s.searchHint}>
                  Nothing matched &quot;{query.trim()}&quot;. Try a simpler word — &quot;rice&quot;
                  rather than a brand name.
                </Text>
                <Btn
                  small
                  kind="ghost"
                  title={`Add "${query.trim().slice(0, 24)}" myself`}
                  onPress={() => { setDraft(d => ({ ...d, name: query.trim() })); setAdding(true); }}
                />
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={r => String(r.food.id)}
                keyboardShouldPersistTaps="handled"
                style={s.resultList}
                renderItem={({ item }) => (
                  <Pressable style={s.resultRow} onPress={() => openFood(item.food)}>
                    <View style={s.resultMain}>
                      <Text style={s.resultName} numberOfLines={2}>{item.food.name}</Text>
                      <Text style={s.resultCat}>{item.food.cat}</Text>
                    </View>
                    <View style={s.resultNums}>
                      <Text style={s.resultKcal}>{item.food.kcal}</Text>
                      <Text style={s.resultPer}>kcal/100g</Text>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ---- Add your own food ---- */}
      <Modal visible={adding} animationType="fade" transparent onRequestClose={() => setAdding(false)}>
        <View style={s.modalWrap}>
          <View style={s.searchCard}>
            <View style={s.rowBetween}>
              <Text style={s.modalTitle}>Add a food</Text>
              <Pressable onPress={() => setAdding(false)} hitSlop={12}>
                <Text style={s.close}>×</Text>
              </Pressable>
            </View>
            <Text style={s.searchHint}>
              Per 100 g, from the label or your own recipe. It stays on your phone
              and shows up in search from now on.
            </Text>

            <TextInput
              style={s.searchInput}
              value={draft.name}
              onChangeText={v => setDraft(d => ({ ...d, name: v }))}
              placeholder="Name"
              placeholderTextColor={colors.mut3}
              accessibilityLabel="Food name"
            />
            <View style={s.macroGrid}>
              {([
                ['kcal', 'Calories'],
                ['protein', 'Protein g'],
                ['carb', 'Carbs g'],
                ['fat', 'Fat g'],
              ] as const).map(([key, label]) => (
                <View key={key} style={s.macroField}>
                  <Text style={s.macroFieldLabel}>{label}</Text>
                  <TextInput
                    style={s.macroInput}
                    value={draft[key]}
                    onChangeText={v => setDraft(d => ({ ...d, [key]: v.replace(/[^0-9.]/g, '') }))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.mut3}
                    accessibilityLabel={label}
                  />
                </View>
              ))}
            </View>

            <Btn
              title="Save and log it"
              kind={draftValid ? 'primary' : 'ghost'}
              onPress={draftValid ? saveCustom : () => {}}
            />
          </View>
        </View>
      </Modal>

      {/* ---- Portion picker ---- */}
      <Modal visible={!!picked} animationType="fade" transparent onRequestClose={() => setPicked(null)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={s.modalTitle} numberOfLines={3}>{picked?.name}</Text>
              <Text style={s.modalSub}>
                {picked?.kcal} kcal per 100g · P{picked?.protein} C{picked?.carb} F{picked?.fat}
              </Text>

              <Text style={s.fieldLabel}>How much?</Text>
              <View style={s.stepRow}>
                <Pressable
                  style={s.stepBtn}
                  onPress={() => setGrams(g => Math.max(1, g - 10))}
                  accessibilityLabel="Less"
                >
                  <Text style={s.stepTxt}>−</Text>
                </Pressable>
                <View style={s.valBox}>
                  <TextInput
                    style={s.valInput}
                    value={String(grams)}
                    keyboardType="numeric"
                    onChangeText={t => {
                      const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                      setGrams(isNaN(n) ? 0 : Math.min(5000, n));
                    }}
                    accessibilityLabel="Grams"
                  />
                  <Text style={s.valUnit}>g</Text>
                </View>
                <Pressable
                  style={s.stepBtn}
                  onPress={() => setGrams(g => Math.min(5000, g + 10))}
                  accessibilityLabel="More"
                >
                  <Text style={s.stepTxt}>+</Text>
                </Pressable>
              </View>

              {/* Household portions beat gram-guessing for anyone without scales. */}
              {!!picked && (
                <View style={s.chipWrap}>
                  {!!picked.portionG && (
                    <Pressable
                      style={[s.chip, grams === picked.portionG && s.chipOn]}
                      onPress={() => setGrams(picked.portionG)}
                    >
                      <Text style={[s.chipTxt, grams === picked.portionG && s.chipTxtOn]}>
                        {picked.portionLabel || 'portion'} ({picked.portionG}g)
                      </Text>
                    </Pressable>
                  )}
                  {[50, 100, 150, 200, 250].map(g => (
                    <Pressable key={g} style={[s.chip, grams === g && s.chipOn]} onPress={() => setGrams(g)}>
                      <Text style={[s.chipTxt, grams === g && s.chipTxtOn]}>{g}g</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {!!preview && (
                <View style={s.previewBox}>
                  <Text style={s.previewKcal}>{preview.kcal} kcal</Text>
                  <Text style={s.previewMacros}>
                    Protein {preview.protein}g · Carbs {preview.carb}g · Fat {preview.fat}g
                  </Text>
                </View>
              )}

              <Btn title="Add to today" onPress={confirmLog} disabled={grams <= 0} />
              <Pressable onPress={() => setPicked(null)}>
                <Text style={s.cancel}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hint: { color: colors.mut2, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  count: { color: colors.mut2, fontSize: 12, fontWeight: '800' },

  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  kcalBig: { color: colors.sys, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  kcalUnit: { color: colors.mut, fontSize: 13, fontWeight: '700' },

  macroBlock: { marginTop: 14, marginBottom: 6, gap: 10 },
  macroLine: { gap: 5 },
  macroLabel: { color: colors.mut, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  macroNums: { fontSize: 12 },
  macroWant: { color: colors.mut2, fontWeight: '700' },

  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.sysFaint },
  mealMain: { flex: 1 },
  mealName: { color: colors.ink, fontSize: 13.5, fontWeight: '700' },
  mealSub: { color: colors.mut2, fontSize: 11, marginTop: 2 },
  mealKcal: { color: colors.sys, fontSize: 15, fontWeight: '900' },
  mealDel: { color: colors.mut2, fontSize: 22, fontWeight: '700', paddingHorizontal: 4 },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.bg2, borderRadius: 16, padding: 18, maxHeight: '88%', borderWidth: 1, borderColor: colors.sysFaint },
  searchCard: { backgroundColor: colors.bg2, borderRadius: 16, padding: 18, height: '85%', borderWidth: 1, borderColor: colors.sysFaint },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', flex: 1, marginBottom: 4 },
  modalSub: { color: colors.mut2, fontSize: 11.5, lineHeight: 16, marginBottom: 18 },
  close: { color: colors.mut, fontSize: 28, fontWeight: '700', lineHeight: 30, paddingLeft: 12 },

  searchInput: {
    backgroundColor: colors.bg, borderRadius: 10, height: 46, paddingHorizontal: 14,
    color: colors.ink, fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: colors.sysFaint,
    marginBottom: 12,
  },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, marginBottom: 10 },
  macroField: { width: '50%', paddingRight: 8, paddingBottom: 8 },
  macroFieldLabel: { color: colors.mut, fontSize: 11, marginBottom: 4 },
  macroInput: {
    backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line,
    borderRadius: 8, color: colors.ink, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15,
  },
  searchHint: { color: colors.mut2, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 24, paddingHorizontal: 16 },
  resultList: { flex: 1 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.sysFaint },
  resultMain: { flex: 1 },
  resultName: { color: colors.ink, fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  resultCat: { color: colors.mut3, fontSize: 10.5, marginTop: 3 },
  resultNums: { alignItems: 'flex-end' },
  resultKcal: { color: colors.sys, fontSize: 16, fontWeight: '900' },
  resultPer: { color: colors.mut3, fontSize: 9 },

  fieldLabel: { color: colors.mut, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.sysFaint },
  stepTxt: { color: colors.sys, fontSize: 22, fontWeight: '900', lineHeight: 24 },
  valBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.bg, borderRadius: 10, height: 42 },
  valInput: { color: colors.ink, fontSize: 19, fontWeight: '900', textAlign: 'right', minWidth: 56, padding: 0 },
  valUnit: { color: colors.mut2, fontSize: 12, fontWeight: '700' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.mut3 },
  chipOn: { backgroundColor: colors.sysDeep, borderColor: colors.sys },
  chipTxt: { color: colors.mut, fontSize: 11.5, fontWeight: '700' },
  chipTxtOn: { color: colors.sys },

  previewBox: { backgroundColor: colors.bg, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.sysFaint },
  previewKcal: { color: colors.sys, fontSize: 24, fontWeight: '900' },
  previewMacros: { color: colors.mut, fontSize: 11.5, fontWeight: '600', marginTop: 5 },

  cancel: { color: colors.mut2, fontSize: 12.5, textAlign: 'center', marginTop: 12, textDecorationLine: 'underline' },
});
