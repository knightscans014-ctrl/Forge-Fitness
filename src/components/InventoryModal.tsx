// Inventory: loadout, set bonuses, affix-aware gear list, salvage & auto-equip.
//
// The list is the only place a player reasons about loot, so it does the
// arithmetic for them: every item shows its affixes in full, upgrades are
// marked, and the sort puts the most relevant gear on top.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { useGame } from '../context/GameContext';
import { Btn, SystemWindow, SystemLabel } from './ui';
import { colors } from '../theme/colors';
import { SLOTS, equipGear, unequipSlot, RARITIES, Rarity, GearItem, affixLabel, gearScore, isUpgrade, autoEquipBest, salvage, salvageJunk, activeSetBonuses, setCounts, setById, totalAffixes, AffixKind, equippedItems } from '../engine';

const rarityColor = (r: string): string =>
  (RARITIES[r as Rarity]?.color) || colors.common;

type Filter = 'all' | 'weapon' | 'armor' | 'accessory';

const SLOT_META: Record<GearItem['slot'], { name: string; icon: string }> = {
  weapon: { name: 'Weapon', icon: '🗡️' },
  armor: { name: 'Armor', icon: '🛡️' },
  accessory: { name: 'Accessory', icon: '🧿' },
};

export function InventoryModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const state = useGame(s => s.state)!;
  const mutate = useGame(s => s.mutate);
  const notify = useGame(s => s.notify);
  const [filter, setFilter] = useState<Filter>('all');

  const equippedIds = useMemo(
    () => new Set(Object.values(state.equipped).filter(Boolean) as string[]),
    [state.equipped],
  );

  // Equipped first, then by score. Keeps the worn loadout anchored at the top
  // instead of scattering it through the bag as gear levels change.
  const items = useMemo(() => {
    const list = state.inventory.filter(g => filter === 'all' || g.slot === filter);
    return [...list].sort((a, b) => {
      const ae = equippedIds.has(a.id) ? 1 : 0;
      const be = equippedIds.has(b.id) ? 1 : 0;
      if (ae !== be) return be - ae;
      return gearScore(b) - gearScore(a);
    });
  }, [state.inventory, filter, equippedIds]);

  const sets = activeSetBonuses(state);
  const counts = setCounts(state);
  const totals = totalAffixes(state);
  const worn = equippedItems(state);
  const junkCount = state.inventory.filter(
    g => (g.rarity === 'common' || g.rarity === 'rare') && !equippedIds.has(g.id),
  ).length;

  const doAutoEquip = () => mutate(s => {
    const n = autoEquipBest(s);
    notify(n ? `Auto-equipped ${n} item${n > 1 ? 's' : ''}.` : 'Already wearing your best gear.');
  });

  const doSalvageJunk = () => mutate(s => {
    const r = salvageJunk(s);
    notify(r.count ? `Salvaged ${r.count} item${r.count > 1 ? 's' : ''} for ${r.gold} gold.` : 'No junk to salvage.');
  });

  const doSalvage = (g: GearItem) => mutate(s => {
    const r = salvage(s, g.id);
    notify(r.ok ? `Salvaged ${g.name} for ${r.gold} gold.` : (r.reason || 'Cannot salvage.'));
  });

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={s.sheet}>
          <View style={s.header}>
            <View>
              <SystemLabel>INVENTORY</SystemLabel>
              <Text style={s.title}>⚔️ Loadout &amp; Bag</Text>
            </View>
            <Text style={s.gold}>{state.gold} G</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Worn loadout ------------------------------------------------ */}
            <SystemWindow label="EQUIPPED" accent={colors.sys}>
              {SLOTS.map(slot => {
                const meta = SLOT_META[slot];
                const id = state.equipped[slot];
                const g = state.inventory.find(x => x.id === id);
                return (
                  <View key={slot} style={s.slotRow}>
                    <Text style={s.slotIcon}>{g ? g.icon : meta.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.slotName}>{meta.name.toUpperCase()}</Text>
                      {g ? (
                        <Text style={[s.slotItem, { color: rarityColor(g.rarity) }]} numberOfLines={1}>
                          {g.name} · +{g.power} PWR
                        </Text>
                      ) : (
                        <Text style={s.slotEmpty}>— empty —</Text>
                      )}
                    </View>
                    {g ? (
                      <Btn small kind="ghost" title="Remove"
                        onPress={() => mutate(st => { unequipSlot(st, slot); })} />
                    ) : null}
                  </View>
                );
              })}
              <View style={s.actionRow}>
                <View style={{ flex: 1 }}>
                  <Btn small title="⚡ Auto-Equip Best" onPress={doAutoEquip} />
                </View>
                <View style={{ flex: 1 }}>
                  <Btn small kind="ghost"
                    disabled={junkCount === 0}
                    title={junkCount ? `♻️ Salvage Junk (${junkCount})` : '♻️ No Junk'}
                    onPress={doSalvageJunk} />
                </View>
              </View>
            </SystemWindow>

            {/* Live totals ------------------------------------------------- */}
            {worn.length > 0 && (
              <SystemWindow label="ACTIVE BONUSES" accent={colors.violet}>
                {(Object.keys(totals) as AffixKind[]).filter(k => totals[k] > 0).length === 0 ? (
                  <Text style={s.desc}>Your equipped gear has no modifiers yet. Higher rarities roll more.</Text>
                ) : (
                  <View style={s.chipWrap}>
                    {(Object.keys(totals) as AffixKind[])
                      .filter(k => totals[k] > 0)
                      .map(k => (
                        <View key={k} style={s.chip}>
                          <Text style={s.chipText}>{affixLabel({ kind: k, value: totals[k] })}</Text>
                        </View>
                      ))}
                  </View>
                )}
              </SystemWindow>
            )}

            {/* Set bonuses -------------------------------------------------- */}
            {(sets.length > 0 || Object.keys(counts).length > 0) && (
              <SystemWindow label="SET BONUSES" accent={colors.legendary}>
                {Object.entries(counts).map(([id, n]) => {
                  const def = setById(id);
                  if (!def) return null;
                  const active = n >= 2;
                  return (
                    <View key={id} style={s.setRow}>
                      <Text style={{ fontSize: 18 }}>{def.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.setName, { color: def.color }]}>
                          {def.name} ({n}/3)
                        </Text>
                        <Text style={[s.setBonus, n >= 2 ? s.on : s.off]}>
                          2pc: {def.bonus2.map(affixLabel).join(', ')}
                        </Text>
                        <Text style={[s.setBonus, n >= 3 ? s.on : s.off]}>
                          3pc: {def.bonus3.map(affixLabel).join(', ')}
                        </Text>
                      </View>
                      {active && <Text style={s.activeTag}>ACTIVE</Text>}
                    </View>
                  );
                })}
              </SystemWindow>
            )}

            {/* Filters ------------------------------------------------------ */}
            <View style={s.filterRow}>
              {(['all', 'weapon', 'armor', 'accessory'] as Filter[]).map(f => (
                <Pressable key={f} onPress={() => setFilter(f)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Show ${f === 'all' ? 'all items' : f + 's'}`}
                  accessibilityState={{ selected: filter === f }}
                  style={[s.filter, filter === f && s.filterOn]}>
                  <Text style={[s.filterText, filter === f && s.filterTextOn]}>
                    {f.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Bag ---------------------------------------------------------- */}
            <Text style={s.sub}>{items.length} item(s) · tap Equip to change your loadout</Text>
            {items.length === 0 ? (
              <Text style={s.desc}>No gear here yet. Train, clear quests and slay bosses for loot.</Text>
            ) : (
              items.map(g => {
                const equipped = equippedIds.has(g.id);
                const upgrade = !equipped && isUpgrade(state, g);
                const def = setById(g.setId);
                const rc = rarityColor(g.rarity);
                return (
                  <View key={g.id} style={[s.card, { borderColor: equipped ? colors.sys : rc + '55' }]}>
                    <View style={s.cardTop}>
                      <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={s.nameRow}>
                          <Text style={[s.name, { color: rc }]} numberOfLines={1}>{g.name}</Text>
                          {upgrade && <Text style={s.upgradeTag}>▲ UPGRADE</Text>}
                        </View>
                        <Text style={s.meta}>
                          {g.rarity.toUpperCase()} · {g.slot} · ilvl {g.ilvl ?? 1} · score {gearScore(g)}
                        </Text>
                      </View>
                    </View>

                    <Text style={s.power}>+{g.power} POWER</Text>

                    {(g.affixes || []).length > 0 && (
                      <View style={s.affixBox}>
                        {(g.affixes || []).map((a, i) => (
                          <Text key={i} style={s.affix}>◆ {affixLabel(a)}</Text>
                        ))}
                      </View>
                    )}

                    {def && (
                      <Text style={[s.setTag, { color: def.color }]}>
                        {def.icon} {def.name} set ({counts[def.id] || 0}/3 worn)
                      </Text>
                    )}

                    <View style={s.cardActions}>
                      {equipped ? (
                        <>
                          <Text style={s.equippedTag}>✓ EQUIPPED</Text>
                          <Btn small kind="ghost" title="Unequip"
                            onPress={() => mutate(st => { unequipSlot(st, g.slot); })} />
                        </>
                      ) : (
                        <>
                          <View style={{ flex: 1 }}>
                            <Btn small title="Equip"
                              onPress={() => mutate(st => { equipGear(st, g.id); })} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Btn small kind="ghost" title={`Salvage · ${RARITIES[g.rarity as Rarity]?.salvage ?? 8}G`}
                              onPress={() => doSalvage(g)} />
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={{ height: 8 }} />
          <Btn kind="ghost" title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(4,5,10,0.82)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg2, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28, maxHeight: '92%', borderTopWidth: 1, borderColor: colors.sysFaint },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  title: { color: colors.ink, fontWeight: '900', fontSize: 19 },
  gold: { color: colors.legendary, fontWeight: '900', fontSize: 15 },
  sub: { color: colors.mut, fontSize: 12, marginTop: 10, marginBottom: 6 },
  desc: { color: colors.mut, fontSize: 12, lineHeight: 18 },

  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  slotIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  slotName: { color: colors.mut, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },
  slotItem: { fontSize: 13, fontWeight: '800' },
  slotEmpty: { color: '#4a5570', fontSize: 13, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.sysFaint, borderWidth: 1, borderColor: colors.sysFaint, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: colors.sys, fontSize: 11, fontWeight: '700' },

  setRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 7 },
  setName: { fontWeight: '900', fontSize: 13.5 },
  setBonus: { fontSize: 11, marginTop: 2 },
  on: { color: colors.ink },
  off: { color: '#4a5570' },
  activeTag: { color: colors.sys, fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },

  filterRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  filter: { flex: 1, paddingVertical: 7, borderRadius: 4, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  filterOn: { borderColor: colors.sys, backgroundColor: colors.sysFaint },
  filterText: { color: colors.mut, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  filterTextOn: { color: colors.sys },

  card: { backgroundColor: colors.card, borderWidth: 1, borderRadius: 6, padding: 12, marginVertical: 5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontWeight: '900', fontSize: 14, flexShrink: 1 },
  upgradeTag: { color: colors.sys, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  meta: { color: colors.mut, fontSize: 10.5, marginTop: 2, letterSpacing: 0.3 },
  power: { color: colors.ink, fontWeight: '800', fontSize: 12, marginTop: 8 },
  affixBox: { marginTop: 6, gap: 3 },
  affix: { color: colors.rare, fontSize: 11.5, fontWeight: '600' },
  setTag: { fontSize: 11, fontWeight: '800', marginTop: 7 },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 },
  equippedTag: { color: colors.sys, fontWeight: '900', fontSize: 11, letterSpacing: 1, flex: 1 },
});
