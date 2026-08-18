import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Screen, Pill, Bar, Btn, StatRow, SystemWindow, SystemLabel } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import { Icon } from '../theme/icons';
import { SkillTreeModal } from '../components/modals';
import { InventoryModal } from '../components/InventoryModal';
import { SaveModal } from '../components/SaveModal';
import { colors } from '../theme/colors';
import { ENGINE, STATS, RANKS, rankForLevel, nextRank, rankProgressPct, statLevels, gearById, equippedCount } from '../engine';

export default function CharacterScreen() {
  const state = useGame(s => s.state)!;
  const { mutate } = useGame();
  const [skillOpen, setSkillOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const lvl = statLevels(state);
  const rk = rankForLevel(state.level);
  const nr = nextRank(state.level);

  return (
    <Screen>
      <ScreenHeader icon="shield-checkmark" title="Hunter Status" subtitle="Your rank reflects your real-world progress" accent="#ff8a5c" />

      <Card border={`${rk.color}66`}>
        <View style={s.statusTop}>
          <Pill color={colors.mana}>HUNTER ID</Pill>
        </View>
        <View style={[s.portraitWrap, { borderColor: rk.color }]}>
          <Image source={require('../../assets/mc/mc_tall1.png')} style={s.portrait} />
        </View>
        <Text style={[s.rankBig, { color: rk.color }]}>{rk.id}-RANK</Text>
        <Text style={s.rankTitle}>{rk.title}</Text>
        <Text style={s.desc}>Level {state.level} · ⚔️ {ENGINE.computePower(state)}</Text>
        <Bar pct={rankProgressPct(state.level)} color={rk.color} />
        <Text style={s.desc}>{rankProgressPct(state.level)}% to {nr ? `${nr.id}-rank` : 'MAX'}</Text>
      </Card>

      <Card>
        <View style={s.rowBetween}><Text style={s.cardTitle}><Icon name="trophy" size={16} color={colors.gold} /> Rank Ladder</Text></View>
        {RANKS.map(r => {
          const reached = state.level >= r.lvl;
          const cur = rk.id === r.id;
          return (
            <View key={r.id} style={[s.rowItem, cur && s.curRow]}>
              <Text style={{ fontSize: 16, color: r.color }}>{r.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: reached ? r.color : colors.mut }]}>{r.id}-Rank · {r.title}</Text>
                <Text style={s.desc}>Reach level {r.lvl}{reached ? ' · Unlocked' : ''}</Text>
              </View>
              <Text style={{ color: reached ? (cur ? colors.gold : r.color) : colors.mut2, fontWeight: '800' }}>{reached ? (cur ? 'CURRENT' : '✓') : '🔒'}</Text>
            </View>
          );
        })}
      </Card>

      <Card>
        <View style={s.rowBetween}><Text style={s.cardTitle}><Icon name="speedometer" size={16} color={colors.en} /> Core Stats</Text><Pill>+{state.skillPoints} pts</Pill></View>
        {STATS.map(st => {
          const lv = lvl[st.id];
          return (
            <StatRow key={st.id} icon={st.icon} iconBg={`${st.color}22`} name={`${st.name}  Lv ${lv}`} desc={st.desc}
              right={<Text style={{ color: st.color, fontWeight: '900' }}>{state.stats[st.id].toFixed(1)}</Text>} />
          );
        })}
        <View style={{ height: 8 }} />
        <Btn kind="ghost" title="🎯 Skill Tree" onPress={() => setSkillOpen(true)} />
      </Card>

      <Card>
        <View style={s.rowBetween}><Text style={s.cardTitle}><Icon name="shield-half-full" size={16} color={colors.str} family="mci" /> Equipment</Text><Pill><Text onPress={() => setInvOpen(true)}>Bag {state.inventory.length}</Text></Pill></View>
        {(['weapon', 'armor', 'accessory'] as const).map(slot => {
          const g = gearById(state, state.equipped[slot]);
          return (
            <StatRow key={slot} icon={g ? g.icon : '·'} name={g ? g.name : `${slot} — empty`}
              desc={g ? `${g.rarity} · +${g.power} power` : 'No item equipped'}
              right={g ? <Pill color={colors.gold}>+{g.power}</Pill> : null} />
          );
        })}
      </Card>

      <Card>
        <Text style={s.cardTitle}><Icon name="flame" size={16} color={colors.accent2} /> Streaks & Progress</Text>
        <View style={s.statsRow}>
          <View style={s.statBox}><Text style={s.statV}>{state.streak}d</Text><Text style={s.desc}>CURRENT</Text></View>
          <View style={s.statBox}><Text style={s.statV}>{state.bestStreak}d</Text><Text style={s.desc}>BEST</Text></View>
          <View style={s.statBox}><Text style={s.statV}>{state.workouts}</Text><Text style={s.desc}>WORKOUTS</Text></View>
        </View>
      </Card>

      <SystemWindow label="Data" accent={colors.sys}>
        <SystemLabel>Backup & Restore</SystemLabel>
        <Text style={s.dataBody}>
          Progress is saved on this device only. Export a backup so a new phone — or a
          reinstall — does not cost you your rank.
        </Text>
        <View style={{ height: 12 }} />
        <Btn kind="ghost" fullWidth title="Backup & Restore" icon="save-outline" onPress={() => setSaveOpen(true)} />
      </SystemWindow>

      <SaveModal visible={saveOpen} onClose={() => setSaveOpen(false)} />
      <SkillTreeModal visible={skillOpen} onClose={() => setSkillOpen(false)} />
      <InventoryModal visible={invOpen} onClose={() => setInvOpen(false)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: 10 },
  sub: { color: colors.mut, fontSize: 13, marginBottom: 8 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between' },
  portraitWrap: { width: 100, height: 130, borderRadius: 20, overflow: 'hidden', borderWidth: 2, alignSelf: 'center', marginVertical: 10 },
  portrait: { width: '100%', height: '100%' },
  rankBig: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  rankTitle: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center' },
  desc: { color: colors.mut, fontSize: 12, textAlign: 'center', marginVertical: 2 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  curRow: { backgroundColor: 'rgba(255,209,102,0.08)', borderRadius: 12, paddingHorizontal: 8 },
  name: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statBox: { flex: 1, backgroundColor: colors.card2, borderRadius: 14, padding: 10, alignItems: 'center' },
  statV: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  dataBody: { color: colors.mut, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
});
