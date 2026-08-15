import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Screen, Pill, Bar, Btn } from '../components/ui';
import { colors } from '../theme/colors';
import {
  ENGINE, rankForLevel, nextRank, rankProgressPct, xpForLevel, effectiveMaxHP,
  computePower, comboMult, dayChallenge, boosterActive, boosterDef,
} from '../engine';

export default function HomeScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const state = useGame(s => s.state)!;
  const { mutate } = useGame();

  ENGINE.dayReset(state);
  const rk = rankForLevel(state.level);
  const nr = nextRank(state.level);
  const rkPct = rankProgressPct(state.level);
  const xpN = xpForLevel(state.level);
  const xpP = xpForLevel(state.level + 1);
  const prog = state.totalXP - xpN;
  const need = xpP - xpN;
  const hpPct = Math.max(0, Math.round((state.hp / effectiveMaxHP(state)) * 100));
  const xpPct = Math.max(0, Math.round((prog / need) * 100));
  const enPct = Math.round((state.energy / state.maxEnergy) * 100);
  const quests = ENGINE.dailyQuests(state);
  const done = quests.filter(q => state.questsDone.includes(q.id)).length;
  const dc = dayChallenge(state);
  const cmb = ENGINE.comboMult(state);

  const activeBoosters = ['b_xp', 'b_gold', 'b_combo'].filter(id => boosterActive(state, id));

  return (
    <Screen>
      <View style={s.hero}>
        <View style={[s.avatarWrap, { borderColor: rk.color }]}>
          <Image source={require('../../assets/mc/av_warrior.png')} style={s.avatar} />
          <View style={s.lvlBadge}><Text style={s.lvlText}>Lv {state.level}</Text></View>
        </View>
        <Text style={s.name}>{state.name}</Text>
        <Text style={s.classLine}>⚔️ {computePower(state)} power</Text>
        <View style={s.rankRow}>
          <Text style={[s.rankIcon, { color: rk.color }]}>{rk.icon}</Text>
          <Text style={s.rankText}>{rk.id}-RANK</Text>
          {nr ? <Text style={s.rankNext}>→ {nr.id} @ Lv{nr.lvl}</Text> : null}
        </View>
        <Text style={[s.rankTitle, { color: rk.color }]}>{rk.title.toUpperCase()}</Text>
        <Bar pct={rkPct} color={rk.color} />
        <Text style={s.barLabel}><Text>Rank Progress</Text><Text>{rkPct}% to {nr ? nr.id + '-rank' : 'MAX'}</Text></Text>
        <Bar pct={hpPct} color={colors.hp} />
        <Text style={s.barLabel}><Text>❤️ HP</Text><Text>{state.hp}/{effectiveMaxHP(state)}</Text></Text>
        <Bar pct={xpPct} color={colors.xpa} />
        <Text style={s.barLabel}><Text>⭐ XP {state.totalXP}</Text><Text>{prog}/{need}</Text></Text>
        <Bar pct={enPct} color={colors.en} />
        <Text style={s.barLabel}><Text>⚡ Energy</Text><Text>{state.energy}/{state.maxEnergy}</Text></Text>
      </View>

      {/* dopamine strip */}
      <Card style={s.compact}>
        <View style={s.row}>
          <Pill color={colors.gold}>
            <Text onPress={() => onNavigate('missions')}>🎁 Challenge: {state.dailyChallengeDone ? 'done ✓' : dc.name}</Text>
          </Pill>
          <Pill color={colors.accent2}>
            <Text onPress={() => onNavigate('missions')}>🔥 Combo {state.combo.n} · +{Math.round((cmb - 1) * 100)}%</Text>
          </Pill>
        </View>
        {activeBoosters.length > 0 ? (
          <View style={s.row}>
            {activeBoosters.map(id => {
              const d = boosterDef(id)!;
              const a = boosterActive(state, id)!;
              return (
                <Pill key={id} color={colors.mana}>
                  {d.icon} {Math.max(0, Math.ceil((a.expires - Date.now()) / 60000))}m
                </Pill>
              );
            })}
          </View>
        ) : null}
      </Card>

      <Card>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>🎯 Today's Quests</Text>
          <Pill color={colors.xpa}>{done}/{quests.length} done</Pill>
        </View>
        {quests.map(q => {
          const isDone = state.questsDone.includes(q.id);
          return (
            <View key={q.id} style={[s.quest, isDone && { opacity: 0.5 }]}>
              <View style={s.questIcon}><Text style={{ fontSize: 20 }}>{q.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.statName}>{q.title}</Text>
                <Text style={s.statDesc}>{q.desc} · <Text style={{ color: colors.xpa }}>+{q.xp} XP</Text></Text>
              </View>
              {isDone ? <Text style={s.doneCheck}>✓</Text> :
                <Btn small title="Complete" onPress={() => mutate(s => ENGINE.completeQuest(s, q.id))} />}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 10 },
  avatarWrap: { width: 110, height: 110, borderRadius: 26, overflow: 'hidden', borderWidth: 2, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: '100%', height: '100%' },
  lvlBadge: { position: 'absolute', bottom: -10, left: '50%', transform: [{ translateX: -25 }], backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3 },
  lvlText: { color: '#231500', fontWeight: '900', fontSize: 13 },
  name: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: 16 },
  classLine: { color: colors.mut, fontSize: 13, marginTop: 2 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  rankIcon: { fontSize: 24, fontWeight: '900' },
  rankText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  rankNext: { fontSize: 11, color: colors.mut, fontWeight: '700' },
  rankTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 2, marginBottom: 8 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', color: colors.mut, fontSize: 11, marginTop: 3 },
  compact: { padding: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  questIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  statName: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  statDesc: { color: colors.mut, fontSize: 11.5 },
  doneCheck: { color: colors.xpa, fontWeight: '900', fontSize: 18 },
});
