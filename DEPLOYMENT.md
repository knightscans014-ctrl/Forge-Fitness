# 🚀 FORGE — Complete Go-Live & Security Setup Guide

This guide turns the code into a running, secure, distributable app. Follow in order.

---

## Part 1 — Supabase (auth + server-authority security) — FREE

The security layer (server-verified premium, admin) only works once Supabase is live.

### 1. Create the project
1. Go to [supabase.com](https://supabase.com) → **Start your project** (free plan).
2. Create a new project, note the **Project URL** and **anon key** (Settings → API).

### 2. Enable Auth providers
1. **Authentication → Providers**.
2. Turn on **Email** (Password) — used for email login/signup.
3. Turn on **Google** — add your Google OAuth credentials (see Google setup below).

### 3. Run the schema
1. In the Supabase dashboard, open **SQL Editor**.
2. Paste the entire contents of `supabase/schema.sql`.
3. Click **Run**. This creates all tables + security functions + RLS.

### 4. Set your admin email
In `supabase/schema.sql` (or SQL editor):
```sql
insert into public.admins (email) values ('YOUR_REAL_EMAIL@gmail.com');
```
This is the **only** email that can grant premium / access admin. Replace the placeholder.

### 5. Add the app's env keys
In `.env` (and EAS build vars):
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```
> The **anon key is safe to embed** (it's public by design). The **service role key is SECRET — never put it in the app.**

---

## Part 2 — Payments (Fampay UPI)

1. In `src/services/fampay.ts`, set your **real Fampay UPI ID**:
   ```ts
   upiId: 'yourname@fam',   // <- replace
   ```
2. Set `EXPO_PUBLIC_FAMPAY_UPI_ID` in `.env` too (the app uses this to build the `upi://pay` link).

---

## Part 3 — Admin secret & access

In `src/services/adminAccess.ts`:
```ts
export const OWNER_EMAILS = ['YOUR_REAL_EMAIL@gmail.com'];  // <- your email
export const ADMIN_SECRET = 'a-long-code-only-you-know';      // <- change me
```
The admin is opened by tapping your **Home avatar 5× fast**, then entering the code. It's invisible to everyone else.

---

## Part 4 — Android hardening (Hermes + obfuscation)

Already configured in `app.json`:
- `hermesBytecode: true` — JS compiles to bytecode (not plaintext).
- `proguard: true` / `enableProguardInReleaseBuilds` — obfuscates + shrinks the native/release build.

For the **root/signature detection** to be real (not just stubs), the native module must set these globals. Add a small native module (Kotlin) that:
- Sets `__forgeRooted` = whether root (su) is present.
- Sets `__forgeBuildProps` = Build.FINGERPRINT / MODEL / PRODUCT.
- Sets `__forgeSignatureValid` = checks the signing cert hash against your known hash.

(If you use Expo prebuild, add this via a config plugin or a `MainApplication` edit.)

---

## Part 5 — Version check (APK distribution)

For APK mirrors + your website, add a lightweight "new version" check:
- Host a `latest.json` on your website: `{ "version": "0.1.0", "apkUrl": "..." }`.
- On app launch, fetch it; if newer, show "Update available" pointing to your site.
- (I can add this service next if you want.)

---

## Part 6 — Build & distribute

```bash
npm install
npx expo start        # dev

# Build a release APK
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease   # or use EAS Build
```

**Signing (CRITICAL):**
- Generate a keystore once: `keytool -genkey -v -keystore forge-release.keystore -alias forge -keyalg RSA -keysize 2048 -validity 10000`
- **Keep it safe & secret.** Never commit it. Losing it = can't update the app. Leaking it = someone can push malicious "updates."

Distribute the signed APK to:
- **UptoDown**, **APKPure**, **Aptoide**, **F-Droid** (optional), your **website**.
- iOS sideloading isn't possible on these platforms (Android APK only).

---

## Part 7 — Google login (optional, if you enable it)

To use "Continue with Google":
1. Google Cloud Console → create OAuth client.
2. Add the Supabase redirect callback URL.
3. Put client id in `EXPO_PUBLIC_GOOGLE_CLIENT_ID`.

---

## ⚠️ Cost check (free forever)
| Item | Cost |
|------|------|
| Supabase free tier | ₹0 (500MB DB, 50k users) |
| All security code | ₹0 |
| APK mirror distribution | ₹0 |
| Google Play (optional) | $25 one-time |
| **Total for your path** | **₹0** (until you grow huge) |
