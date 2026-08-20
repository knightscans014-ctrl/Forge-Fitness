import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { Icon } from '../theme/icons';
import { colors, rankAura } from '../theme/colors';
import { DAILY_REWARDS, rankForLevel, xpForLevel, effectiveMaxHP, computePower, boosterActive, generateSuggestion } from '../engine';

// The art pack ships four usable portraits for six classes, so they are
// shared deliberately rather than left all-warrior: the two heavy//melee
// classes take the warrior art, the agile pair the animated one, and the
// two caster-ish classes the tall renders. Drop in per-class art later and
// this map is the only thing that changes.
const CLASS_PORTRAIT: Record<string, any> = {
  warrior: require('../../assets/mc/av_warrior.png'),
  paladin: require('../../assets/mc/av_warrior.png'),
  ranger: require('../../assets/mc/av_anim.gif'),
  assassin: require('../../assets/mc/av_anim.gif'),
  monk: require('../../assets/mc/mc_tall1.png'),
  mage: require('../../assets/mc/mc_tall2.png'),
};

export default function HomeScreen() {
  const state = useGame(s => s.state)!;
  const mutate = useGame(s => s.mutate);
  const navigation = useNavigation<any>();

  // Day rollover + first suggestion happen in an effect so render stays pure.
  useEffect(() => {
    mutate(s => { if (!s.suggestion && !s.suggestionDone) generateSuggestion(s); });
  }, []);
  const rk = rankForLevel(state.level);
  const aura = rankAura[rk.id] || colors.sys;
  const xpN = xpForLevel(state.level);
  const xpP = xpForLevel(state.level + 1);
  const prog = state.totalXP - xpN;
  const need = xpP - xpN;
  const hpPct = Math.max(0, Math.round((state.hp / effectiveMaxHP(state)) * 100));
  // Clamped both ends: `need` is never 0 for a valid curve, but a bad import or
  // a level pinned at MAX_LEVEL could make it 0 and render a NaN-width bar.
  const xpPct = need > 0 ? Math.max(0, Math.min(100, Math.round((prog / need) * 100))) : 100;
  const canClaim = ENGINE.dailyClaimAvailable(state);
  const quests = ENGINE.dailyQuests(state);
  const done = quests.filter(q => state.questsDone.includes(q.id)).length;
  const suggestion = state.suggestion;
  // Stamped once by normalize() when a pre-retune save is repriced.
  const prevCurveLevel = (state as unknown as { prevCurveLevel?: number }).prevCurveLevel;

  const live = state.liveSession;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
      {/* A running session must never be losable behind a tab. */}
      {live ? (
        <Pressable
          onPress={() => navigation.navigate('SessionLive')}
          style={styles.liveBanner}
          accessibilityRole="button"
          accessibilityLabel={`Session in progress: ${live.name} versus ${live.foe.name}. Resume.`}
        >
          <Text style={styles.liveDot}>●</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.liveTitle}>SESSION IN PROGRESS</Text>
            <Text style={styles.liveSub}>
              {live.icon} {live.name} · vs {live.foe.name}
            </Text>
          </View>
          <Text style={styles.liveGo}>RESUME ›</Text>
        </Pressable>
      ) : null}

      {/* A returning player whose save predates the curve retune would other-
          wise open the app to a much lower level and read it as lost progress.
          Explain it once, then let them dismiss it for good. */}
      {prevCurveLevel ? (
        <Pressable
          onPress={() => mutate(s => { delete (s as any).prevCurveLevel; })}
          style={styles.curveNotice}
          accessibilityRole="button"
          accessibilityLabel={`Level scale updated. You were level ${prevCurveLevel}, now level ${state.level}. Tap to dismiss.`}
        >
          <Text style={styles.curveTitle}>⚙ LEVEL SCALE UPDATED</Text>
          <Text style={styles.curveBody}>
            Levels used to arrive far too quickly — S-rank was reachable in under a week.
            The scale has been rebuilt, so you now read as{' '}
            <Text style={styles.curveEm}>Lv {state.level}</Text> instead of{' '}
            <Text style={styles.curveEm}>Lv {prevCurveLevel}</Text>.
          </Text>
          <Text style={styles.curveBody}>
            Nothing was taken away. Your XP, gold, gear, achievements, defeated bosses and
            skill points are all untouched — only the number is priced differently, and
            there is a lot more ladder above you now.
          </Text>
          <Text style={styles.curveDismiss}>TAP TO DISMISS</Text>
        </Pressable>
      ) : null}

      {/* ===== Status window ===== */}
      <View style={[styles.hero, { borderColor: `${aura}55`, shadowColor: aura }]}>
        {/* scan lines + corner brackets: the "system panel" tell */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: 10 }, (_, i) => (
            <View key={i} style={{ flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: aura, opacity: 0.045 }} />
          ))}
        </View>
        <View style={[styles.hCorner, { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2, borderColor: aura }]} />
        <View style={[styles.hCorner, { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2, borderColor: aura }]} />
        <View style={[styles.hCorner, { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: aura }]} />
        <View style={[styles.hCorner, { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderColor: aura }]} />

        <View style={styles.statusTag}>
          <Text style={[styles.statusTagText, { color: aura }]}>Status</Text>
        </View>

        <View style={styles.heroTop}>
          <View style={[styles.avatarWrap, { borderColor: aura }]}>
            <Image source={CLASS_PORTRAIT[state.cls] || CLASS_PORTRAIT.warrior} style={styles.avatar} />
            <View style={[styles.rankChip, { backgroundColor: rk.color }]}>
              <Text style={styles.rankChipText}>{rk.id}</Text>
            </View>
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.greeting, { color: aura }]}>Hunter</Text>
            <Text style={styles.name}>{state.name}</Text>
            <Text style={styles.classLine}>{rk.title} · Level {state.level}</Text>
          </View>
          <View style={[styles.powerBadge, { borderColor: `${colors.gold}55` }]}>
            <Icon name="shield-checkmark" size={13} color={colors.gold} />
            <Text style={styles.powerText}>{computePower(state)}</Text>
          </View>
        </View>

        {/* XP / HP gauges */}
        <View style={styles.barRow}>
          <Text style={[styles.barTag, { color: colors.xpa }]}>XP</Text>
          <View style={[styles.xpTrack, { borderColor: `${colors.xpa}44` }]}>
            <View style={[styles.xpFill, { width: `${xpPct}%`, shadowColor: colors.xpa }]} />
          </View>
          <Text style={styles.barNum}>{xpPct}%</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={[styles.barTag, { color: colors.hp }]}>HP</Text>
          <View style={[styles.xpTrack, { borderColor: `${colors.hp}44` }]}>
            <View style={[styles.xpFill, { width: `${hpPct}%`, backgroundColor: colors.hp, shadowColor: colors.hp }]} />
          </View>
          <Text style={styles.barNum}>{state.hp}/{effectiveMaxHP(state)}</Text>
        </View>
      </View>

      {/* ===== Quick actions grid ===== */}
      <View style={styles.grid}>
        <Pressable
          style={styles.gridItem}
          onPress={() => navigation.navigate('Quests')}
          accessibilityRole="button"
          accessibilityLabel={`Quests. ${done} of ${quests.length} done.`}
        >
          <View style={[styles.gridIcon, { backgroundColor: colors.mana + '22' }]}>
            <Icon name="list-circle" size={24} color={colors.mana} />
          </View>
          <Text style={styles.gridLabel}>Quests</Text>
          <Text style={styles.gridSub}>{done}/{quests.length} done</Text>
        </Pressable>
        <Pressable
          style={styles.gridItem}
          onPress={() => navigation.navigate('Battle')}
          accessibilityRole="button"
          accessibilityLabel="Battle. Slay bosses."
        >
          <View style={[styles.gridIcon, { backgroundColor: colors.hp + '22' }]}>
            <Icon name="sword" size={24} color={colors.hp} family="mci" />
          </View>
          <Text style={styles.gridLabel}>Battle</Text>
          <Text style={styles.gridSub}>Slay bosses</Text>
        </Pressable>
        <Pressable
          style={styles.gridItem}
          onPress={() => navigation.navigate('LogDetail')}
          accessibilityRole="button"
          accessibilityLabel="Log. Train now."
        >
          <View style={[styles.gridIcon, { backgroundColor: colors.en + '22' }]}>
            <Icon name="flash" size={24} color={colors.en} />
          </View>
          <Text style={styles.gridLabel}>Log</Text>
          <Text style={styles.gridSub}>Train now</Text>
        </Pressable>
        <Pressable
          style={styles.gridItem}
          onPress={() => navigation.navigate('Character')}
          accessibilityRole="button"
          accessibilityLabel="Character. Status and gear."
        >
          <View style={[styles.gridIcon, { backgroundColor: colors.str + '22' }]}>
            <Icon name="shield-checkmark" size={24} color={colors.str} />
          </View>
          <Text style={styles.gridLabel}>Character</Text>
          <Text style={styles.gridSub}>Status & gear</Text>
        </Pressable>
        <Pressable
          style={styles.gridItem}
          onPress={() => navigation.navigate('TrialsDetail')}
          accessibilityRole="button"
          accessibilityLabel="Trials. Weekly boss and bouts."
        >
          <View style={[styles.gridIcon, { backgroundColor: colors.en + '22' }]}>
            <Icon name="sword" size={24} color={colors.en} family="mci" />
          </View>
          <Text style={styles.gridLabel}>Trials</Text>
          <Text style={styles.gridSub}>Weekly boss & bouts</Text>
        </Pressable>
        <Pressable
          style={styles.gridItem}
          onPress={() => navigation.navigate('ProgressDetail')}
          accessibilityRole="button"
          accessibilityLabel="Progress. Analytics."
        >
          <View style={[styles.gridIcon, { backgroundColor: colors.xpa + '22' }]}>
            <Icon name="chart-box" size={24} color={colors.xpa} family="mci" />
          </View>
          <Text style={styles.gridLabel}>Progress</Text>
          <Text style={styles.gridSub}>Analytics</Text>
        </Pressable>
      </View>

      {/* ===== Daily reward ===== */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Reward</Text>
        {canClaim ? (
          <Pressable
            style={styles.claimBtn}
            accessibilityRole="button"
            accessibilityLabel="Claim daily reward"
            onPress={() => {
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
            <Pressable
              onPress={() => mutate(s => generateSuggestion(s))}
              accessibilityRole="button"
              accessibilityLabel="Get a different system quest"
            >
              <Icon name="refresh" size={18} color={colors.mut} />
            </Pressable>
          </View>
          <Text style={styles.sysTitle}>{suggestion.icon} {suggestion.text}</Text>
          <Pressable
            style={styles.sysBtn}
            accessibilityRole="button"
            accessibilityLabel={`Complete system quest: ${suggestion.text}. Plus ${suggestion.xp} XP.`}
            onPress={() => {
            mutate(s => { ENGINE.completeSuggestion(s); useGame.getState().notify(`System quest +${suggestion.xp} XP`); generateSuggestion(s); });
          }}>
            <Text style={styles.sysBtnText}>Complete · +{suggestion.xp} XP</Text>
          </Pressable>
        </View>
      ) : null}

      {/* ===== Today's quests preview (top 2) ===== */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today&apos;s Quests</Text>
        <Pressable
          onPress={() => navigation.navigate('Quests')}
          accessibilityRole="button"
          accessibilityLabel="See all quests"
        >
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
  curveNotice: {
    borderWidth: 1,
    borderColor: `${colors.sys}55`,
    backgroundColor: '#0b1220',
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  curveTitle: { color: colors.sys, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  curveBody: { color: '#b9c6dd', fontSize: 12, lineHeight: 18 },
  curveEm: { color: '#fff', fontWeight: '800' },
  curveDismiss: { color: '#6b7a93', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 2 },
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: colors.glass, borderWidth: 1, borderRadius: 8, padding: 16, paddingTop: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6,
  },
  liveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,45,85,0.55)', borderRadius: 5,
    backgroundColor: 'rgba(255,45,85,0.10)',
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12,
  },
  liveDot: { color: colors.crimson, fontSize: 14 },
  liveTitle: { color: colors.crimson, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  liveSub: { color: colors.ink2, fontSize: 12.5, fontWeight: '700', marginTop: 2 },
  liveGo: { color: colors.crimson, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  hCorner: { position: 'absolute', width: 14, height: 14 },
  statusTag: { position: 'absolute', top: 0, left: 16, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.bg2, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  statusTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase' },
  barTag: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, width: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { width: 64, height: 64, borderRadius: 6, overflow: 'hidden', borderWidth: 2 },
  avatar: { width: '100%', height: '100%' },
  rankChip: { position: 'absolute', bottom: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rankChipText: { color: '#231500', fontWeight: '900', fontSize: 12 },
  heroInfo: { flex: 1 },
  greeting: { fontSize: 9, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase' },
  name: { color: colors.ink, fontWeight: '900', fontSize: 20 },
  classLine: { color: colors.mut, fontSize: 12 },
  powerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,209,102,0.08)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  powerText: { color: colors.gold, fontWeight: '900', fontSize: 13 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  xpTrack: { flex: 1, height: 9, backgroundColor: colors.bg, borderWidth: 1, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: colors.xpa, borderRadius: 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 5 },
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
