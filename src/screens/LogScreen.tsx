import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Pill, Btn, StatRow } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import { DetailScreen } from '../components/DetailScreen';
import { colors } from '../theme/colors';
import { ENGINE, ACTIVITIES, energyCost, xpMultNow, goldMultNow, startSession } from '../engine';


export default function LogScreen({ navigation }: any) {
  const state = useGame(s => s.state)!;
  const { mutate } = useGame();
  const [act, setAct] = useState<typeof ACTIVITIES[0] | null>(null);
  const [dur, setDur] = useState(30);
  const [int, setInt] = useState(1);

  function submit() {
    if (!act) return;
    mutate(s => { ENGINE.logActivity(s, act.id, dur, int); });
    setAct(null);
  }

  return (
    <DetailScreen title="Log Activity">
      <ScreenHeader icon="flash" title="Log Activity" subtitle="Earn XP, gold & stat growth from real training" accent="#4dc3ff" />

      <Card>
        <View style={s.rowBetween}><Text style={s.cardTitle}>Choose activity</Text><Pill color={colors.en}>⚡ {state.energy}</Pill></View>
        {ACTIVITIES.map(a => (
          <StatRow key={a.id} icon={a.icon} name={a.name} desc={`~${a.xpPerMin} XP/min · ${a.goldPerMin}🪙/min`}
            right={<Btn small title="Log" onPress={() => { setAct(a); setDur(30); setInt(1); }} />} />
        ))}
      </Card>

      <Card>
        <Text style={s.cardTitle}>💧 Quick Habits</Text>
        <View style={s.row}>
          <Btn small kind="ghost" title={`💧 Water ${state.waterToday}/2L`} onPress={() => mutate(s => { ENGINE.quickWater(s); })} />
          <Btn small kind="ghost" title={`😴 Sleep ${state.sleepHours}h`} onPress={() => mutate(s => { ENGINE.quickSleep(s); })} />
          <Btn small kind="ghost" title={`👟 Steps ${state.stepsToday}`} onPress={() => mutate(s => { ENGINE.quickSteps(s); })} />
        </View>
      </Card>

      <Card>
        <Text style={s.cardTitle}>📜 Recent Activity</Text>
        {state.activities.length === 0 ? <Text style={s.desc}>No activities yet.</Text> :
          state.activities.slice(-5).reverse().map((a, i) => (
            <StatRow key={i} icon={a.icon} name={a.name} desc={a.time} right={<Text style={{ color: colors.xpa }}>+{a.xp} XP</Text>} />
          ))}
      </Card>

      <Modal transparent visible={!!act} animationType="slide">
        {act && (
          <View style={s.modalBg}>
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>{act.icon} {act.name}</Text>
              <View style={s.ctrlRow}>
                <Text style={s.name}>Duration</Text>
                <Text style={s.pillVal}>{dur} min</Text>
              </View>
              <View style={s.sliderRow}>
                {[5, 15, 30, 45, 60, 90, 120].map(v => (
                  <Pressable key={v} onPress={() => setDur(v)} style={[s.durBtn, dur === v && s.durBtnActive]}>
                    <Text style={{ color: dur === v ? '#231500' : colors.ink, fontWeight: '800' }}>{v}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.ctrlRow}>
                <Text style={s.name}>Intensity</Text>
              </View>
              <View style={s.row}>
                {[{ l: 'Easy', v: 0.8 }, { l: 'Normal', v: 1 }, { l: 'Hard', v: 1.35 }].map(o => (
                  <Btn small key={o.l} kind={int === o.v ? 'primary' : 'ghost'} title={o.l} onPress={() => setInt(o.v)} />
                ))}
              </View>
              <View style={s.preview}>
                <Text style={s.desc}>Reward: <Text style={{ color: colors.xpa }}>+{Math.round(dur * act.xpPerMin * int * xpMultNow(state))} XP</Text> · <Text style={{ color: colors.gold }}>+{Math.round(dur * act.goldPerMin * int * goldMultNow(state))}🪙</Text> · costs ⚡{energyCost(dur)}</Text>
              </View>
              <Btn title="▶ Start Live Session" onPress={() => {
                const a = act;
                setAct(null);
                mutate(st => {
                  st.liveSession = startSession(st, a.id, a.stat as any, a.icon, a.name, int, Date.now());
                });
                navigation.navigate('SessionLive');
              }} />
              <View style={{ height: 8 }} />
              <Text style={s.liveHint}>
                Fight the enemy while you train. Or just log it after the fact:
              </Text>
              <View style={{ height: 8 }} />
              <Btn kind="ghost" title="Log Without Fighting" onPress={submit} />
              <View style={{ height: 8 }} />
              <Btn kind="ghost" title="Cancel" onPress={() => setAct(null)} />
            </View>
          </View>
        )}
      </Modal>
    </DetailScreen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: 10 },
  sub: { color: colors.mut, fontSize: 13, marginBottom: 8 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  desc: { color: colors.mut, fontSize: 12, marginVertical: 2 },
  liveHint: { color: colors.mut, fontSize: 11.5, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(4,5,10,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg2, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 32 },
  sheetTitle: { color: colors.ink, fontWeight: '900', fontSize: 19 },
  ctrlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  pillVal: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  sliderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, backgroundColor: colors.card2 },
  durBtnActive: { backgroundColor: colors.gold },
  preview: { backgroundColor: 'rgba(77,195,255,0.08)', borderRadius: 12, padding: 12, marginVertical: 12 },
});
