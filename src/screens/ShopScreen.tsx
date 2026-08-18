import React from "react";
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { Screen, Pill, Btn, StatRow, SystemWindow } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import { colors } from '../theme/colors';
import { ENGINE, BOOSTERS, PREMIUM_TIERS } from '../engine';

const UPGRADES = [
  { id: 'g1', icon: '🛡️', name: 'Iron Aegis', desc: '+5 max HP', cost: 120 },
  { id: 'g2', icon: '👟', name: 'Swift Boots', desc: '+2 max energy', cost: 150 },
  { id: 'g3', icon: '⚗️', name: 'Philosopher Ring', desc: '+5% XP forever', cost: 400 },
  { id: 'g4', icon: '🎩', name: "Coach's Crest", desc: '+10% gold forever', cost: 450 },
];

export default function ShopScreen() {
  const state = useGame(s => s.state)!;
  const { mutate } = useGame();

  return (
    <Screen>
      <ScreenHeader icon="store" title="Forge Shop" subtitle="Spend gold on upgrades & boosters" accent="#ffd166" />

      <SystemWindow label="Boosters" accent={colors.gold} glow>
        {BOOSTERS.map(b => {
          const active = ENGINE.boosterActive(state, b.id);
          return (
            <StatRow key={b.id} icon={b.icon} name={b.name} desc={active ? `⏱ ${Math.max(0, Math.ceil((active.expires - Date.now()) / 60000))}m` : b.desc}
              right={active ? <Pill color={colors.gold}>ACTIVE</Pill> :
                <Btn small kind="gold" title={`${b.cost}🪙`} onPress={() => mutate(s => ENGINE.buyBooster(s, b.id))} />} />
          );
        })}
      </SystemWindow>

      <SystemWindow label="Permanent Upgrades" accent={colors.sys}>
        {UPGRADES.map(g => {
          const owned = state.owned[g.id];
          return (
            <StatRow key={g.id} icon={g.icon} name={g.name} desc={g.desc}
              right={owned ? <Pill color={colors.gold}>✓ Owned</Pill> :
                <Btn small kind="gold" title={`${g.cost}🪙`} onPress={() => {
                  mutate(s => {
                    if (s.gold >= g.cost && !s.owned[g.id]) {
                      s.gold -= g.cost;
                      s.owned[g.id] = true;
                      if (g.id === 'g1') { s.maxHP += 5; s.hp = Math.min(s.maxHP, s.hp + 5); }
                      if (g.id === 'g2') s.maxEnergy += 2;
                      if (g.id === 'g3') s.xpMult += 0.05;
                      if (g.id === 'g4') s.goldMult += 0.1;
                    }
                  });
                }} />} />
          );
        })}
      </SystemWindow>

      <SystemWindow label="Difficulty Path" accent={colors.violet}>
        <Text style={s.desc}>
          Everything in FORGE is unlocked. Pick the path that matches how hard you
          want the grind to feel — it changes your XP and gold rates.
        </Text>
        <View style={{ height: 4 }} />
        {PREMIUM_TIERS.map(t => {
          const selected = state.tier === t.id;
          return (
            <StatRow
              key={t.id}
              icon="👑"
              name={t.name}
              desc={t.perks.join(' · ')}
              right={selected
                ? <Pill color={colors.gold}>ACTIVE</Pill>
                : <Btn small kind="ghost" title="Choose" onPress={() => mutate(s => ENGINE.activateTier(s, t.id))} />}
            />
          );
        })}
      </SystemWindow>
    </Screen>
  );
}

const s = StyleSheet.create({
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  desc: { color: colors.mut, fontSize: 12 },
});
