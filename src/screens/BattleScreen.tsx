import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { useGame } from '../context/GameContext';
import { Card, Screen, Pill, Bar, Btn } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import { colors } from '../theme/colors';
import {
  ENGINE, BOSSES, currentBoss, bossUnlocked, startBossBattle, computePower,
  critChance, damageResist,
} from '../engine';

export default function BattleScreen() {
  const state = useGame(s => s.state)!;
  const { mutate } = useGame();
  const boss = currentBoss(state);
  const unlocked = boss ? bossUnlocked(state, boss) : false;
  const battle = state.bossBattle;

  return (
    <Screen>
      <ScreenHeader icon="sword" title="Battle" subtitle="Slay personal milestone bosses for big rewards + loot" accent="#ff5d73" />

      {boss ? (
        <Card border={colors.mana}>
          <View style={s.bossRow}>
            <View style={s.bossSprite}><Text style={{ fontSize: 40 }}>{boss.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{boss.name}</Text>
              <Text style={s.desc}>Lv {boss.lvl} · HP {boss.hp} · Unlock: {boss.unlock}</Text>
              <View style={s.tagRow}>
                <Pill color={colors.xpa}>+{boss.xp} XP</Pill>
                <Pill color={colors.gold}>+{boss.gold}🪙</Pill>
                <Pill color={colors.mana}>💎 Loot</Pill>
              </View>
            </View>
          </View>
          {unlocked ? (
            <Btn title={`⚔️ RAID ${boss.name}!`} onPress={() => mutate(s => { ENGINE.startBossBattle(s); })} />
          ) : (
            <Text style={[s.desc, { textAlign: 'center' }]}>🔒 Locked — {boss.unlock}</Text>
          )}
        </Card>
      ) : (
        <Card border={colors.xpa}><Text style={s.name}>🏆 All bosses defeated!</Text></Card>
      )}

      <Card>
        <View style={s.rowBetween}><Text style={s.cardTitle}>📜 Boss Ladder</Text><Pill>{state.bosses.length}/{BOSSES.length}</Pill></View>
        {BOSSES.map(b => {
          const dead = state.bosses.includes(b.id);
          const un = bossUnlocked(state, b);
          return (
            <View key={b.id} style={[s.rowItem, dead && { opacity: 0.5 }]}>
              <Text style={{ fontSize: 20 }}>{b.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{b.name} {dead ? '✓' : ''}</Text>
                <Text style={s.desc}>Unlock: {b.unlock}</Text>
              </View>
              <Text style={{ color: dead ? colors.xpa : un ? colors.gold : colors.mut2, fontWeight: '800' }}>
                {dead ? 'DEFEATED' : un ? 'READY' : '🔒'}
              </Text>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={s.cardTitle}>⚔️ Combat Stats</Text>
        <View style={s.statLine}><Text style={s.name}>Combat Power</Text><Text style={s.desc}>{computePower(state)}</Text></View>
        <View style={s.statLine}><Text style={s.name}>Crit Chance</Text><Text style={s.desc}>{Math.round(critChance(state) * 100)}%</Text></View>
        <View style={s.statLine}><Text style={s.name}>Damage Resist</Text><Text style={s.desc}>{Math.round(damageResist(state) * 100)}%</Text></View>
      </Card>

      {/* Active boss battle modal */}
      {battle && (
        <Modal transparent animationType="slide">
          <View style={s.modalBg}>
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>⚔️ BOSS BATTLE</Text>
              <Text style={s.desc}>Strike costs ⚡4. Survive & win!</Text>
              <View style={s.bossSprite}><Text style={{ fontSize: 48 }}>{boss?.icon}</Text></View>
              <Bar pct={(battle.bossHp / battle.bossMaxHp) * 100} color={colors.hp} />
              <Text style={s.desc}>{battle.bossHp}/{battle.bossMaxHp}</Text>
              <Bar pct={(state.hp / (state.maxHP + state.stats.vit * 2)) * 100} color={colors.xpa} />
              <Text style={s.desc}>You: ⚔️{computePower(state)} · HP {state.hp} · ⚡{state.energy}</Text>
              <View style={s.log}>
                {battle.log.slice(-5).map((l, i) => (
                  <Text key={i} style={{ color: l.c === 'crit' ? colors.gold : l.c === 'you' ? colors.xpa : colors.mut, fontSize: 12 }}>
                    {l.t}
                  </Text>
                ))}
              </View>
              <View style={s.row}>
                <Btn small kind="ghost" title="Heal (20🪙)" onPress={() => mutate(s => { ENGINE.bossHeal(s); })} />
                <Btn small kind="danger" title={`Strike (⚡4)`} onPress={() => mutate(s => { ENGINE.bossStrike(s); })} />
              </View>
              <View style={{ height: 8 }} />
              <Btn kind="ghost" title="Retreat" onPress={() => mutate(s => { ENGINE.retreatBoss(s); })} />
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: 10 },
  sub: { color: colors.mut, fontSize: 13, marginBottom: 8 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bossRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bossSprite: { width: 76, height: 76, borderRadius: 18, backgroundColor: '#1d1233', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  desc: { color: colors.mut, fontSize: 12 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  statLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(4,5,10,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg2, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 32 },
  sheetTitle: { color: colors.ink, fontWeight: '900', fontSize: 20, textAlign: 'center' },
  log: { minHeight: 40, marginVertical: 10 },
  row: { flexDirection: 'row', gap: 8 },
});
