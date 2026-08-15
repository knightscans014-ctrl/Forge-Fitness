import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Screen, Pill, StatRow } from '../components/ui';
import { colors } from '../theme/colors';
import { CLASSES, computePower } from '../engine';

const RIVALS = [
  { name: 'Atlas', icon: '🦾', lvl: 9, xp: 1840 },
  { name: 'Nyx', icon: '🌙', lvl: 7, xp: 1320 },
  { name: 'Rook', icon: '🐺', lvl: 6, xp: 1110 },
  { name: 'Ember', icon: '🔥', lvl: 4, xp: 640 },
  { name: 'Sage', icon: '🦉', lvl: 3, xp: 410 },
];

export default function SocialScreen() {
  const state = useGame(s => s.state)!;
  const cls = CLASSES.find(c => c.id === state.cls)!;
  const me = { name: state.name, icon: cls.icon, lvl: state.level, xp: state.totalXP };
  const rows = [...RIVALS, me].sort((a, b) => b.xp - a.xp);
  const myRank = rows.findIndex(r => r.xp === me.xp) + 1;

  return (
    <Screen>
      <Text style={s.title}>🏆 Guild Leaderboard</Text>
      <Text style={s.sub}>Compete with your guild. You rank #{myRank}.</Text>

      <Card>
        <View style={s.rowBetween}><Text style={s.cardTitle}>Season 1</Text><Pill>⚔️ {computePower(state)} power</Pill></View>
        {rows.map((r, i) => (
          <View key={r.name} style={[s.row, r.xp === me.xp && s.meRow]}>
            <Text style={[s.rank, i === 0 && { color: colors.gold }, i === 1 && { color: '#cfd6ff' }, i === 2 && { color: colors.accent2 }]}>{i + 1}</Text>
            <View style={s.av}><Text style={{ fontSize: 17 }}>{r.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{r.name}{r.xp === me.xp ? ' (you)' : ''}</Text>
              <Text style={s.desc}>Lv {r.lvl}</Text>
            </View>
            <Text style={s.xp}>{r.xp} XP</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={s.cardTitle}>👥 Guild Chat</Text>
        <View style={s.chat}>
          <Text style={s.desc}>💬 Atlas: "Anyone hitting the boss raid tonight?"</Text>
          <Text style={s.desc}>💬 Nyx: "Just beat Zero-Drop Titan! 🐉"</Text>
          <Text style={s.desc}>💬 Rook: "Leg day. Wish me luck, heroes."</Text>
        </View>
        <Text style={[s.desc, { textAlign: 'center', marginTop: 8 }]}>Guild chat unlocks with Premium 👑</Text>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: 10 },
  sub: { color: colors.mut, fontSize: 13, marginBottom: 8 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  meRow: { backgroundColor: 'rgba(255,209,102,0.05)', borderRadius: 12, paddingHorizontal: 8 },
  rank: { width: 30, textAlign: 'center', fontWeight: '900', color: colors.mut },
  av: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  desc: { color: colors.mut, fontSize: 12 },
  xp: { color: colors.mut2, fontWeight: '800', fontSize: 13 },
  chat: { gap: 8, marginTop: 8 },
});
