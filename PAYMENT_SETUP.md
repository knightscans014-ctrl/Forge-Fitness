# Fampay UPI Payment Setup Guide

## Overview
Forge Fitness uses **Fampay UPI** for all payments. This is a simple, peer-to-peer payment system that requires:
- ✅ Only your personal Fampay account
- ✅ No business registration
- ✅ No GST
- ✅ No merchant KYC
- ✅ No payment gateway fees

Users pay you directly through UPI (GPay, PhonePe, Paytm, BHIM, etc.) to your Fampay UPI ID.

---

## Step 1: Get Your Fampay UPI ID

1. Open your Fampay app
2. Go to Profile/Settings → UPI ID
3. Your UPI ID will look like: `yourname@fam` or similar
4. **Copy this UPI ID** - you'll need it below

---

## Step 2: Generate Your UPI QR Code (Optional but Recommended)

### Option A: Use Fampay's Built-in QR
1. Open Fampay app
2. Navigate to "Receive Money" or "QR Code" section
3. Take a screenshot of your QR code
4. Crop it to show only the QR code
5. Save as `fampay-qr.png` in `/workspace/Forge-Fitness/assets/`

### Option B: Generate QR Code Online
1. Go to any free UPI QR generator website
2. Enter your UPI ID
3. Download the QR code as PNG
4. Save as `fampay-qr.png` in `/workspace/Forge-Fitness/assets/`

---

## Step 3: Configure the App

Open `/workspace/Forge-Fitness/src/services/fampay.ts` and update:

```typescript
export const FAMPAY_CONFIG: FampayConfig = {
  // ⚠️ REPLACE WITH YOUR ACTUAL DETAILS:
  upiId: 'yourname@fam',      // ← Your Fampay UPI ID
  payeeName: 'Your Name',     // ← Your name or business name
  note: 'Forge Premium',
  qrCodeAsset: require('../../assets/fampay-qr.png'), // ← Uncomment if you added QR
};
```

**Important:** 
- Replace `'yourname@fam'` with your actual Fampay UPI ID
- Replace `'Your Name'` with what you want users to see when they pay
- If you added a QR code, uncomment the `qrCodeAsset` line

---

## Step 4: How Payments Work

### User Flow:
1. User taps "Go Premium" in the app
2. Selects a tier (Ranger ₹99, Elite ₹199, Monarch ₹299)
3. Taps "Pay via UPI"
4. Their UPI app opens (GPay/PhonePe/Paytm)
5. They pay to **your Fampay UPI ID**
6. They get a **UPI Transaction Reference (UTR)** number
7. They enter the UTR in the app
8. Payment status = "Pending"

### Admin Flow (You):
1. Open the app → Admin Screen
2. See pending payments with UTR numbers
3. Check your Fampay app for received payments
4. Match UTR numbers
5. Tap "Approve" → User gets premium access
6. Or tap "Reject" if payment not found

---

## Step 5: Test the Payment Flow

1. Run the app: `cd /workspace/Forge-Fitness && npm start`
2. Go to Shop screen
3. Tap "Go Premium"
4. Verify your UPI ID is displayed correctly
5. If you added QR code, verify it shows up
6. Test the UPI payment flow (use a small amount first)

---

## Payment Tiers

The app has 3 preset tiers (configurable in `fampay.ts`):

| Tier | Price | Perks |
|------|-------|-------|
| **Ranger** | ₹99/year | +10% XP, +15% gold, Extra quest slot |
| **Elite** | ₹199/year | +25% XP, Weekly loot crate, All stat presets |
| **Monarch** | ₹299/year | +40% XP, Monarch avatar, Early raids |

To change prices, edit `UPI_TIERS` in `/workspace/Forge-Fitness/src/services/fampay.ts`.

---

## Security Notes

✅ **Anti-Fraud Features:**
- Users must provide UTR (transaction reference)
- You manually verify each payment in your Fampay app
- Admin panel shows flags for suspicious UTRs
- Server-side verification prevents client-side cheating

⚠️ **Important:**
- Always verify UTR matches your Fampay transaction history
- Check that the amount paid matches the tier price
- Reject payments with invalid/fake UTRs

---

## Troubleshooting

### "Could not open UPI app"
- User needs a UPI app installed (GPay, PhonePe, Paytm, BHIM)
- They can manually pay using your UPI ID shown in the app

### User says they paid but you don't see it
- Ask for the UTR/screenshot
- Check if they paid to the correct UPI ID
- Verify the amount matches the tier
- Some UPI apps delay showing transactions

### QR code not showing
- Make sure file is named exactly `fampay-qr.png`
- Check file is in `/workspace/Forge-Fitness/assets/`
- Uncomment `qrCodeAsset` line in config
- Rebuild the app

---

## Next Steps

1. ✅ Set your UPI ID in `fampay.ts`
2. ✅ Add your QR code (optional)
3. ✅ Test payment flow
4. ✅ Share app with users
5. ✅ Monitor admin panel for payments
6. ✅ Approve verified payments

---

## Support

For issues with:
- **Fampay UPI**: Contact Fampay support
- **App payment flow**: Check logs in admin panel
- **UTR verification**: Cross-reference with Fampay transaction history

---

**No RevenueCat, Stripe, or payment gateway needed!** 🎉
All payments go directly to your Fampay account with zero fees.
