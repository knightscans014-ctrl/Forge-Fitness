# ⚔️ FORGE — Native App (Expo / React Native)

The **real native Android + iOS app** build. The game engine is pure TypeScript (tested), the UI is React Native.

> **Why native?** Real performance, App Store + Play Store ready, native subscriptions via RevenueCat, push notifications, and no HTML-file bloat. The web prototype (`../fit-rpg/index.html`) becomes a design reference; this is the shippable product.

---

## 🚀 Run it

```bash
cd forge-native
npm install
npx expo start          # scan QR with Expo Go, or press a / i for emulator
```

Build a store binary:
```bash
npx expo run:android     # or: eas build -p android
npx expo run:ios         # requires macOS + Xcode; or: eas build -p ios
```

---

## 📁 Architecture

```
forge-native/
├── App.tsx                      # tab navigator + hydration gate
├── app.json                     # Expo config (id: com.forge.fitness)
├── assets/                      # REAL media files (not base64)
│   ├── icon.png                 # app icon (from your MC art)
│   └── mc/                      # your GIFs + portraits
└── src/
    ├── engine/                  # ★ Pure TS game logic (tested)
    │   ├── types.ts             #   domain types
    │   ├── levels.ts            #   XP curve, ranks, combat values
    │   ├── content.ts           #   classes, quests, missions, boosters, tiers
    │   ├── state.ts             #   save schema, multipliers, premium math
    │   ├── rewards.ts           #   addXP/addGold, gear/loot
    │   ├── missions.ts          #   weekly/story/tiered/milestone/challenge
    │   ├── index.ts             #   public API (ENGINE)
    │   └── __tests__/           #   unit tests (7 passing)
    ├── context/GameContext.ts   # Zustand store + persistence
    ├── services/
    │   ├── storage.ts           #   AsyncStorage persistence
    │   └── revenuecat.ts        #   ★ subscription SDK wrapper (stub)
    ├── screens/                 # Home, Missions, Character, Log, Social, Shop
    ├── components/ui.tsx        # Card, Btn, Pill, Bar, StatRow
    └── theme/colors.ts
```

## 🧠 Engine tests
```bash
npm run test
```
The engine is framework-free — same logic powers web, iOS, and Android. **Test the game math, not the UI.**

## 🎮 Full game systems (v5 "max" pass)
- **Levels, F→S Hunter Ranks** — XP curve, rank ladders, rank-up auras
- **Stats from real habits** — STR/VIG/VIT/FLX/FOC grow by training
- **Daily quests (rotating pool)**, **Daily Challenge**, **Weekly quests**, **Story arcs**, **Tiered missions**, **Milestones**
- **Missions tab** — all of the above with progress bars
- **Dopamine loop** — critical XP, streak combos, timed boosters (XP Rush, Gold Fever, Energy Elixir, Combo Master)
- **Boss battles** — active turn-based combat vs personal milestone bosses, guaranteed loot
- **Battle tab** — raid bosses, boss ladder, combat stats
- **Guilds + weekly raid** — shared raid boss your guild whittles down
- **PvP duels** — beat AI rivals, build a duel streak
- **Seasons** — 2-week ranked seasons (Bronze → Monarch), seasonal XP
- **Skill tree** — 6 skills, rank 1–5, permanent passive buffs
- **Gear/loot** — weapon/armor/trinket drops (4 rarities), equip for combat power
- **Habit stacking** — chain related activities for combo bonuses
- **Achievements** — 15 unlockables, auto-awarded
- **Progress analytics** — workout trends, streaks, stacks, achievement gallery
- **Subscriptions** — generous free tier + 3 INR tiers (Ranger ₹99/Elite ₹199/Monarch ₹299) + content-creator unlock

---

## 🤖 CI + Backend
- **`.github/workflows/build.yml`** — auto type-checks + runs all engine tests on every push to `main`.
- **`supabase/schema.sql`** — Postgres schema for multi-user: profiles, save_state, leaderboard, guilds + raids, subscriptions, creator-video review queue (with RLS).
- **`src/services/sync.ts`** — Supabase sync stub (wire real calls with `EXPO_PUBLIC_SUPABASE_*` env vars).

## 🚀 Recent additions
- Daily reward claim streak (7-day calendar) with a Home card
- Aura GIF celebrations (level-up / rank-up / boss) wired into the overlay with haptics
- Skill Tree + Inventory modals (were dead buttons, now functional)
- 3 new bosses (7 total), 6 new achievements (21 total), Lucky Charm loot booster
- Toast notification system for all rewards/events
- Duel-win & boss-victory celebration feedback

---

## 🔐 Authentication (Supabase Auth)
Email/password + Google OAuth. `src/services/auth.ts` + `AuthContext.ts`.
- **Login/Signup screen** gating the whole app.
- **Google Sign-In** via Supabase OAuth (needs callback URL configured).
- Sessions persist via AsyncStorage.
- To go live: create a Supabase project, enable Email + Google providers, set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## 💳 Payments — Fampay UPI (for an 18yo, no merchant KYC)
`src/services/fampay.ts` lets you **receive money via your Fampay UPI ID / QR** using the universal `upi://pay` deep link — no payment gateway, no business registration, no GST. The payer's UPI app (GPay/PhonePe/Paytm) opens and sends money straight to your Fampay ID.
- Prices: **Ranger ₹99 / Elite ₹199 / Monarch ₹299** (yearly).
- **Verification:** since there's no gateway to auto-confirm, it's a manual flow:
  1. User pays → opens their UPI app to your Fampay ID.
  2. User enters the **UPI transaction reference (UTR)** from their payment.
  3. You check your Fampay history, match the UTR, and approve → premium granted.
- To go live: set `EXPO_PUBLIC_FAMPAY_UPI_ID` to your real Fampay ID.

### Pricing (your model)
- **Free tier:** 100% playable, no paywalls.
- **Ranger ₹99** / **Elite ₹199** / **Monarch ₹299** — yearly, tier-scaled XP/gold boosts, paid via UPI.
- **Content-Creator unlock:** submit a video link + email → you review → unlock Ranger free (`submitCreatorUnlock`).

---

## 📱 Native features to add next
- **Push notifications** (daily quests, streak reminders) — `expo-notifications`
- **Apple Health / Google Fit** sync — `expo-health`
- **Haptics** on level-ups/auras — `expo-haptics` (already a dependency)
- **RevenueCat** live payments
- **Backend** (Supabase) for leaderboards + save sync + creator-video review endpoint
