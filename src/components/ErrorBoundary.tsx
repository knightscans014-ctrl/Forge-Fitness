// Catches render crashes so a thrown component cannot brick the app.
//
// This matters more here than in a typical app: saves live in a single
// AsyncStorage key with no cloud copy. Without a boundary, a crash on any
// screen leaves a white screen and — critically — no route to the backup UI,
// so the player cannot rescue the save that is still sitting on disk. The
// fallback therefore reads the raw save straight out of storage and shows it
// as selectable text, independent of the game state that just crashed.

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { SAVE_KEY } from '../engine';

interface Props { children: React.ReactNode }
interface State { error: Error | null; raw: string | null; copied: boolean }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, raw: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // No crash reporting service by design (offline, no billable deps), so the
    // console is the only record a contributor can ask a user for.
    console.error('[FORGE] render crash:', error, info.componentStack);
    // Pull the save directly from storage rather than from the store, which
    // may be the thing that is corrupt.
    AsyncStorage.getItem(SAVE_KEY)
      .then(raw => this.setState({ raw }))
      .catch(() => this.setState({ raw: null }));
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { error, raw } = this.state;

    return (
      <View style={s.wrap}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.sys}>SYSTEM FAULT</Text>
          <Text style={s.title}>Something broke</Text>
          <Text style={s.body}>
            FORGE hit an error it could not recover from. Your save is still on this
            device and is shown below — copy it somewhere safe before you do anything
            else, then restart the app.
          </Text>

          <Text style={s.label}>WHAT WENT WRONG</Text>
          <View style={s.errBox}>
            <Text style={s.err}>{error.name}: {error.message}</Text>
          </View>

          <Text style={s.label}>YOUR SAVE DATA</Text>
          {raw === null ? (
            <Text style={s.body}>Reading save…</Text>
          ) : (
            <TextInput
              style={s.save}
              value={raw}
              multiline
              editable={false}
              selectTextOnFocus
              accessibilityLabel="Your save data. Select all and copy to back it up."
            />
          )}
          <Text style={s.hint}>
            Tap the box, select all, and copy. You can paste this back in via
            Character → Backup &amp; Restore once the app restarts.
          </Text>

          <Pressable
            style={s.btn}
            accessibilityRole="button"
            accessibilityLabel="Try rendering the app again"
            onPress={() => this.setState({ error: null, raw: null, copied: false })}
          >
            <Text style={s.btnText}>TRY AGAIN</Text>
          </Pressable>
          <Text style={s.hint}>
            If it crashes again straight away, restart the app fully. Your save is
            not deleted by this error.
          </Text>
        </ScrollView>
      </View>
    );
  }
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 72, gap: 10 },
  sys: { color: colors.crimson, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900', marginBottom: 4 },
  body: { color: colors.mut, fontSize: 13.5, lineHeight: 20 },
  label: { color: colors.sys, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginTop: 18 },
  errBox: { borderWidth: 1, borderColor: 'rgba(255,45,85,0.35)', backgroundColor: 'rgba(255,45,85,0.08)', borderRadius: 6, padding: 12 },
  err: { color: colors.crimson, fontSize: 12, fontFamily: 'monospace' },
  save: { borderWidth: 1, borderColor: colors.sysFaint, backgroundColor: colors.card, borderRadius: 6, padding: 12, color: colors.ink, fontSize: 10.5, height: 180, textAlignVertical: 'top', fontFamily: 'monospace' },
  hint: { color: colors.mut, fontSize: 11.5, lineHeight: 17 },
  btn: { marginTop: 18, borderWidth: 1, borderColor: colors.sys, backgroundColor: colors.sysFaint, borderRadius: 5, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: colors.sys, fontWeight: '900', fontSize: 13, letterSpacing: 1.4 },
});
