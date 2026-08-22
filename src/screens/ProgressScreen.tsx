import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Pill, Bar } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import { DetailScreen } from '../components/DetailScreen';
import { colors } from '../theme/colors';
import { last7Days, trend, workoutsThisWeek, minutesThisWeek, STACKS, stackProgress, ACHIEVEMENTS } from '../engine';

export default function ProgressScreen() {
  const state = useGame(s => s.state)!;
  const t = trend(state);
  const week = last7Days(state);
  const weekWorkouts = workoutsThisWeek(state);
  const weekMinutes = minutesThisWeek(state);
  const peak = Math.max(1, ...week.map(d => d.workouts));
  const ach = state.achievements.length;
  const maxAch = ACHIEVEMENTS.length;

  return (
    <DetailScreen title="Progress">
      <ScreenHeader icon="chart-box" iconFamily="mci" title="Progress" subtitle="Your growth, streaks & stacks" accent={colors.xpa} />

      <Card>
        <View style={s.rowBetween}><Text style={s.cardTitle}>📊 Workout Trend</Text>
          <Pill color={t.direction === 'up' ? colors.xpa : t.direction === 'down' ? colors.hp : colors.mut}>
            {t.direction === 'up' ? '▲' : t.direction === 'down' ? '▼' : '—'} {t.pct}%
          </Pill>
        </View>
        <Text style={s.desc}>
          This week: {weekWorkouts} {weekWorkouts === 1 ? 'workout' : 'workouts'} · {weekMinutes} min
        </Text>

        {/* Seven bars, one per calendar day. Days you did not train are drawn
            as empty rather than skipped, so a gap looks like a gap. */}
        <View style={s.spark}>
          {week.map(d => (
            <View key={d.date} style={s.sparkCol}>
              <View style={s.sparkTrack}>
                <View
                  style={[s.sparkFill, {
                    height: `${Math.round((d.workouts / peak) * 100)}%`,
                    backgroundColor: d.workouts > 0 ? colors.xpa : colors.line,
                  }]}
                />
              </View>
              <Text style={s.sparkLabel}>{'SMTWTFS'[new Date(d.date + 'T12:00:00').getDay()]}</Text>
            </View>
          ))}
        </View>

        <Text style={s.desc}>Total workouts: {state.workouts} · Total minutes: {state.totalWorkoutMin}</Text>
      </Card>

      <Card>
        <Text style={s.cardTitle}>🏆 Achievements</Text>
        <Bar pct={(ach / maxAch) * 100} color={colors.gold} />
        <Text style={s.desc}>{ach}/{maxAch} unlocked</Text>
        <View style={s.achGrid}>
          {ACHIEVEMENTS.map(a => {
            const has = state.achievements.includes(a.id);
            return (
              <View key={a.id} style={[s.achBox, !has && { opacity: 0.35 }]}>
                <Text style={{ fontSize: 22 }}>{a.icon}</Text>
                <Text style={[s.desc, { textAlign: 'center' }]}>{a.name}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={s.cardTitle}>🔗 Habit Stacks</Text>
        {STACKS.map(stk => {
          const p = stackProgress(state, stk);
          return (
            <View key={stk.id} style={s.rowItem}>
              <Text style={{ fontSize: 20 }}>{stk.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{stk.name}</Text>
                <Text style={s.desc}>{stk.desc}</Text>
                <Bar pct={(p.done / p.total) * 100} color={colors.accent2} />
                <Text style={s.desc}>{p.done}/{p.total} today</Text>
              </View>
            </View>
          );
        })}
      </Card>
    </DetailScreen>
  );
}

const s = StyleSheet.create({
  spark: { flexDirection: 'row', alignItems: 'flex-end', height: 56, marginVertical: 10, gap: 6 },
  sparkCol: { flex: 1, alignItems: 'center' },
  sparkTrack: { width: '100%', height: 40, backgroundColor: colors.bg2, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  sparkFill: { width: '100%', borderRadius: 4, minHeight: 2 },
  sparkLabel: { color: colors.mut, fontSize: 10, marginTop: 4 },
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: 10 },
  sub: { color: colors.mut, fontSize: 13, marginBottom: 8 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  desc: { color: colors.mut, fontSize: 12, marginVertical: 2 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  achBox: { width: '30%', backgroundColor: colors.card2, borderRadius: 12, padding: 8, alignItems: 'center' },
});
