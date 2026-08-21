// Countdown controls for a timed (workout) quest card.
//
// The clock is never accumulated in state -- it is recomputed from the saved
// start timestamp on every tick, so locking the phone, force-quitting the app
// or rebooting mid-set costs nothing. The interval below only exists to
// re-render; it is not the source of truth.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Btn } from './ui';
import { colors } from '../theme/colors';
import { useGame } from '../context/GameContext';
import {
  ENGINE, Quest, QuestTimer,
  startQuestTimer, pauseQuestTimer, resumeQuestTimer, cancelQuestTimer,
  timerRemainingSec, timerDone, timerRunning, formatClock,
} from '../engine';
import { scheduleQuestDone, cancelScheduled } from '../services/notify';

/** Re-render once a second, but only while something is actually counting. */
function useTick(active: boolean): number {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return Date.now();
}

export default function QuestTimerRow({ quest, timer }: { quest: Quest; timer: QuestTimer | null }) {
  const mine = timer && timer.questId === quest.id ? timer : null;
  const now = useTick(!!mine && timerRunning(mine));
  // The scheduled notification id lives outside game state: it is a device
  // handle, meaningless in an exported save.
  const notifId = useRef<string | null>(null);
  const buzzed = useRef(false);

  const remaining = mine ? timerRemainingSec(mine, now) : quest.min * 60;
  const finished = !!mine && timerDone(mine, now);
  const running = !!mine && timerRunning(mine);

  // One celebratory buzz the moment the clock hits zero with the app open.
  useEffect(() => {
    if (finished && !buzzed.current) {
      buzzed.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    if (!mine) buzzed.current = false;
  }, [finished, mine]);

  async function reschedule(seconds: number) {
    await cancelScheduled(notifId.current);
    notifId.current = await scheduleQuestDone(quest.title, seconds, quest.desc);
  }

  function onStart() {
    const box: { ok: boolean; sec: number } = { ok: false, sec: 0 };
    useGame.getState().mutate(s => {
      const r = startQuestTimer(s, quest.id);
      box.ok = r.ok;
      if (r.ok && s.questTimer) box.sec = timerRemainingSec(s.questTimer, Date.now());
    });
    if (box.ok) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      reschedule(box.sec);
    } else {
      // The only realistic cause is another quest already holding the slot.
      useGame.getState().notify('Finish or cancel your running timer first.');
    }
  }

  function onPause() {
    useGame.getState().mutate(s => { pauseQuestTimer(s); });
    cancelScheduled(notifId.current);
    notifId.current = null;
  }

  function onResume() {
    const box: { sec: number } = { sec: 0 };
    useGame.getState().mutate(s => {
      resumeQuestTimer(s);
      if (s.questTimer) box.sec = timerRemainingSec(s.questTimer, Date.now());
    });
    reschedule(box.sec);
  }

  function onCancel() {
    useGame.getState().mutate(s => { cancelQuestTimer(s); });
    cancelScheduled(notifId.current);
    notifId.current = null;
  }

  function onClaim() {
    useGame.getState().mutate(s => { ENGINE.completeQuest(s, quest.id); });
    cancelScheduled(notifId.current);
    notifId.current = null;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  // Not started: show what the commitment is, and one way in.
  if (!mine) {
    return (
      <View style={st.wrap}>
        <Text style={st.idle}>{quest.min} min</Text>
        <Btn small title="Start" onPress={onStart}
          accessibilityLabel={`Start ${quest.min} minute timer for ${quest.title}: ${quest.desc}`} />
      </View>
    );
  }

  if (finished) {
    return (
      <View style={st.wrap}>
        <Text style={[st.clock, { color: colors.xpa }]}>00:00</Text>
        <Btn small kind="green" title="Claim" onPress={onClaim}
          accessibilityLabel={`Claim reward for ${quest.title}`} />
      </View>
    );
  }

  return (
    <View style={st.col}>
      <Text style={[st.clock, !running && { color: colors.mut }]}>{formatClock(remaining)}</Text>
      <View style={st.row}>
        {running
          ? <Btn small kind="ghost" title="Pause" onPress={onPause} accessibilityLabel={`Pause timer for ${quest.title}`} />
          : <Btn small title="Resume" onPress={onResume} accessibilityLabel={`Resume timer for ${quest.title}`} />}
        <Btn small kind="ghost" title="✕" onPress={onCancel}
          accessibilityLabel={`Cancel timer for ${quest.title}`}
          accessibilityHint="Discards the time counted so far" />
      </View>
      {!running && <Text style={st.paused}>paused</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'flex-end', gap: 6 },
  col: { alignItems: 'flex-end', gap: 4, minWidth: 92 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clock: {
    color: colors.sys, fontWeight: '900', fontSize: 18, letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  idle: { color: colors.mut, fontSize: 11, fontWeight: '700' },
  paused: { color: colors.mut2, fontSize: 10, letterSpacing: 0.5 },
});
