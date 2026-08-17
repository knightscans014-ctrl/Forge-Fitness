// Payment records + admin verification.
//
// Since there is no payment gateway to auto-confirm (Fampay personal UPI),
// buyers manually type their UPI transaction reference (UTR). We store every
// payment on the SERVER so the owner can review it from their own device.
//
// Previously this wrote only to AsyncStorage on the buyer's phone, and the
// admin panel read the OWNER's phone -- so submitted payments were invisible
// to the person who had to approve them. The flow could never complete.
//
// A local mirror is still kept so the buyer can see their own submission
// history offline, but the server is the source of truth.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPI_TIERS } from './fampay';
import { getSupabase, currentUser } from './supabaseClient';

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

// ---------------------------------------------------------------------------
// Local mirror (buyer's own history / offline fallback)
// ---------------------------------------------------------------------------

export async function loadLocalPayments(): Promise<PaymentRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalPayments(list: PaymentRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

// Map a Supabase row -> the shape the UI already understands.
function fromRow(r: any): PaymentRecord {
  return {
    id: r.id,
    tierId: r.tier_id,
    tierName: r.tier_name,
    amountPaise: r.amount_paise,
    buyerEmail: r.buyer_email ?? undefined,
    buyerName: r.buyer_name ?? undefined,
    utr: r.utr,
    status: r.status,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).getTime() : undefined,
    flags: r.flags || [],
  };
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

export interface SubmitResult {
  record: PaymentRecord | null;
  ok: boolean;
  synced: boolean;      // did it reach the server?
  flags: string[];
  error?: string;
}

/**
 * Create a pending payment from a buyer-submitted UTR.
 * Writes to Supabase (the owner can then see and approve it).
 */
export async function submitPayment(opts: {
  tierId: string;
  utr: string;
  buyerName?: string;
}): Promise<SubmitResult> {
  const tier = UPI_TIERS[opts.tierId];
  if (!tier) return { record: null, ok: false, synced: false, flags: [], error: 'Unknown tier' };

  const utr = opts.utr.trim();
  const flags: string[] = [];
  if (!/^\d{6,}$/.test(utr)) flags.push('UTR format looks unusual');

  const user = await currentUser();
  if (!user) {
    return {
      record: null, ok: false, synced: false, flags,
      error: 'You must be signed in to submit a payment.',
    };
  }

  const record: PaymentRecord = {
    id: 'p_' + Date.now(),
    tierId: opts.tierId,
    tierName: tier.name,
    amountPaise: tier.amountPaise,
    buyerEmail: user.email ?? undefined,
    buyerName: opts.buyerName,
    utr,
    status: 'pending',
    createdAt: Date.now(),
    flags,
  };

  const supabase = getSupabase();
  if (!supabase) {
    await saveLocalPayments([record, ...(await loadLocalPayments())]);
    return { record, ok: false, synced: false, flags, error: 'Offline — not submitted to the server yet.' };
  }

  const { error } = await supabase.from('payments').insert({
    id: record.id,
    user_id: user.id,
    tier_id: record.tierId,
    tier_name: record.tierName,
    amount_paise: record.amountPaise,
    buyer_email: record.buyerEmail,
    buyer_name: record.buyerName,
    utr: record.utr,
    status: 'pending',
    flags,
  });

  if (error) {
    // Unique index on UTR: the same receipt cannot be claimed twice.
    const dup = (error as any)?.code === '23505' || /duplicate|unique/i.test(error.message || '');
    await saveLocalPayments([record, ...(await loadLocalPayments())]);
    return {
      record, ok: false, synced: false, flags,
      error: dup
        ? 'That UTR has already been submitted.'
        : (error.message || 'Could not submit payment.'),
    };
  }

  await saveLocalPayments([record, ...(await loadLocalPayments())]);
  return { record, ok: true, synced: true, flags };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** The signed-in buyer's own payments (RLS: you only ever see your rows). */
export async function loadMyPayments(): Promise<PaymentRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return loadLocalPayments();
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return loadLocalPayments();
    return data.map(fromRow);
  } catch {
    return loadLocalPayments();
  }
}

/**
 * ADMIN: every payment, across all users.
 * Goes through admin_list_payments(), a SECURITY DEFINER function that raises
 * 'not authorized' for non-admins.
 */
export async function adminLoadPayments(status?: PaymentStatus): Promise<PaymentRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('admin_list_payments', {
      p_status: status ?? null,
    });
    if (error || !data) return [];
    return (data as any[]).map(fromRow);
  } catch {
    return [];
  }
}

export async function getPendingCount(): Promise<number> {
  const list = await adminLoadPayments('pending');
  return list.length;
}

/** @deprecated use loadMyPayments() (buyer) or adminLoadPayments() (owner). */
export const loadPayments = loadMyPayments;
