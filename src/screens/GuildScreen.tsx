import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Screen, Pill, Bar, Btn } from '../components/ui';
import { colors } from '../theme/colors';
import { ENGINE, raidStatus, raidRank, nextRival, seasonTier } from '../engine';

export default function GuildScreen() {
  const state = useGame(s => s.state)!;
  const { mutate } = useGame();
  ENGINE.currentSeason(state);
  const raid = raidStatus(state);
  const season = state.season!;
  const stier = seasonTier(state);
  const rival = nextRival(state);

  return (
    <Screen>
      <Text style={s.title}>👥 Guild & Arena</Text>
      <Text style={s.sub}>Compete together and duel rivals.</Text>

      <Card border={colors.en}>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>🎭 Season</Text>
          <Pill color={colors.mana}>{stier.icon} {stier.label}</Pill>
        </View>
        <Text style={s.name}>{season.name}</Text>
        <Text style={s.desc}>Season XP: {state.seasonXP} · Rank by grinding XP</Text>
      </Card>

      <Card border={colors.mana}>
        <View style={s.rowBetween}><Text style={s.cardTitle}>🐲 Weekly Guild Raid</Text><Pill>Top {raidRank(state)}%</Pill></View>
        {raid ? (
          <>
            <Text style={s.name}>{raid.name}</Text>
            <Bar pct={(raid.hp / raid.maxHp) * 100} color={colors.mana} />
            <Text style={s.desc}>{raid.hp}/{raid.maxHp} HP · {state.guild.name}</Text>
            <Btn title="⚔️ Strike Boss (⚡10)" onPress={() => mutate(s => { ENGINE.raidStrike(s); })} />
          </>
        ) : (
          <>
            <Text style={s.desc}>No raid active this week.</Text>
            <Btn title="Start Weekly Raid" onPress={() => mutate(s => { ENGINE.startRaid(s); })} />
          </>
        )}
      </Card>

      <Card border={colors.accent2}>
        <Text style={s.cardTitle}>⚔️ Duel Arena</Text>
        <Text style={s.name}>{rival.icon} {rival.name}</Text>
        <Text style={s.desc}>Lv {rival.lvl} · Power {rival.power} · {rival.desc}</Text>
        <Text style={s.desc}>Duel streak: {state.duelStreak || 0} 🔥</Text>
        <Btn title={`⚔️ Duel ${rival.name}`} onPress={() => mutate(s => { ENGINE.duel(s, rival); })} />
      </Card>

      <Card>
        <Text style={s.cardTitle}>🎖️ Duel Record</Text>
        {state.duels.length === 0 ? <Text style={s.desc}>No duels yet. Beat the ladder!</Text> :
          state.duels.map((d, i) => (
            <View key={i} style={s.rowItem}><Text style={s.name}>{d.rival}</Text><Text style={s.desc}>{d.wins} win(s)</Text></View>
          ))}
      </Card>
    </Screen>
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
