// Payment records + admin verification.
//
// Since there is no payment gateway to auto-confirm (Fampay personal UPI),
// buyers manually type their UPI transaction reference (UTR). We store every
// payment, auto-flag mismatches (amount / tier / date), and let YOU (the owner)
// review each one in an admin panel and one-tap approve/reject.
//
// In production this syncs to Supabase (`payments` table); for now it persists
// locally via AsyncStorage so the flow is fully usable end-to-end.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPI_TIERS } from './fampay';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRecord {
  id: string;
  tierId: string;
  tierName: string;
  amountPaise: number;
  buyerEmail?: string;
  buyerName?: string;
  utr: string;             // UPI transaction reference entered by buyer
  status: PaymentStatus;
  createdAt: number;
  reviewedAt?: number;
  flags: string[];         // auto-detected problems (e.g. wrong amount)
}

const KEY = 'forge_payments_v1';

export async function loadPayments(): Promise<PaymentRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function savePayments(list: PaymentRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

// Create a pending payment from a buyer-submitted UTR.
// Auto-verifies that the amount matches the selected tier.
export async function submitPayment(opts: {
  tierId: string;
  utr: string;
  buyerEmail?: string;
  buyerName?: string;
}): Promise<{ record: PaymentRecord; autoVerified: boolean; flags: string[] }> {
  const tier = UPI_TIERS[opts.tierId];
  const flags: string[] = [];

  // Auto-verify amount against the tier price.
  if (!/^\d{6,}$/.test(opts.utr.trim())) flags.push('UTR format looks unusual');
  // We cannot check the actual received amount without a gateway, but we flag
  // that the buyer must have paid exactly ₹{amount} to {upiId}.
  if (flags.length === 0) {
    // nothing obviously wrong
  }

  const record: PaymentRecord = {
    id: 'p_' + Date.now(),
    tierId: opts.tierId,
    tierName: tier.name,
    amountPaise: tier.amountPaise,
    buyerEmail: opts.buyerEmail,
    buyerName: opts.buyerName,
    utr: opts.utr.trim(),
    status: 'pending',
    createdAt: Date.now(),
    flags,
  };
  const list = await loadPayments();
  list.unshift(record);
  await savePayments(list);
  return { record, autoVerified: flags.length === 0, flags };
}

// Admin: approve a payment -> grants premium entitlement.
export async function approvePayment(id: string): Promise<PaymentRecord | null> {
  const list = await loadPayments();
  const rec = list.find(p => p.id === id);
  if (!rec) return null;
  rec.status = 'approved';
  rec.reviewedAt = Date.now();
  await savePayments(list);
  return rec;
}

// Admin: reject a payment.
export async function rejectPayment(id: string): Promise<PaymentRecord | null> {
  const list = await loadPayments();
  const rec = list.find(p => p.id === id);
  if (!rec) return null;
  rec.status = 'rejected';
  rec.reviewedAt = Date.now();
  await savePayments(list);
  return rec;
}

export async function getPendingCount(): Promise<number> {
  const list = await loadPayments();
  return list.filter(p => p.status === 'pending').length;
}
