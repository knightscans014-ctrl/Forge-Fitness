import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TextInput, Pressable, Image, ScrollView } from 'react-native';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { Card, Screen, Pill, Btn, StatRow } from '../components/ui';
import { ScreenHeader } from '../components/Header';
import { Icon } from '../theme/icons';
import { colors } from '../theme/colors';
import { ENGINE, BOOSTERS, PREMIUM_TIERS, isPremium } from '../engine';
import { UPI_TIERS, openUpiPayment, rs, FAMPAY_CONFIG, buildUpiLink } from '../services/fampay';
import { submitPayment } from '../services/payments';

const UPGRADES = [
  { id: 'g1', icon: '🛡️', name: 'Iron Aegis', desc: '+5 max HP', cost: 120 },
  { id: 'g2', icon: '👟', name: 'Swift Boots', desc: '+2 max energy', cost: 150 },
  { id: 'g3', icon: '⚗️', name: 'Philosopher Ring', desc: '+5% XP forever', cost: 400 },
  { id: 'g4', icon: '🎩', name: "Coach's Crest", desc: '+10% gold forever', cost: 450 },
];

export default function ShopScreen() {
  const state = useGame(s => s.state)!;
  const { mutate } = useGame();
  const authUser = useAuth(s => s.auth.status === 'signedIn' ? (s.auth as any).user : null);
  const security = useSecurity(); // server-authority premium
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState('t2');
  const [email, setEmail] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [paying, setPaying] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [paidStage, setPaidStage] = useState(false); // after opening UPI, ask for ref

  async function handleUPIPayment() {
    const plan = UPI_TIERS[selectedTier];
    if (!plan || paying) return;
    setPaying(true);
    // Open the payer's UPI app to send money to your Fampay ID.
    const res = await openUpiPayment(plan.amountPaise, plan.name);
    if (!res.ok) {
      useGame.getState().notify('Could not open UPI app. Please pay manually via your UPI app to:\n' + FAMPAY_CONFIG.upiId);
    } else {
      setPaidStage(true); // user has paid; now capture the reference
    }
    setPaying(false);
  }

  async function submitVerification() {
    if (!refNumber.trim()) { useGame.getState().notify('Please enter the UPI transaction reference.'); return; }
    // Record the payment (pending). The owner approves it in the admin panel.
    const res = await submitPayment({ tierId: selectedTier, utr: refNumber.trim(), buyerName: state.name });
    if (res.flags.length > 0) {
      useGame.getState().notify('Submitted — please double-check the UTR (⚠ amount should match tier).');
    } else {
      useGame.getState().notify('Payment submitted for verification. Your premium will activate once approved!');
    }
    setPaywallOpen(false);
    setPaidStage(false);
    setRefNumber('');
  }

  return (
    <Screen>
      <ScreenHeader icon="store" title="Forge Shop" subtitle="Spend gold on upgrades & boosters" accent="#ffd166" />

      <Card>
        <Text style={s.cardTitle}>🚀 Boosters</Text>
        {BOOSTERS.map(b => {
          const active = ENGINE.boosterActive(state, b.id);
          return (
            <StatRow key={b.id} icon={b.icon} name={b.name} desc={active ? `⏱ ${Math.max(0, Math.ceil((active.expires - Date.now()) / 60000))}m` : b.desc}
              right={active ? <Pill color={colors.gold}>ACTIVE</Pill> :
                <Btn small kind="gold" title={`${b.cost}🪙`} onPress={() => mutate(s => ENGINE.buyBooster(s, b.id))} />} />
          );
        })}
      </Card>

      <Card>
        <Text style={s.cardTitle}>⚙️ Upgrades</Text>
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
      </Card>

      <Card>
        <Text style={s.cardTitle}>👑 Premium</Text>
        <Text style={s.desc}>{security.premium.isPremium ? 'You have Forge Premium. Thanks for supporting!' : 'Free mode is fully playable. Premium adds speed, depth & style.'}</Text>
        <View style={{ height: 8 }} />
        <Btn title={security.premium.isPremium ? 'Manage Subscription' : 'Go Premium ✦'} onPress={() => setPaywallOpen(true)} />
      </Card>

      <Modal transparent visible={paywallOpen} animationType="slide">
        <View style={s.modalBg}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>👑 Forge Premium</Text>
              <View style={s.freeNote}><Text style={{ color: '#b6ffd4', fontSize: 12 }}>💚 Free mode is 100% playable — no pay-to-win walls.</Text></View>
              
              {/* Show QR Code if available */}
              {FAMPAY_CONFIG.qrCodeAsset ? (
                <View style={s.qrContainer}>
                  <Text style={[s.desc, { textAlign: 'center', marginBottom: 8 }]}>Scan QR to pay via UPI</Text>
                  <Image source={FAMPAY_CONFIG.qrCodeAsset} style={s.qrImage} resizeMode="contain" />
                  <Text style={[s.desc, { textAlign: 'center', marginTop: 8, color: colors.gold }]}>
                    UPI ID: {FAMPAY_CONFIG.upiId}
                  </Text>
                </View>
              ) : (
                <View style={s.upiNote}>
                  <Icon name="wallet" size={16} color={colors.gold} family="mci" />
                  <Text style={{ color: colors.gold, fontSize: 13, fontWeight: '700' }}>
                    Pay to: {FAMPAY_CONFIG.upiId}
                  </Text>
                </View>
              )}

              {PREMIUM_TIERS.map(t => (
                <Pressable key={t.id} onPress={() => setSelectedTier(t.id)} style={[s.tier, selectedTier === t.id && s.tierSel]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tierName}>{t.name} {t.tag ? <Text style={{ color: colors.mana, fontSize: 10 }}>{t.tag}</Text> : null}</Text>
                    <Text style={s.desc}>{t.perks.join(' · ')}</Text>
                    <Text style={{ color: colors.gold, fontWeight: '900' }}>{t.price}<Text style={s.desc}> {t.per}</Text></Text>
                  </View>
                </Pressable>
              ))}

              <View style={s.divider} />
              <Text style={[s.cardTitle, { textAlign: 'center' }]}>🎬 Content Creator Unlock</Text>
              <Text style={[s.desc, { textAlign: 'center', marginTop: 6 }]}>Make a video about FORGE, post it, send us the link — unlock Ranger (₹99) free for a year!</Text>
              <TextInput style={s.input} placeholder="Your email" placeholderTextColor={colors.mut2} value={email} onChangeText={setEmail} />
              <TextInput style={s.input} placeholder="Paste your video link" placeholderTextColor={colors.mut2} value={videoLink} onChangeText={setVideoLink} />
              <Btn kind="ghost" small title="Submit video → unlock Ranger" onPress={() => {
                if (!email || !videoLink) return;
                mutate(s => ENGINE.unlockCreator(s));
                setPaywallOpen(false);
              }} />

              {paidStage ? (
                <>
                  <Text style={[s.desc, { textAlign: 'center', marginTop: 12 }]}>
                    Done paying? Enter the <Text style={{ color: colors.ink, fontWeight: '800' }}>UPI transaction reference</Text> (UTR) from your payment so we can verify.
                  </Text>
                  <TextInput style={s.input} placeholder="UPI reference / UTR number" placeholderTextColor={colors.mut2} value={refNumber} onChangeText={setRefNumber} />
                  <View style={{ height: 8 }} />
                  <Btn title="Submit for verification" onPress={submitVerification} />
                </>
              ) : (
                <>
                  <View style={{ height: 10 }} />
                  <Btn title={paying ? 'Opening UPI...' : `Pay ₹${rs(UPI_TIERS[selectedTier]?.amountPaise || 0)} via UPI`} onPress={handleUPIPayment} disabled={paying} />
                  <View style={{ height: 6 }} />
                  <Text style={[s.desc, { textAlign: 'center', fontSize: 11 }]}>
                    This will open your UPI app (GPay, PhonePe, Paytm, etc.) to send payment directly to our Fampay account
                  </Text>
                </>
              )}

              <View style={{ height: 8 }} />
              <Btn kind="ghost" title="Close" onPress={() => setPaywallOpen(false)} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginTop: 10 },
  sub: { color: colors.mut, fontSize: 13, marginBottom: 8 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  desc: { color: colors.mut, fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(4,5,10,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg2, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 32 },
  sheetTitle: { color: colors.ink, fontWeight: '900', fontSize: 20, textAlign: 'center' },
  freeNote: { backgroundColor: 'rgba(124,255,178,0.08)', borderRadius: 12, padding: 10, marginTop: 10 },
  tier: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginTop: 10 },
  tierSel: { borderColor: colors.gold, backgroundColor: 'rgba(255,209,102,0.06)' },
  tierName: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 16 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 13, color: colors.ink, marginTop: 8 },
  upiNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,255,178,0.08)', borderRadius: 10, padding: 10, marginTop: 8 },
  qrContainer: { alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, marginTop: 10 },
  qrImage: { width: 200, height: 200, backgroundColor: '#fff', borderRadius: 12 },
});
