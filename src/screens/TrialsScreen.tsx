import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { Pill, Btn, SystemWindow, SystemBar } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import { DetailScreen } from '../components/DetailScreen';
import { colors } from '../theme/colors';
import { ENGINE, trialStatus, trialProgress, nextOpponent, seasonTier } from '../engine';

export default function TrialsScreen() {
  const state = useGame(s => s.state)!;
  const { mutate } = useGame();
  ENGINE.currentSeason(state);
  const trial = trialStatus(state);
  const season = state.season!;
  const stier = seasonTier(state);
  const opponent = nextOpponent(state);

  return (
    <DetailScreen title="Trials">
      <ScreenHeader icon="sword" title="Trials" subtitle="Weekly endurance boss and training bouts" accent="#4dc3ff" />

      <SystemWindow label="Season" accent={colors.en}>
        <View style={s.rowBetween}>
          <View />
          <Pill color={colors.mana}>{stier.icon} {stier.label}</Pill>
        </View>
        <Text style={s.name}>{season.name}</Text>
        <Text style={s.desc}>Season XP: {state.seasonXP} · Your own 2-week ladder</Text>
      </SystemWindow>

      <SystemWindow label="Weekly Trial" accent={colors.mana} glow={!!trial}>
        <View style={s.rowBetween}><View />{trial ? <Pill>{trialProgress(state)}% cleared</Pill> : null}</View>
        {trial ? (
          <>
            <Text style={s.name}>{trial.name}</Text>
            <SystemBar pct={(trial.hp / trial.maxHp) * 100} color={colors.mana} height={12}
              label={`BOSS HP  ${trial.hp}/${trial.maxHp}`} />
            <View style={{ height: 10 }} />
            <Btn title="⚔️ Strike Boss (⚡10)" onPress={() => mutate(s => { ENGINE.trialStrike(s); })} />
          </>
        ) : (
          <>
            <Text style={s.desc}>No trial active this week. A fresh boss appears every week — chip away at it across several sessions.</Text>
            <Btn title="Start Weekly Trial" onPress={() => mutate(s => { ENGINE.startTrial(s); })} />
          </>
        )}
      </SystemWindow>

      <SystemWindow label="Training Bouts" accent={colors.accent2}>
        <Text style={s.desc}>Scripted sparring partners at fixed power levels — benchmarks for your own progress.</Text>
        <Text style={s.name}>{opponent.icon} {opponent.name}</Text>
        <Text style={s.desc}>Lv {opponent.lvl} · Power {opponent.power} · {opponent.desc}</Text>
        <Text style={s.desc}>Win streak: {state.boutStreak || 0} 🔥</Text>
        <Btn title={`⚔️ Spar with ${opponent.name}`} onPress={() => {
          const notify = useGame.getState().notify;
          const celebrate = useGame.getState().celebrate;
          mutate(s => {
            const r = ENGINE.bout(s, opponent);
            if (r.win) {
              notify(`⚔️ You beat ${opponent.name}! +${r.xp} XP +${r.gold}🪙`);
              celebrate({ title: 'BOUT WON', big: 'YOU WIN', subtitle: `${opponent.name} beaten · streak ${s.boutStreak || 1}`, accent: colors.xpa });
            } else {
              notify(`💀 ${opponent.name} outmatched you. Train & retry!`);
            }
          });
        }} />
      </SystemWindow>

      <SystemWindow label="Bout Record" accent={colors.sys}>
        {state.bouts.length === 0 ? <Text style={s.desc}>No bouts yet. Work up the ladder!</Text> :
          state.bouts.map((d, i) => (
            <View key={i} style={s.rowItem}><Text style={s.name}>{d.opponent}</Text><Text style={s.desc}>{d.wins} win(s)</Text></View>
          ))}
      </SystemWindow>
    </DetailScreen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: 10 },
  sub: { color: colors.mut, fontSize: 13, marginBottom: 8 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.ink, fontWeight: '900', fontSize: 15, marginVertical: 4 },
  desc: { color: colors.mut, fontSize: 12 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
});
