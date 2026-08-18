// Backup & Restore sheet.
//
// The save lives only in this device's storage, so uninstalling the app or
// switching phones loses everything. This is the way out: dump the save to
// text the player can put somewhere safe, and paste it back later.
//
// No clipboard or file-system dependency on purpose — the export field is
// selectable and select-all-on-focus, which is enough to copy anywhere, and
// keeps the app free of native modules.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TextInput } from 'react-native';
import { useGame } from '../context/GameContext';
import { Btn, SystemWindow } from './ui';
import { colors } from '../theme/colors';
import { exportSave, importSave, describeSave } from '../services/saveFile';

type Mode = 'menu' | 'export' | 'import';

export function SaveModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const state = useGame(s => s.state)!;
  const replaceState = useGame(s => s.replaceState);
  const notify = useGame(s => s.notify);

  const [mode, setMode] = useState<Mode>('menu');
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReturnType<typeof importSave> | null>(null);

  // Only serialise when the export pane is actually open.
  const blob = useMemo(() => (mode === 'export' && state ? exportSave(state) : ''), [mode, state]);

  function reset() {
    setMode('menu');
    setPaste('');
    setError(null);
    setPending(null);
  }
  function close() {
    reset();
    onClose();
  }

  function check() {
    const res = importSave(paste);
    if (!res.ok) {
      setError(res.error);
      setPending(null);
      return;
    }
    setError(null);
    setPending(res);
  }

  function confirmImport() {
    if (!pending || !pending.ok) return;
    replaceState(pending.state);
    notify('💾 Save restored');
    if (pending.warning) notify(pending.warning);
    close();
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <View style={s.bg}>
        <View style={s.sheet}>
          <View style={s.grabber} />
          <Text style={s.kicker}>System · Data</Text>
          <Text style={s.title}>Backup & Restore</Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            {mode === 'menu' && (
              <>
                <SystemWindow label="Warning" accent={colors.warning}>
                  <Text style={s.body}>
                    Your progress is stored on this device only. Uninstalling FORGE, or clearing
                    its data, deletes it permanently. Export a backup and keep it somewhere safe.
                  </Text>
                </SystemWindow>

                <View style={s.currentBox}>
                  <Text style={s.currentLabel}>CURRENT SAVE</Text>
                  <Text style={s.currentVal}>{describeSave(state)}</Text>
                </View>

                <View style={{ height: 14 }} />
                <Btn kind="gold" fullWidth title="Export backup" icon="download-outline" onPress={() => setMode('export')} />
                <View style={{ height: 10 }} />
                <Btn kind="ghost" fullWidth title="Restore from backup" icon="cloud-upload-outline" onPress={() => setMode('import')} />
              </>
            )}

            {mode === 'export' && (
              <>
                <Text style={s.body}>
                  Tap the text below to select all of it, then copy and save it in a note, an
                  email to yourself, or a file. Every character matters.
                </Text>
                <TextInput
                  style={s.blob}
                  value={blob}
                  multiline
                  editable={false}
                  selectTextOnFocus
                  scrollEnabled
                />
                <Text style={s.hint}>{blob.length.toLocaleString()} characters</Text>
                <View style={{ height: 12 }} />
                <Btn kind="ghost" fullWidth title="Back" onPress={reset} />
              </>
            )}

            {mode === 'import' && (
              <>
                <SystemWindow label="Caution" accent={colors.hp}>
                  <Text style={s.body}>
                    Restoring replaces your current save. {describeSave(state)} will be gone.
                  </Text>
                </SystemWindow>
                <View style={{ height: 12 }} />
                <Text style={s.body}>Paste your backup text here:</Text>
                <TextInput
                  style={[s.blob, s.blobEditable, error ? { borderColor: colors.hp } : null]}
                  value={paste}
                  onChangeText={t => { setPaste(t); setError(null); setPending(null); }}
                  multiline
                  placeholder='{ "app": "FORGE", ... }'
                  placeholderTextColor={colors.mut3}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {error ? <Text style={s.error}>{error}</Text> : null}

                {pending && pending.ok ? (
                  <View style={s.confirmBox}>
                    <Text style={s.confirmLabel}>READY TO RESTORE</Text>
                    <Text style={s.confirmVal}>{describeSave(pending.state)}</Text>
                    {pending.warning ? <Text style={s.warn}>{pending.warning}</Text> : null}
                    <View style={{ height: 12 }} />
                    <Btn kind="danger" fullWidth title="Overwrite my save" onPress={confirmImport} />
                  </View>
                ) : (
                  <>
                    <View style={{ height: 12 }} />
                    <Btn kind="gold" fullWidth title="Check backup" disabled={!paste.trim()} onPress={check} />
                  </>
                )}

                <View style={{ height: 10 }} />
                <Btn kind="ghost" fullWidth title="Back" onPress={reset} />
              </>
            )}
          </ScrollView>

          <View style={{ height: 10 }} />
          <Btn kind="ghost" fullWidth title="Close" onPress={close} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(4,5,10,0.78)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg2, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 22, paddingBottom: 32, maxHeight: '90%',
    borderTopWidth: 1, borderColor: colors.sysFaint,
  },
  grabber: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.mut3, alignSelf: 'center', marginBottom: 14 },
  kicker: { color: colors.sys, fontSize: 10, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase' },
  title: { color: colors.ink, fontWeight: '900', fontSize: 22, marginBottom: 14 },
  body: { color: colors.ink2, fontSize: 13, lineHeight: 19 },
  hint: { color: colors.mut2, fontSize: 11, marginTop: 6, textAlign: 'right' },
  blob: {
    marginTop: 12, minHeight: 170, maxHeight: 240,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line2, borderRadius: 14,
    padding: 12, color: colors.ink2, fontSize: 11,
    fontFamily: undefined, textAlignVertical: 'top',
  },
  blobEditable: { color: colors.ink, borderColor: colors.sysDim },
  error: { color: colors.hp, fontSize: 12.5, marginTop: 10, lineHeight: 18, fontWeight: '600' },
  warn: { color: colors.warning, fontSize: 12, marginTop: 8, lineHeight: 17 },
  currentBox: {
    marginTop: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: 14, padding: 14,
  },
  currentLabel: { color: colors.mut2, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  currentVal: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 4 },
  confirmBox: {
    marginTop: 14, backgroundColor: 'rgba(124,255,178,0.06)', borderWidth: 1,
    borderColor: colors.xpa, borderRadius: 14, padding: 14,
  },
  confirmLabel: { color: colors.xpa, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  confirmVal: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 4 },
});
