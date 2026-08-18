// Skill Tree modal. The inventory lives in InventoryModal.tsx, which needs
// far more surface area (affixes, sets, salvage) than a shared file allows.

import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { useGame } from '../context/GameContext';
import { Btn } from './ui';
import { colors } from '../theme/colors';
import { SKILLS } from '../engine';

export function SkillTreeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const state = useGame(s => s.state)!;
  const mutate = useGame(s => s.mutate);
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={s.sheet}>
          <Text style={s.title}>🎯 Skill Tree</Text>
          <Text style={s.sub}>{state.skillPoints} point(s) available</Text>
          <ScrollView>
            {SKILLS.map(sk => {
              const rank = state.skills[sk.id] || 0;
              const maxed = rank >= sk.max;
              return (
                <View key={sk.id} style={s.card}>
                  <View style={s.rowBetween}>
                    <Text style={s.name}>{sk.icon} {sk.name}</Text>
                    <View style={s.dots}>
                      {Array.from({ length: sk.max }, (_, i) => (
                        <View key={i} style={[s.dot, i < rank && s.dotOn]} />
                      ))}
                    </View>
                  </View>
                  <Text style={s.desc}>{sk.de}</Text>
                  <Btn small disabled={maxed || state.skillPoints <= 0}
                    title={maxed ? 'MAXED' : `Rank up (${rank}/${sk.max})`}
                    onPress={() => mutate(s => { /* buySkill handles validation */ require('../engine').buySkill(s, sk.id); })} />
                </View>
              );
            })}
          </ScrollView>
          <View style={{ height: 8 }} />
          <Btn kind="ghost" title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(4,5,10,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg2, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 32, maxHeight: '88%' },
  title: { color: colors.ink, fontWeight: '900', fontSize: 20 },
  sub: { color: colors.mut, fontSize: 13, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, marginVertical: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  desc: { color: colors.mut, fontSize: 12 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1a1e36' },
  dotOn: { backgroundColor: colors.gold },
});
