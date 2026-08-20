import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { useGame } from '../context/GameContext';
import { Screen, Pill, Btn, SystemWindow, SystemBar, CornerBrackets, ScanLines } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import { colors } from '../theme/colors';
import { ENGINE, BOSSES, currentBoss, bossUnlocked, computePower, critChance, damageResist, effectiveMaxHP } from '../engine';

export default function BattleScreen() {
  const state = useGame(s => s.state)!;
  const { mutate } = useGame();
  const boss = currentBoss(state);
  const unlocked = boss ? bossUnlocked(state, boss) : false;
  const battle = state.bossBattle;

  return (
    <Screen>
      <ScreenHeader icon="sword" iconFamily="mci" title="Battle" subtitle="Slay personal milestone bosses for big rewards + loot" accent="#ff5d73" />

      {boss ? (
        <SystemWindow label={unlocked ? 'Target Acquired' : 'Target Locked'} accent={unlocked ? colors.crimson : colors.mut2} glow={unlocked}>
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
        </SystemWindow>
      ) : (
        <SystemWindow label="Clear" accent={colors.xpa} glow><Text style={s.name}>🏆 All bosses defeated!</Text></SystemWindow>
      )}

      <SystemWindow label="Boss Ladder" accent={colors.sys}>
        <View style={s.rowBetween}><View /><Pill>{state.bosses.length}/{BOSSES.length}</Pill></View>
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
      </SystemWindow>

      <SystemWindow label="Combat Analysis" accent={colors.violet}>
        <View style={s.statLine}><Text style={s.name}>Combat Power</Text><Text style={s.desc}>{computePower(state)}</Text></View>
        <View style={s.statLine}><Text style={s.name}>Crit Chance</Text><Text style={s.desc}>{Math.round(critChance(state) * 100)}%</Text></View>
        <View style={s.statLine}><Text style={s.name}>Damage Resist</Text><Text style={s.desc}>{Math.round(damageResist(state) * 100)}%</Text></View>
      </SystemWindow>

      {/* Active boss battle modal */}
      {battle && (
        <Modal transparent animationType="slide">
          <View style={s.modalBg}>
            <View style={s.sheet}>
              <ScanLines color={colors.crimson} rows={14} opacity={0.06} />
              <CornerBrackets color={colors.crimson} size={18} inset={6} />
              <Text style={s.sysKicker}>ENGAGEMENT</Text>
              <Text style={s.sheetTitle}>{boss?.name ?? 'BOSS BATTLE'}</Text>
              <View style={s.bossSprite}><Text style={{ fontSize: 48 }}>{boss?.icon}</Text></View>
              <SystemBar pct={(battle.bossHp / battle.bossMaxHp) * 100} color={colors.crimson} height={12}
                label={`ENEMY HP  ${battle.bossHp}/${battle.bossMaxHp}`} />
              <View style={{ height: 10 }} />
              <SystemBar pct={(state.hp / effectiveMaxHP(state)) * 100} color={colors.xpa} height={12}
                label={`YOUR HP  ${state.hp}/${effectiveMaxHP(state)}`} />
              <Text style={s.readout}>PWR {computePower(state)}   ·   EN {state.energy}   ·   STRIKE COST 4</Text>
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
  bossSprite: { width: 76, height: 76, borderRadius: 6, backgroundColor: '#1d1233', borderWidth: 1, borderColor: 'rgba(255,45,85,0.35)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 12 },
  name: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  desc: { color: colors.mut, fontSize: 12 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  statLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(4,5,10,0.82)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg2, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,45,85,0.45)', padding: 22, paddingBottom: 32, overflow: 'hidden' },
  sheetTitle: { color: colors.ink, fontWeight: '900', fontSize: 22, textAlign: 'center', letterSpacing: 1 },
  sysKicker: { color: colors.crimson, fontSize: 11, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center' },
  readout: { color: colors.mut, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textAlign: 'center', marginTop: 12 },
  log: { minHeight: 40, marginVertical: 10 },
  row: { flexDirection: 'row', gap: 8 },
});
