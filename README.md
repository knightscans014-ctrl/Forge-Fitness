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

## 💳 Subscriptions (RevenueCat)
`src/services/revenuecat.ts` isolates all billing. **Current state:** working prototype (simulated purchase). To go live:
1. Create a [RevenueCat](https://www.revenuecat.com) project.
2. Add products: `forge_ranger_yearly`, `forge_elite_yearly`, `forge_monarch_yearly` in App Store Connect + Google Play (prices ₹99 / ₹199 / ₹299).
3. Replace `purchaseTier` with `Purchases.purchasePackage(...)`.
4. Add a webhook → your backend grants entitlement + sets `premium=true`.

### Pricing (your model)
- **Free tier:** 100% playable, no paywalls.
- **Ranger ₹99** / **Elite ₹199** / **Monarch ₹299** — yearly, tier-scaled XP/gold boosts.
- **Content-Creator unlock:** submit a video link + email → you review → unlock Ranger free (`submitCreatorUnlock`).

---

## 📱 Native features to add next
- **Push notifications** (daily quests, streak reminders) — `expo-notifications`
- **Apple Health / Google Fit** sync — `expo-health`
- **Haptics** on level-ups/auras — `expo-haptics` (already a dependency)
- **RevenueCat** live payments
- **Backend** (Supabase) for leaderboards + save sync + creator-video review endpoint
