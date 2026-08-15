// Subscription service abstraction.
// In production, back this with RevenueCat (or react-native-purchases) which
// wraps Stripe (Android/web) + App Store IAP (iOS). This file isolates all
// billing logic so the UI never depends on the SDK.

import { GameState } from '../engine';
import { PREMIUM_TIERS } from '../engine';

export type PurchaseState = 'loading' | 'idle' | 'purchased';

export interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  entitlement: 'premium';
  storeId: string;
}

// Map our logical tiers to store product IDs (replace with real ones).
export const STORE_PRODUCTS: Record<string, string> = {
  t1: 'forge_ranger_yearly',
  t2: 'forge_elite_yearly',
  t3: 'forge_monarch_yearly',
};

export const PLANS: Plan[] = PREMIUM_TIERS.map(t => ({
  id: t.id,
  name: t.name,
  price: t.price,
  period: t.per,
  entitlement: 'premium',
  storeId: STORE_PRODUCTS[t.id],
}));

/**
 * In dev this returns instantly. In prod, replace the body with:
 *   Purchases.configure({ apiKey: REVENUECAT_API_KEY });
 *   const offerings = await Purchases.getOfferings();
 *   await Purchases.purchasePackage(offering);
 * then refresh entitlements via a webhook -> backend grant.
 */
export async function purchaseTier(s: GameState, tierId: string): Promise<boolean> {
  console.log(`[revenuecat] purchasing ${tierId} (${STORE_PRODUCTS[tierId]})`);
  // Simulated success for the prototype.
  s.premium = true;
  s.tier = tierId;
  return true;
}

export async function restorePurchase(): Promise<boolean> {
  console.log('[revenuecat] restorePurchase — checking entitlements...');
  return false; // no prior purchase in prototype
}

/** Verify an entitlement is still active (server would confirm period end). */
export async function isEntitlementActive(tierId: string): Promise<boolean> {
  return true;
}

// ---- Content-Creator unlock (sends the video link to you for review) ----
export async function submitCreatorUnlock(email: string, videoLink: string): Promise<boolean> {
  // In prod: POST to your backend { email, videoLink } -> you get an email to review
  // the video manually -> on approval, backend sets creatorCode=true via push.
  console.log(`[creator] submitted ${email} / ${videoLink} for review`);
  return true;
}
