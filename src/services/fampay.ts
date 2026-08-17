// Fampay UPI payments — receive money via your Fampay UPI ID / QR code.
//
// WHY THIS APPROACH:
//   Payment gateways (Razorpay etc.) require business registration, GST,
//   and a bank account — not available to an 18-year-old with only Fampay.
//   Instead, we use the universal UPI deep-link (upi://pay). ANY UPI ID,
//   including a Fampay UPI ID/QR, can receive money this way with zero
//   merchant KYC. The payer's UPI app opens, they pay your Fampay ID.
//
// VERIFICATION MODEL (since there's no gateway to auto-confirm):
//   manual:  user pays → gets a UPI transaction reference (UTR/ref no)
//            → enters it in the app → status "pending"
//            → you check your Fampay history & approve → premium granted.
//            Optionally the user uploads a payment screenshot.
//
// SETUP INSTRUCTIONS:
//   1. Replace 'yourname@fam' with your actual Fampay UPI ID
//   2. Replace 'FORGE' with your name or business name to display to payers
//   3. (Optional) Add your QR code image to assets/ as "fampay-qr.png"
//   4. Users will scan your QR code or use the UPI link to pay you directly
//
// NO MERCHANT KYC NEEDED: This uses standard UPI P2P payments to your Fampay account.

import * as Linking from 'expo-linking';

export interface FampayConfig {
  upiId: string;        // Your Fampay UPI ID (e.g., "yourname@fam")
  payeeName: string;    // Name shown to payer
  note: string;         // Payment purpose
  qrCodeAsset?: number; // Optional: require('../assets/fampay-qr.png') - returns a number in Expo
}

export const FAMPAY_CONFIG: FampayConfig = {
  // ⚠️ REPLACE THESE WITH YOUR ACTUAL FAMPAY DETAILS:
  upiId: process.env.EXPO_PUBLIC_FAMPAY_UPI_ID || 'yourname@fam',      // ← Put your Fampay UPI ID here
  payeeName: process.env.EXPO_PUBLIC_FAMPAY_NAME || 'FORGE',         // ← Put your name/business name here
  note: 'Forge Premium',
  qrCodeAsset: undefined,     // e.g., require('../../assets/fampay-qr.png')
};

export interface UPITier {
  id: string;
  name: string;
  amountPaise: number; // ₹99 = 9900
  perks: string[];
}

// Our 3 tiers, paid to your Fampay UPI ID.
export const UPI_TIERS: Record<string, UPITier> = {
  t1: { id: 't1', name: 'Ranger', amountPaise: 9900, perks: ['+10% XP', '+15% gold', 'Extra quest slot'] },
  t2: { id: 't2', name: 'Elite', amountPaise: 19900, perks: ['+25% XP', 'Weekly loot crate', 'All stat presets'] },
  t3: { id: 't3', name: 'Monarch', amountPaise: 29900, perks: ['+40% XP', 'Monarch avatar', 'Early raids'] },
};

export function rs(paise: number): number {
  return paise / 100;
}

// Build a universal UPI deep-link for a given amount. Returns the url.
export function buildUpiLink(amountPaise: number, tierName: string): string {
  const pa = encodeURIComponent(FAMPAY_CONFIG.upiId);
  const pn = encodeURIComponent(FAMPAY_CONFIG.payeeName);
  const amt = (amountPaise / 100).toFixed(2);
  const note = encodeURIComponent(`${FAMPAY_CONFIG.note} ${tierName}`);
  // Standard UPI intent — works on GPay, PhonePe, Paytm, BHIM, etc.
  return `upi://pay?pa=${pa}&pn=${pn}&am=${amt}&tn=${note}&cu=INR`;
}

// Open the user's UPI app to pay your Fampay ID. Returns true if it launched.
export async function openUpiPayment(amountPaise: number, tierName: string): Promise<{ ok: boolean; url: string }> {
  const url = buildUpiLink(amountPaise, tierName);
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) return { ok: false, url };
    await Linking.openURL(url);
    return { ok: true, url };
  } catch {
    return { ok: false, url };
  }
}

// Manual verification helpers (stored in the game state / backend).
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface UpiPayment {
  id: string;
  tierId: string;
  amountPaise: number;
  refNumber: string; // UPI transaction reference (UTR) the user enters
  status: PaymentStatus;
  createdAt: number;
}

export function makePayment(tierId: string, refNumber: string): UpiPayment {
  const tier = UPI_TIERS[tierId];
  return {
    id: 'p_' + Date.now(),
    tierId,
    amountPaise: tier.amountPaise,
    refNumber,
    status: 'pending',
    createdAt: Date.now(),
  };
}

// In a real backend, this becomes: admin marks payment approved after
// matching the UTR in their Fampay history → grants premium entitlement.
export function approvePayment(p: UpiPayment): UpiPayment {
  return { ...p, status: 'approved' };
}
