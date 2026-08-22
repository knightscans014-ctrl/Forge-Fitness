// Interactive Theme Selector component for FORGE
// Allows switching between 4 custom gamified UI themes in real-time.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useGame } from '../context/GameContext';
import { Icon } from '../theme/icons';
import { CornerBrackets, ScanLines } from './ui';
import type { ThemeDefinition } from '../theme/themes';

export function ThemeSelector() {
  const { themeId, themes, setTheme, colors } = useTheme();
  const notify = useGame(s => s.notify);

  const handleSelectTheme = (t: ThemeDefinition) => {
    if (t.id === themeId) return;
    setTheme(t.id);
    if (Haptics.impactAsync) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    notify(`🎨 UI Theme Equipped: ${t.name}`);
  };

  return (
    <View style={s.container}>
      {themes.map(t => {
        const active = t.id === themeId;
        const c = t.colors;
        return (
          <Pressable
            key={t.id}
            onPress={() => handleSelectTheme(t)}
            accessibilityRole="button"
            accessibilityLabel={`Select theme ${t.name}. ${active ? 'Currently active.' : 'Tap to equip.'}`}
            style={({ pressed }) => [
              s.themeCard,
              {
                backgroundColor: active ? `${c.card}` : `${colors.card}`,
                borderColor: active ? c.sys : colors.line,
                shadowColor: active ? c.sys : '#000',
              },
              active && s.themeCardActive,
              pressed && s.themeCardPressed,
            ]}
          >
            {active && <ScanLines color={c.sys} rows={6} opacity={0.06} />}
            {active && <CornerBrackets color={c.sys} size={12} inset={-1} />}

            {/* Header: Badge & Icon */}
            <View style={s.cardHeader}>
              <View style={s.titleRow}>
                <Text style={s.themeIcon}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={[s.themeName, { color: active ? c.sys : colors.ink }]}>{t.name}</Text>
                    <View style={[s.badgeWrap, { borderColor: `${c.sys}66`, backgroundColor: `${c.sys}18` }]}>
                      <Text style={[s.badgeText, { color: c.sys }]}>{t.badge}</Text>
                    </View>
                  </View>
                  <Text style={[s.themeSub, { color: active ? c.ink2 : colors.mut }]}>{t.subtitle}</Text>
                </View>
              </View>
            </View>

            {/* Quote / Lore Description */}
            <Text style={[s.themeDesc, { color: active ? c.mut : colors.mut2 }]}>{t.desc}</Text>

            {/* Color Swatches Palette Preview */}
            <View style={s.paletteRow}>
              <View style={s.swatches}>
                <View style={[s.swatch, { backgroundColor: c.sys }]} />
                <View style={[s.swatch, { backgroundColor: c.violet }]} />
                <View style={[s.swatch, { backgroundColor: c.gold }]} />
                <View style={[s.swatch, { backgroundColor: c.xpa }]} />
                <View style={[s.swatch, { backgroundColor: c.card }]} />
              </View>

              {/* Status Pill / Button */}
              {active ? (
                <View style={[s.activeChip, { backgroundColor: `${c.sys}22`, borderColor: c.sys }]}>
                  <Icon name="checkmark-circle" size={14} color={c.sys} />
                  <Text style={[s.activeChipText, { color: c.sys }]}>ACTIVE</Text>
                </View>
              ) : (
                <View style={[s.equipBtn, { borderColor: `${c.sys}66` }]}>
                  <Text style={[s.equipBtnText, { color: c.sys }]}>EQUIP</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
    marginVertical: 6,
  },
  themeCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  themeCardActive: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 6,
  },
  themeCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardHeader: {
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIcon: {
    fontSize: 28,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeWrap: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  themeSub: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 1,
  },
  themeDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginVertical: 8,
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  swatches: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeChipText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  equipBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  equipBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
