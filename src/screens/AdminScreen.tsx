// Admin payment verification panel — for the app owner.
// Shows all payments; one-tap approve/reject. Approving grants premium.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl } from 'react-native';
import { useGame } from '../context/GameContext';
import { useSecurity } from '../context/SecurityContext';
import { ScreenHeader } from '../components/Header';
import { Icon } from '../theme/icons';
import { Btn } from '../components/ui';
import { colors } from '../theme/colors';
import { PaymentRecord, adminLoadPayments } from '../services/payments';
import { adminApprovePayment, adminRejectPayment } from '../services/secureAuth';

function statusColor(s: PaymentRecord['status']) {
  return s === 'approved' ? colors.xpa : s === 'rejected' ? colors.hp : colors.gold;
}

export default function AdminScreen() {
  const { mutate } = useGame();
  const security = useSecurity();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);

  // Loads EVERY user's payments via admin_list_payments() -- the server checks
  // that the caller is an admin. Previously this read the owner's own phone,
  // so buyer submissions were never visible here.
  async function refresh() {
    setPayments(await adminLoadPayments());
  }
  useEffect(() => { refresh(); }, []);

  async function approve(id: string) {
    const rec = payments.find(p => p.id === id);
    if (!rec || busy) return;
    setBusy(id);
    // Server-authority: approve_payment() marks the row paid AND writes the
    // entitlement atomically. 12 months to match the '/year' tier pricing.
    const res = await adminApprovePayment(id, 12);
    setBusy(null);
    if (res.ok) {
      useGame.getState().notify(`Approved ${rec.tierName} — premium granted (server)`);
      security.refresh();
      refresh();
    } else {
      useGame.getState().notify(res.error || 'Approval failed — are you signed in as the owner?');
    }
  }
  async function reject(id: string) {
    if (busy) return;
    setBusy(id);
    const res = await adminRejectPayment(id);
    setBusy(null);
    useGame.getState().notify(res.ok ? 'Payment rejected' : (res.error || 'Reject failed'));
    if (res.ok) refresh();
  }

  const pending = payments.filter(p => p.status === 'pending');

  return (
    <View style={styles.screen}>
      <ScreenHeader icon="shield-checkmark" title="Payment Admin" subtitle={`${pending.length} pending · ${payments.length} total`} accent={colors.gold} />

      <FlatList
        data={payments}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh().then(() => setRefreshing(false)); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No payments yet.</Text>}
        renderItem={({ item }) => {
          const st = item.status;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.badgeWrap}>
                  <Text style={styles.tierName}>{item.tierName}</Text>
                  <View style={[styles.statusBadge, { borderColor: statusColor(st) }]}>
                    <Text style={{ color: statusColor(st), fontWeight: '800', fontSize: 11, textTransform: 'uppercase' }}>{st}</Text>
                  </View>
                </View>
                <Text style={styles.amount}>₹{item.amountPaise / 100}</Text>
              </View>
              <View style={styles.metaRow}>
                <Icon name="person" size={14} color={colors.mut} />
                <Text style={styles.meta}>{item.buyerName || 'Unknown'} · {item.buyerEmail || 'no email'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Icon name="barcode" size={14} color={colors.mut} family="mci" />
                <Text style={styles.meta}>UTR: <Text style={{ color: colors.ink, fontWeight: '800' }}>{item.utr}</Text></Text>
              </View>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>

              {item.flags.length > 0 ? (
                <View style={styles.flags}>
                  {item.flags.map((f, i) => <Text key={i} style={styles.flag}>⚠ {f}</Text>)}
                </View>
              ) : null}

              {st === 'pending' ? (
                <View style={styles.actions}>
                  <Pressable disabled={busy === item.id} style={[styles.actionBtn, { backgroundColor: colors.xpa, opacity: busy === item.id ? 0.5 : 1 }]} onPress={() => approve(item.id)}>
                    <Icon name="checkmark" size={18} color="#06281a" />
                    <Text style={styles.approveText}>{busy === item.id ? 'Working…' : 'Approve'}</Text>
                  </Pressable>
                  <Pressable disabled={busy === item.id} style={[styles.actionBtn, { backgroundColor: colors.card2, opacity: busy === item.id ? 0.5 : 1 }]} onPress={() => reject(item.id)}>
                    <Icon name="close" size={18} color={colors.hp} />
                    <Text style={{ color: colors.hp, fontWeight: '800' }}>Reject</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 40 },
  empty: { color: colors.mut, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierName: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  statusBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  amount: { color: colors.gold, fontWeight: '900', fontSize: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  meta: { color: colors.mut, fontSize: 13, flex: 1 },
  time: { color: colors.mut2, fontSize: 11, marginTop: 6 },
  flags: { marginTop: 8, gap: 2 },
  flag: { color: colors.gold, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 11 },
  approveText: { color: '#06281a', fontWeight: '900' },
});
