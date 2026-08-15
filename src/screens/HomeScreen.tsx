import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { Icon } from '../theme/icons';
import { colors } from '../theme/colors';
import { DAILY_REWARDS, rankForLevel, nextRank, rankProgressPct, xpForLevel, effectiveMaxHP, computePower, comboMult, boosterActive, boosterDef, dayChallenge, generateSuggestion } from '../engine';

export default function HomeScreen() {
  const state = useGame(s => s.state)!;
  const mutate = useGame(s => s.mutate);
  const navigation = useNavigation<any>();

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
  const canClaim = ENGINE.dailyClaimAvailable(state);
  const quests = ENGINE.dailyQuests(state);
  const done = quests.filter(q => state.questsDone.includes(q.id)).length;
  const dc = dayChallenge(state);
  const cmb = Math.round((comboMult(state) - 1) * 100);
  const suggestion = state.suggestion;
  if (!suggestion && !state.suggestionDone) generateSuggestion(state);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
      {/* ===== Status hero (compact, professional) ===== */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.avatarWrap}>
            <Image source={require('../../assets/mc/av_warrior.png')} style={styles.avatar} />
            <View style={[styles.rankChip, { backgroundColor: rk.color }]}>
              <Text style={styles.rankChipText}>{rk.id}</Text>
            </View>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{state.name}</Text>
            <Text style={styles.classLine}>{rk.title} · Level {state.level}</Text>
          </View>
          <View style={styles.powerBadge}>
            <Icon name="shield-checkmark" size={14} color={colors.gold} />
            <Text style={styles.powerText}>{computePower(state)}</Text>
          </View>
        </View>

        {/* XP bar */}
        <View style={styles.barRow}>
          <Icon name="star" size={13} color={colors.xpa} />
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xpPct}%` }]} />
          </View>
          <Text style={styles.barNum}>{xpPct}%</Text>
        </View>
        <View style={styles.barRow}>
          <Icon name="heart" size={13} color={colors.hp} />
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${hpPct}%`, backgroundColor: colors.hp }]} />
          </View>
          <Text style={styles.barNum}>{state.hp}/{effectiveMaxHP(state)}</Text>
        </View>
      </View>

      {/* ===== Quick actions grid ===== */}
      <View style={styles.grid}>
        <Pressable style={styles.gridItem} onPress={() => navigation.navigate('Quests')}>
          <View style={[styles.gridIcon, { backgroundColor: colors.mana + '22' }]}>
            <Icon name="list-circle" size={24} color={colors.mana} family="mci" />
          </View>
          <Text style={styles.gridLabel}>Quests</Text>
          <Text style={styles.gridSub}>{done}/{quests.length} done</Text>
        </Pressable>
        <Pressable style={styles.gridItem} onPress={() => navigation.navigate('Battle')}>
          <View style={[styles.gridIcon, { backgroundColor: colors.hp + '22' }]}>
            <Icon name="sword" size={24} color={colors.hp} family="mci" />
          </View>
          <Text style={styles.gridLabel}>Battle</Text>
          <Text style={styles.gridSub}>Slay bosses</Text>
        </Pressable>
        <Pressable style={styles.gridItem} onPress={() => navigation.navigate('LogDetail')}>
          <View style={[styles.gridIcon, { backgroundColor: colors.en + '22' }]}>
            <Icon name="flash" size={24} color={colors.en} />
          </View>
          <Text style={styles.gridLabel}>Log</Text>
          <Text style={styles.gridSub}>Train now</Text>
        </Pressable>
        <Pressable style={styles.gridItem} onPress={() => navigation.navigate('Character')}>
          <View style={[styles.gridIcon, { backgroundColor: colors.str + '22' }]}>
            <Icon name="shield-checkmark" size={24} color={colors.str} />
          </View>
          <Text style={styles.gridLabel}>Character</Text>
          <Text style={styles.gridSub}>Status & gear</Text>
        </Pressable>
        <Pressable style={styles.gridItem} onPress={() => navigation.navigate('GuildDetail')}>
          <View style={[styles.gridIcon, { backgroundColor: colors.en + '22' }]}>
            <Icon name="account-group" size={24} color={colors.en} family="mci" />
          </View>
          <Text style={styles.gridLabel}>Guild</Text>
          <Text style={styles.gridSub}>Raids & duels</Text>
        </Pressable>
        <Pressable style={styles.gridItem} onPress={() => navigation.navigate('ProgressDetail')}>
          <View style={[styles.gridIcon, { backgroundColor: colors.xpa + '22' }]}>
            <Icon name="chart-box" size={24} color={colors.xpa} />
          </View>
          <Text style={styles.gridLabel}>Progress</Text>
          <Text style={styles.gridSub}>Analytics</Text>
        </Pressable>
        <Pressable style={styles.gridItem} onPress={() => navigation.navigate('SocialDetail')}>
          <View style={[styles.gridIcon, { backgroundColor: colors.gold + '22' }]}>
            <Icon name="trophy" size={24} color={colors.gold} />
          </View>
          <Text style={styles.gridLabel}>Leaderboard</Text>
          <Text style={styles.gridSub}>Compete</Text>
        </Pressable>
      </View>

      {/* ===== Daily reward ===== */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Reward</Text>
        {canClaim ? (
          <Pressable style={styles.claimBtn} onPress={() => {
            mutate(s => {
              const r = ENGINE.claimDaily(s);
              if (r) useGame.getState().notify(`Day ${r.day} reward! +${r.gold}🪙${r.xp ? ' +' + r.xp + ' XP' : ''}${r.energy ? ' +' + r.energy + '⚡' : ''}`);
            });
          }}>
            <Text style={styles.claimBtnText}>Claim</Text>
          </Pressable>
        ) : <Text style={styles.claimedText}>Claimed</Text>}
      </View>
      <View style={styles.dailyRow}>
        {DAILY_REWARDS.map((r, i) => (
          <View key={i} style={[styles.dailyBox, { opacity: (state.daily.claimStreak || 0) > i ? 0.4 : 1 }]}>
            <Icon name="gift" size={15} color={colors.gold} />
            <Text style={styles.dailyDay}>D{i + 1}</Text>
          </View>
        ))}
      </View>

      {/* ===== Active boosters ===== */}
      {(['b_xp', 'b_gold', 'b_combo'].some(id => boosterActive(state, id)) ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Boosters</Text>
        </View>
      ) : null)}
      {(['b_xp', 'b_gold', 'b_combo'].some(id => boosterActive(state, id)) ? (
        <View style={styles.boosterRow}>
          {['b_xp', 'b_gold', 'b_combo'].filter(id => boosterActive(state, id)).map(id => {
            const d = boosterDef(id)!;
            const a = boosterActive(state, id)!;
            return (
              <View key={id} style={styles.boosterChip}>
                <Icon name={id === 'b_xp' ? 'rocket' : id === 'b_gold' ? 'coin' : 'link'} size={14} color={colors.gold} family={id === 'b_gold' ? 'mci' : 'ion'} />
                <Text style={styles.boosterText}>{Math.max(0, Math.ceil((a.expires - Date.now()) / 60000))}m</Text>
              </View>
            );
          })}
        </View>
      ) : null)}

      {/* ===== The System suggestion ===== */}
      {suggestion && !state.suggestionDone ? (
        <View style={[styles.sysCard, { borderColor: colors.mana }]}>
          <View style={styles.sysHeader}>
            <View style={styles.sysBadge}>
              <Icon name="sparkles" size={13} color={colors.mana} />
              <Text style={styles.sysBadgeText}>THE SYSTEM</Text>
            </View>
            <Pressable onPress={() => mutate(s => generateSuggestion(s))}>
              <Icon name="refresh" size={18} color={colors.mut} />
            </Pressable>
          </View>
          <Text style={styles.sysTitle}>{suggestion.icon} {suggestion.text}</Text>
          <Pressable style={styles.sysBtn} onPress={() => {
            mutate(s => { ENGINE.completeSuggestion(s); useGame.getState().notify(`System quest +${suggestion.xp} XP`); generateSuggestion(s); });
          }}>
            <Text style={styles.sysBtnText}>Complete · +{suggestion.xp} XP</Text>
          </Pressable>
        </View>
      ) : null}

      {/* ===== Today's quests preview (top 2) ===== */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Quests</Text>
        <Pressable onPress={() => navigation.navigate('Quests')}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      {quests.slice(0, 2).map(q => {
        const isDone = state.questsDone.includes(q.id);
        return (
          <View key={q.id} style={[styles.questRow, isDone && { opacity: 0.45 }]}>
            <View style={[styles.questIcon, { backgroundColor: colors.card2 }]}>
              <Icon name={q.stat === 'str' ? 'barbell' : q.stat === 'vig' ? 'run' : q.stat === 'vit' ? 'heart' : q.stat === 'flx' ? 'accessibility' : 'brain'} size={20} color={colors.en} family={q.stat === 'str' ? 'mci' : q.stat === 'foc' ? 'mci' : 'ion'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.questTitle}>{q.title}</Text>
              <Text style={styles.questDesc}>{q.desc}</Text>
            </View>
            <Text style={[styles.questReward, isDone && { color: colors.xpa }]}>{isDone ? '✓' : `+${q.xp}`}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

import { ENGINE } from '../engine';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, paddingBottom: 40 },
  hero: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { width: 64, height: 64, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: colors.card2 },
  avatar: { width: '100%', height: '100%' },
  rankChip: { position: 'absolute', bottom: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rankChipText: { color: '#231500', fontWeight: '900', fontSize: 12 },
  heroInfo: { flex: 1 },
  greeting: { color: colors.mut, fontSize: 12 },
  name: { color: colors.ink, fontWeight: '900', fontSize: 20 },
  classLine: { color: colors.mut, fontSize: 12 },
  powerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.card2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  powerText: { color: colors.gold, fontWeight: '900', fontSize: 13 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  xpTrack: { flex: 1, height: 7, backgroundColor: '#1a1e36', borderRadius: 99, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: colors.xpa, borderRadius: 99 },
  barNum: { color: colors.mut, fontSize: 11, fontWeight: '700', width: 52, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  gridItem: { flex: 1, minWidth: '46%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  gridIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { color: colors.ink, fontWeight: '800', fontSize: 14, marginTop: 4 },
  gridSub: { color: colors.mut, fontSize: 11 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  seeAll: { color: colors.accent2, fontWeight: '700', fontSize: 13 },
  claimBtn: { backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  claimBtnText: { color: '#231500', fontWeight: '900', fontSize: 13 },
  claimedText: { color: colors.mut, fontSize: 13, fontWeight: '700' },
  dailyRow: { flexDirection: 'row', gap: 8 },
  dailyBox: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 4 },
  dailyDay: { color: colors.mut, fontSize: 10, fontWeight: '700' },
  boosterRow: { flexDirection: 'row', gap: 8 },
  boosterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  boosterText: { color: colors.gold, fontWeight: '800', fontSize: 13 },
  sysCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 16, backgroundColor: colors.card },
  sysHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sysBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sysBadgeText: { color: colors.mana, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  sysTitle: { color: colors.ink, fontWeight: '700', fontSize: 15, marginVertical: 10 },
  sysBtn: { backgroundColor: colors.mana, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  sysBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, marginBottom: 8 },
  questIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  questTitle: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  questDesc: { color: colors.mut, fontSize: 11.5 },
  questReward: { color: colors.gold, fontWeight: '900', fontSize: 15 },
});
