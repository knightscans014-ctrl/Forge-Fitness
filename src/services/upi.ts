// UPI payments via Razorpay — the standard for Indian apps.
// Strictly UPI: no cards/international methods. Prices in INR.
//
// To go live:
//  1. Create a Razorpay account, get KEY_ID + KEY_SECRET.
//  2. Set EXPO_PUBLIC_RAZORPAY_KEY_ID.
//  3. Backend creates an order via Razorpay Orders API (server-side, for security).
//  4. This file opens the Razorpay UPI checkout with the order details.
//
// The RN SDK is added natively (the npm name varies by version). This service
// isolates all payment logic so the rest of the app is SDK-agnostic.

export interface UPIPlan {
  id: string;          // tier id
  name: string;
  amountPaise: number; // in paise (₹99 = 9900)
  description: string;
  recurring: boolean;  // true for yearly subscription (handled via backend)
}

// Our 3 premium tiers mapped to INR amounts (paise).
export const UPI_PLANS: Record<string, UPIPlan> = {
  t1: { id: 't1', name: 'Ranger', amountPaise: 9900, description: 'Ranger — Forge Premium (1 year)', recurring: true },
  t2: { id: 't2', name: 'Elite', amountPaise: 19900, description: 'Elite — Forge Premium (1 year)', recurring: true },
  t3: { id: 't3', name: 'Monarch', amountPaise: 29900, description: 'Monarch — Forge Premium (1 year)', recurring: true },
};

export type PaymentResult =
  | { status: 'success'; paymentId: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

// Open the Razorpay UPI checkout.
export async function payWithUPI(plan: UPIPlan, orderId: string, email: string, name: string): Promise<PaymentResult> {
  // In Expo, public env vars are inlined at build time via process.env.
  // We read through a safe accessor to avoid requiring node types in TS.
  const keyId = (globalThis as any).process?.env?.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_yourkeyhere';

  // In prod: const RazorpayCheckout = require('@razorpay/react-native-razorpay');
  //          return new Promise((resolve) => {
  //            RazorpayCheckout.open(options).then(data => resolve({status:'success', paymentId: data.razorpay_payment_id}))
  //              .catch(e => resolve(e.code === 0 ? {status:'cancelled'} : {status:'error', message:String(e)}));
  //          });

  console.log(`[upi] opening Razorpay for ${plan.name} ₹${plan.amountPaise / 100} (order ${orderId})`);

  // Simulated flow for prototype — in prod the SDK shows the UPI intent sheet.
  return new Promise(resolve => {
    setTimeout(() => resolve({ status: 'success', paymentId: 'pay_sim_' + Date.now() }), 800);
  });
}

// Create a Razorpay order (client-side proxy). Real implementation must be
// server-side with your KEY_SECRET — never ship the secret in the app.
export async function createOrder(plan: UPIPlan): Promise<{ orderId: string } | { error: string }> {
  // In prod: POST to your backend /api/create-order { planId } with your KEY_SECRET,
  // which calls Razorpay Orders API and returns the order id + amount.
  return { orderId: 'order_' + Date.now() };
}

// Backend webhook should verify payment and grant the entitlement.
// Example curl for a Node endpoint:
//   curl -X POST https://your-backend/webhook/razorpay -d '{"event":"payment.captured", ...}'
export function verifyWebhookPayload(): void {
  // Handled server-side; this is a marker for where it wires in.
}
