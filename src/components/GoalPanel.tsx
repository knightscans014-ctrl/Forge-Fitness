// Goal coaching and the weekly review.
//
// This is the part of the Plan tab that answers "is what I'm doing working?"
// — which is the question people actually open a fitness app to ask, and the
// one most of them answer by staring at a single morning weigh-in and
// panicking.
//
// So the headline number here is the *rate*, not the weight, and the app is
// willing to say "slow down" as readily as "well done".

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Pill, SystemLabel } from './ui';
import { colors } from '../theme/colors';
import {
  weeklyRate, rateVerdict, rateAdvice, weeksOnTrack,
  weeklyReview, weightSeries, volumeSeries, GOAL_LABEL,
} from '../engine';
import type { RateVerdict } from '../engine';

const VERDICT_COLOR: Record<RateVerdict, string> = {
  'no-data': colors.mut2,
  'on-track': colors.success,
  'too-slow': colors.warning,
  'too-fast': colors.danger,
  'wrong-way': colors.danger,
};

const VERDICT_LABEL: Record<RateVerdict, string> = {
  'no-data': 'Not enough data',
  'on-track': 'On track',
  'too-slow': 'Too slow',
  'too-fast': 'Too fast',
  'wrong-way': 'Wrong direction',
};

/** A tiny bar chart. Deliberately not a charting library — no new deps. */
function MiniChart({ points, color, format }: {
  points: { label: string; value: number }[];
  color: string;
  format: (v: number) => string;
}) {
  const vals = points.map(p => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chart}>
      {points.map((p, i) => (
        <View key={`${p.label}-${i}`} style={s.chartCol}>
          <Text style={s.chartVal}>{p.value > 0 ? format(p.value) : ''}</Text>
          <View
            style={[
              s.chartBar,
              {
                height: 10 + ((p.value - lo) / span) * 52,
                backgroundColor: color,
                opacity: p.value === 0 ? 0.18 : 0.8,
              },
            ]}
          />
          <Text style={s.chartLabel}>{p.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ReviewCell({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={s.cell}>
      <Text style={s.cellVal}>{value}</Text>
      <Text style={s.cellKey}>{label}</Text>
    </View>
  );
}

export default function GoalPanel() {
  const state = useGame(st => st.state)!;
  const body = state.body;

  if (!body) return null;

  const rate = weeklyRate(state);
  const verdict = rateVerdict(state);
  const advice = rateAdvice(state);
  const weeks = weeksOnTrack(state);
  const review = weeklyReview(state);

  const weights = weightSeries(state, 90);
  const volumes = volumeSeries(state, 14);
  const hasVolume = volumes.some(v => v.volume > 0);

  return (
    <>
      {/* ---- Are you on track? ---- */}
      <Card border={VERDICT_COLOR[verdict]} glow={verdict === 'on-track'}>
        <View style={s.rowBetween}>
          <SystemLabel>Goal progress</SystemLabel>
          <Pill color={VERDICT_COLOR[verdict]}>{VERDICT_LABEL[verdict]}</Pill>
        </View>

        <View style={s.rateRow}>
          <Text style={[s.rateBig, { color: VERDICT_COLOR[verdict] }]}>
            {rate === null ? '—' : `${rate > 0 ? '+' : ''}${rate}`}
          </Text>
          <Text style={s.rateUnit}>kg / week</Text>
        </View>
        <Text style={s.goalLine}>
          Goal: {GOAL_LABEL[body.goal]}
          {weeks > 0 && ` · ${weeks} week${weeks === 1 ? '' : 's'} on track`}
        </Text>

        <Text style={s.advice}>{advice}</Text>

        <Text style={s.disclaimer}>
          Rate is fitted across three weeks of weigh-ins, so one heavy morning
          won&apos;t move it. General guidance, not medical advice.
        </Text>
      </Card>

      {/* ---- Weekly review ---- */}
      <Card>
        <SystemLabel>This week</SystemLabel>
        <Text style={s.headline}>{review.headline}</Text>

        <View style={s.cellGrid}>
          <ReviewCell value={review.workouts} label="sessions" />
          <ReviewCell value={review.sets} label="sets" />
          <ReviewCell value={review.prs} label="lifts beaten" />
        </View>
        <View style={s.cellGrid}>
          <ReviewCell
            value={review.volume > 0 ? `${(review.volume / 1000).toFixed(1)}t` : '0'}
            label="volume moved"
          />
          <ReviewCell value={`${review.proteinDays}/7`} label="protein days" />
          <ReviewCell
            value={review.weightChange === null
              ? '—'
              : `${review.weightChange > 0 ? '+' : ''}${review.weightChange}`}
            label="kg change"
          />
        </View>
      </Card>

      {/* ---- Weight trend ---- */}
      {weights.length >= 2 && (
        <Card>
          <SystemLabel>Weight — last 90 days</SystemLabel>
          <MiniChart
            points={weights.slice(-30).map(w => ({ label: w.date.slice(8), value: w.kg }))}
            color={colors.sys}
            format={v => String(v)}
          />
        </Card>
      )}

      {/* ---- Volume trend ---- */}
      {hasVolume && (
        <Card>
          <SystemLabel>Training volume — last 14 days</SystemLabel>
          <Text style={s.hint}>
            Total load moved each day. Rest days are meant to be there.
          </Text>
          <MiniChart
            points={volumes.map(v => ({ label: v.date.slice(8), value: v.volume }))}
            color={colors.gold}
            format={v => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : String(v))}
          />
        </Card>
      )}
    </>
  );
}

const s = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  rateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rateBig: { fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  rateUnit: { color: colors.mut, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  goalLine: { color: colors.mut, fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  advice: { color: colors.ink, fontSize: 12.5, lineHeight: 18, marginTop: 12 },
  disclaimer: { color: colors.mut3, fontSize: 10, lineHeight: 14, marginTop: 10 },

  headline: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 20, marginBottom: 12 },

  cellGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cell: { flex: 1, backgroundColor: colors.bg2, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cellVal: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  cellKey: { color: colors.mut2, fontSize: 9.5, fontWeight: '700', marginTop: 2 },

  hint: { color: colors.mut2, fontSize: 11.5, lineHeight: 16, marginTop: 2, marginBottom: 4 },

  chart: { marginTop: 10 },
  chartCol: { alignItems: 'center', width: 38 },
  chartVal: { color: colors.mut2, fontSize: 8, marginBottom: 3, height: 11 },
  chartBar: { width: 8, borderRadius: 4 },
  chartLabel: { color: colors.mut3, fontSize: 9, marginTop: 4 },
});
