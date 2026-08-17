import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, StatRow } from '../components/ui';
import { DetailScreen } from '../components/DetailScreen';
import { ScreenHeader } from '../components/Header';
import { colors } from '../theme/colors';
import { CLASSES, computePower, levelFromXP } from '../engine';
import { fetchLeaderboard, LeaderboardEntry } from '../services/sync';

// Shown only when the player is offline / signed out, so the board is never
// blank. Real rows come from the server.
const DEMO_RIVALS = [
  { name: 'Atlas', icon: '🦾', lvl: 9, xp: 1840 },
  { name: 'Nyx', icon: '🌙', lvl: 7, xp: 1320 },
  { name: 'Rook', icon: '🐺', lvl: 6, xp: 1110 },
  { name: 'Ember', icon: '🔥', lvl: 4, xp: 640 },
  { name: 'Sage', icon: '🦉', lvl: 3, xp: 410 },
];

interface Row { name: string; icon: string; lvl: number; xp: number; isMe: boolean }

export default function SocialScreen() {
  const state = useGame(s => s.state)!;
  const signedIn = useAuth(s => s.auth.status === 'signedIn');
  const cls = CLASSES.find(c => c.id === state.cls)!;
  const me = { name: state.name, icon: cls.icon, lvl: state.level, xp: state.totalXP, isMe: true };

  const [live, setLive] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) { setLive(null); return; }
    setLoading(true);
    const data = await fetchLeaderboard(50);
    setLive(data.length ? data : null);
    setLoading(false);
  }, [signedIn]);

  useEffect(() => { load(); }, [load]);

  // Real board when the server gave us rows; otherwise the demo list.
  const rows: Row[] = live
    ? live.map(e => ({
        name: e.name,
        icon: e.isMe ? cls.icon : '🗡️',
        lvl: levelFromXP(e.xp),
        xp: e.xp,
        isMe: e.isMe,
      }))
    : [...DEMO_RIVALS.map(r => ({ ...r, isMe: false })), me].sort((a, b) => b.xp - a.xp);

  const myIdx = rows.findIndex(r => r.isMe);
  const myRank = myIdx >= 0 ? myIdx + 1 : rows.length + 1;

  return (
    <DetailScreen title="Leaderboard">
      <ScreenHeader icon="trophy" title="Guild Leaderboard" subtitle={`Compete with your guild. You rank #${myRank}`} accent="#ffd166" />

      <Card>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>Season 1</Text>
          <Pill>⚔️ {computePower(state)} power</Pill>
        </View>
        {loading && !live ? (
          <ActivityIndicator color={colors.gold} style={{ marginVertical: 16 }} />
        ) : (
          rows.map((r, i) => (
            <View key={`${r.name}-${i}`} style={[s.row, r.isMe && s.meRow]}>
              <Text style={[s.rank, i === 0 && { color: colors.gold }, i === 1 && { color: '#cfd6ff' }, i === 2 && { color: colors.accent2 }]}>{i + 1}</Text>
              <View style={s.av}><Text style={{ fontSize: 17 }}>{r.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.name}{r.isMe ? ' (you)' : ''}</Text>
                <Text style={s.desc}>Lv {r.lvl}</Text>
              </View>
              <Text style={s.xp}>{r.xp} XP</Text>
            </View>
          ))
        )}
        {!live && (
          <Text style={[s.desc, { textAlign: 'center', marginTop: 10 }]}>
            {signedIn ? 'Showing sample rivals — log a workout to join the live board.' : 'Sign in to see the live leaderboard.'}
          </Text>
        )}
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
    </DetailScreen>
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
