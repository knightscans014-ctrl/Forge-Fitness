import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Screen, Pill, Bar, SystemWindow, TierBadge, SystemBar } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import { Icon } from '../theme/icons';
import { colors } from '../theme/colors';
import { ENGINE, WEEKLY_QUESTS, STORY_MISSIONS, TIERED_MISSIONS, MILESTONE_MISSIONS } from '../engine';

export default function MissionsScreen() {
  const state = useGame(s => s.state)!;
  const mutateFn = useGame(s => s.mutate);
  // Roll the day over in an effect, not during render: dayReset() clears the
  // per-day counters, and mutating state while rendering skips the save and
  // can be run twice under StrictMode.
  useEffect(() => { mutateFn(() => {}); }, []);
  const quests = ENGINE.dailyQuests(state);
  const done = quests.filter(q => state.questsDone.includes(q.id)).length;

  return (
    <Screen>
      <ScreenHeader icon="list-circle" title="Missions" subtitle="Daily, weekly, story arcs & challenges" accent="#b18cff" />

      <SystemWindow label="Daily Quests" accent={colors.sys} glow>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>Today&apos;s Slate</Text>
          <Pill color={colors.sys}>{done}/{quests.length}</Pill>
        </View>
        <View style={{ height: 10 }} />
        <SystemBar pct={quests.length ? (done / quests.length) * 100 : 0} color={colors.sys} />
        <Text style={s.hint}>Resets at midnight. A fresh slate is drawn every day.</Text>
        {quests.map(q => {
          const isDone = state.questsDone.includes(q.id);
          return (
            <View key={q.id} style={[s.rowItem, isDone && { opacity: 0.45 }]}>
              <View style={s.icon}><Text style={{ fontSize: 20 }}>{q.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{q.title}</Text>
                  <TierBadge tier={q.tier} />
                </View>
                <Text style={s.desc}>{q.desc}</Text>
                <Text style={s.reward}>+{q.xp} XP  ·  +{q.gold} gold</Text>
              </View>
              {isDone ? <Text style={{ color: colors.xpa, fontWeight: '900', fontSize: 16 }}>✓</Text> :
                <Btn small title="Complete" onPress={() => useGame.getState().mutate(s => ENGINE.completeQuest(s, q.id))} />}
            </View>
          );
        })}
      </SystemWindow>

      <Card border={colors.gold}>
        <View style={s.rowBetween}><Text style={s.cardTitle}><Icon name="calendar" size={16} color={colors.gold} /> Weekly Quests</Text></View>
        {WEEKLY_QUESTS.map(w => {
          const cur = Math.min(w.target, ENGINE.weeklyVal(state, w.stat));
          const claimed = state.weekly.claimed.includes(w.id);
          const pct = Math.round((cur / w.target) * 100);
          return (
            <View key={w.id} style={s.rowItem}>
              <View style={s.icon}><Text style={{ fontSize: 20 }}>{w.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{w.title} {claimed ? '✓' : ''}</Text>
                <Text style={s.desc}>{w.desc}</Text>
                <Bar pct={pct} color={colors.en} />
                <Text style={s.desc}>{cur}/{w.target}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      <Card border={colors.mana}>
        <Text style={s.cardTitle}><Icon name="book-open" size={16} color={colors.mana} /> Story Arcs</Text>
        {STORY_MISSIONS.map(arc => {
          const doneSteps = state.story[arc.id]?.length || 0;
          return (
            <View key={arc.id} style={{ marginTop: 10 }}>
              <View style={s.rowBetween}>
                <Text style={[s.name, { color: arc.color }]}>{arc.icon} {arc.name}</Text>
                <Pill color={arc.color}>{doneSteps}/{arc.steps.length}</Pill>
              </View>
              {arc.steps.map((st, i) => {
                const d = state.story[arc.id]?.includes(i);
                return (
                  <View key={i} style={[s.rowItem, d && { opacity: 0.5 }]}>
                    <Text style={{ fontSize: 18 }}>{st.icon}</Text>
                    <View style={{ flex: 1 }}><Text style={s.desc}>{d ? '✓ ' : ''}{st.name}</Text></View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={s.cardTitle}><Icon name="medal" size={16} color={colors.xpa} family="mci" /> Tiered Missions</Text>
        {TIERED_MISSIONS.map(tm => {
          const val = ENGINE.tieredVal(state, tm.id);
          const cur = state.tiered[tm.id] ?? -1;
          return (
            <View key={tm.id} style={s.rowItem}>
              <View style={s.icon}><Text style={{ fontSize: 20 }}>{tm.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{tm.name}</Text>
                <Text style={s.desc}>{val}{tm.unit} logged</Text>
              </View>
              <View style={s.tierRow}>
                {tm.tiers.map((t, i) => (
                  <Text key={t.lvl} style={[s.tag, i <= cur && { color: colors.gold, borderColor: colors.gold }]}>
                    {t.lvl}{i <= cur ? ' ✓' : ''}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={s.cardTitle}><Icon name="trophy" size={16} color={colors.gold} /> Milestones</Text>
        {MILESTONE_MISSIONS.map(m => {
          const ms: any = { workouts: state.workouts, streak: state.bestStreak, level: state.level, bossCount: state.bosses.length };
          const cur = Math.min(m.target, ms[m.stat]);
          const claimed = state.milestones.claimed.includes(m.id);
          return (
            <View key={m.id} style={s.rowItem}>
              <View style={s.icon}><Text style={{ fontSize: 20 }}>{m.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{m.name} {claimed ? '✓' : ''}</Text>
                <Text style={s.desc}>{m.desc}</Text>
                <Bar pct={Math.round((cur / m.target) * 100)} color={colors.gold} />
                <Text style={s.desc}>{cur}/{m.target}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={s.cardTitle}><Icon name="flame" size={16} color={colors.accent2} /> Combo</Text>
        <Text style={s.desc}>Log activities to build combo (max +50% XP)</Text>
        <Bar pct={Math.min(100, state.combo.n * 5)} color={colors.accent2} />
      </Card>
    </Screen>
  );
}

import { Btn } from '../components/ui';
const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: 10 },
  sub: { color: colors.mut, fontSize: 13, marginBottom: 8 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reward: { color: colors.gold, fontSize: 11, fontWeight: '700', marginTop: 3, letterSpacing: 0.4 },
  hint: { color: colors.mut2, fontSize: 11, marginTop: 6, marginBottom: 2 },
  desc: { color: colors.mut, fontSize: 11.5 },
  tierRow: { flexDirection: 'row', gap: 4 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: colors.line, color: colors.mut, fontSize: 10 },
});
