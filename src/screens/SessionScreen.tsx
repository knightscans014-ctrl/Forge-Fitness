/**
 * LIVE SESSION — the screen you leave open while you actually train.
 *
 * This is the app's centrepiece: a fight that plays out in real time against a
 * clock you started before your workout. Every design choice here serves one
 * goal — the phone should feel like it is *with you* during the set, not
 * waiting to be filled in afterwards.
 *
 * The screen owns the clock and calls the pure reducers in engine/session.ts.
 * It ticks once a second for the countdown, but combat state is always derived
 * from timestamps, so a locked phone resolves correctly on return.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGame } from '../context/GameContext';
import { Btn, SystemWindow, SystemBar, CornerBrackets, ScanLines } from '../components/ui';
import { DetailScreen } from '../components/DetailScreen';
import { colors } from '../theme/colors';
import {
  ENGINE, ABILITIES, tickSession, useAbility, sessionMinutes,
  type LiveSession,
} from '../engine';

function mmss(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(t / 60);
  const sec = t % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function SessionScreen({ navigation }: any) {
  const state = useGame(s => s.state)!;
  const { mutate, notify, celebrate } = useGame();
  const sess = state.liveSession as LiveSession | null;

  const [, force] = useState(0);
  const shake = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const lastPhase = useRef(sess?.phase);

  /* -- impact feedback ------------------------------------------------ */
  const hit = useCallback((heavy: boolean) => {
    Haptics.impactAsync(
      heavy ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  }, [shake, flash]);

  /* -- the enemy breathes so the screen never looks frozen ------------ */
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1.0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  /* -- the clock ------------------------------------------------------ */
  useEffect(() => {
    if (!sess || sess.phase !== 'active') return;
    const id = setInterval(() => {
      mutate(s => {
        if (s.liveSession) tickSession(s, s.liveSession, Date.now());
      });
      force(n => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [sess?.phase, mutate]);

  /* -- resolve the fight after the app was backgrounded --------------- */
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') {
        mutate(s => { if (s.liveSession) tickSession(s, s.liveSession, Date.now()); });
        force(n => n + 1);
      }
    });
    return () => sub.remove();
  }, [mutate]);

  /* -- react to a phase change ---------------------------------------- */
  useEffect(() => {
    if (!sess) return;
    if (lastPhase.current === 'active' && sess.phase !== 'active') {
      hit(true);
      if (sess.phase === 'won') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
    lastPhase.current = sess.phase;
  }, [sess?.phase, hit]);

  if (!sess) {
    return (
      <DetailScreen title="Live Session">
        <SystemWindow label="No Session" accent={colors.mut2}>
          <Text style={s.dim}>No session is running. Start one from Log Activity.</Text>
          <View style={{ height: 10 }} />
          <Btn title="Back" kind="ghost" onPress={() => navigation.goBack()} />
        </SystemWindow>
      </DetailScreen>
    );
  }

  const now = Date.now();
  const mins = sessionMinutes(sess, now);
  const elapsed = now - sess.started;
  const foePct = (sess.foe.hp / sess.foe.maxHp) * 100;
  const youPct = (sess.hp / sess.maxHp) * 100;
  const over = sess.phase !== 'active';
  const accent = sess.phase === 'won' ? colors.xpa : sess.phase === 'lost' ? colors.crimson : colors.crimson;

  const tx = shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] });

  function fire(abId: string) {
    let res: any = null;
    mutate(st => {
      if (!st.liveSession) return;
      tickSession(st, st.liveSession, Date.now());
      res = useAbility(st, st.liveSession, abId, Date.now());
    });
    force(n => n + 1);
    if (res?.ok) {
      hit(res.crit || res.dmg > 0);
      if (res.healed) notify(`🌬️ Second Wind — +${res.healed} HP`);
      else if (res.crit) notify(`💥 CRITICAL — ${res.dmg} damage!`);
    } else if (res?.reason) {
      notify(res.reason);
    }
  }

  function finish(abandoned: boolean) {
    let out: any = null;
    mutate(st => {
      if (!st.liveSession) return;
      tickSession(st, st.liveSession, Date.now());
      out = ENGINE.finishSession(st, st.liveSession, Date.now(), abandoned);
      st.liveSession = null;
    });
    if (out?.ok) {
      if (out.won) {
        celebrate({
          title: 'VICTORY',
          big: 'ENEMY DOWN',
          subtitle: `${out.minutes} min · +${out.xp} XP · +${out.gold}🪙`,
          accent: colors.xpa,
        });
      } else {
        notify(`Session logged — ${out.minutes} min · +${out.xp} XP`);
      }
    } else {
      notify('Session ended — too short to count.');
    }
    navigation.goBack();
  }

  return (
    <DetailScreen title="Live Session">
      {/* ---- the enemy ---- */}
      <Animated.View style={{ transform: [{ translateX: tx }] }}>
        <SystemWindow label={over ? (sess.phase === 'won' ? 'Victory' : 'Defeat') : 'Engaged'} accent={accent} glow>
          <View style={s.foeWrap}>
            <Animated.Text style={[s.foeIcon, { transform: [{ scale: pulse }] }]}>
              {sess.foe.icon}
            </Animated.Text>
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.crimson, opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]}
            />
          </View>
          <Text style={s.foeName}>{sess.foe.name}</Text>
          <SystemBar pct={foePct} color={colors.crimson} height={14}
            label={`ENEMY  ${sess.foe.hp} / ${sess.foe.maxHp}`} />
          <View style={{ height: 12 }} />
          <SystemBar pct={youPct} color={colors.xpa} height={12}
            label={`YOU  ${sess.hp} / ${sess.maxHp}`} />
        </SystemWindow>
      </Animated.View>

      {/* ---- the clock: the thing you glance at mid-set ---- */}
      <SystemWindow label="Session" accent={colors.sys}>
        <Text style={s.clock}>{mmss(elapsed)}</Text>
        <Text style={s.clockSub}>
          {sess.icon} {sess.name.toUpperCase()} · {mins} MIN BANKED
        </Text>
        <Text style={s.hint}>
          {over
            ? 'Fight over — bank it to collect your rewards.'
            : 'Every minute you train hits the enemy. Keep going.'}
        </Text>
      </SystemWindow>

      {/* ---- abilities ---- */}
      {!over && (
        <SystemWindow label="Burst Abilities" accent={colors.violet}>
          <Text style={s.hint}>Do the thing, then tap. Limited per session.</Text>
          <View style={{ height: 8 }} />
          {ABILITIES.map(a => {
            const used = sess.used[a.id] || 0;
            const left = a.limit - used;
            const spent = left <= 0;
            return (
              <Pressable
                key={a.id}
                disabled={spent}
                onPress={() => fire(a.id)}
                style={({ pressed }) => [
                  s.ability,
                  spent && { opacity: 0.35 },
                  pressed && !spent && { backgroundColor: 'rgba(94,242,255,0.10)' },
                ]}
              >
                <Text style={s.abIcon}>{a.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.abName}>{a.name}</Text>
                  <Text style={s.abPrompt}>{a.prompt}</Text>
                </View>
                <Text style={[s.abLeft, spent && { color: colors.mut2 }]}>
                  {spent ? 'SPENT' : `${left}×`}
                </Text>
              </Pressable>
            );
          })}
        </SystemWindow>
      )}

      {/* ---- combat log ---- */}
      <SystemWindow label="Combat Log" accent={colors.sys} scan={false}>
        {sess.log.slice(-6).reverse().map((l, i) => (
          <Text key={i} style={[
            s.log,
            l.c === 'crit' && { color: colors.gold, fontWeight: '900' },
            l.c === 'you' && { color: colors.xpa },
            l.c === 'foe' && { color: colors.crimson },
          ]}>
            {l.c === 'sys' ? '› ' : ''}{l.t}
          </Text>
        ))}
      </SystemWindow>

      <View style={{ height: 4 }} />
      {over ? (
        <Btn title="Bank Rewards" kind="green" onPress={() => finish(false)} />
      ) : (
        <>
          <Btn title="Finish & Bank" kind="green" onPress={() => finish(false)} />
          <View style={{ height: 8 }} />
          <Btn title="Abandon" kind="ghost" onPress={() => finish(true)} />
        </>
      )}
      <View style={{ height: 28 }} />
    </DetailScreen>
  );
}

const s = StyleSheet.create({
  foeWrap: { height: 130, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  foeIcon: { fontSize: 82 },
  foeName: { color: colors.ink, fontWeight: '900', fontSize: 19, textAlign: 'center', letterSpacing: 1, marginBottom: 12 },
  clock: { color: colors.sys, fontSize: 56, fontWeight: '900', textAlign: 'center', letterSpacing: 3, fontVariant: ['tabular-nums'] },
  clockSub: { color: colors.ink2, fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textAlign: 'center', marginTop: 2 },
  hint: { color: colors.mut, fontSize: 12, textAlign: 'center', marginTop: 8 },
  dim: { color: colors.mut, fontSize: 13 },
  ability: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 10,
    borderWidth: 1, borderColor: colors.sysFaint, borderRadius: 5, marginBottom: 8,
  },
  abIcon: { fontSize: 24 },
  abName: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  abPrompt: { color: colors.mut, fontSize: 11.5, marginTop: 1 },
  abLeft: { color: colors.sys, fontWeight: '900', fontSize: 12, letterSpacing: 1.2 },
  log: { color: colors.mut, fontSize: 12, paddingVertical: 3 },
});
