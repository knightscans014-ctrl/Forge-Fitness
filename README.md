# FORGE

A fitness RPG for Android. Log a workout, earn XP, level your stats, climb the
ranks, and fight weekly bosses with a guild.

Built with Expo / React Native. The game engine is pure TypeScript with no React
dependency, so the rules are testable in isolation. The backend is Supabase, and
the security model assumes the client is hostile.

**License: AGPL-3.0.** See [Licensing](#licensing) before you fork.

---

## Running it costs nothing

Every service this project uses has a free tier that a solo developer will not
outgrow quickly. There are no paid SDKs and no billing-enabled dependencies.

| Need | Service | Free tier |
|---|---|---|
| Auth + Postgres | Supabase | 500 MB database, 50k monthly active users |
| Transactional email | Brevo SMTP | 300/day |
| Landing page, privacy policy, `latest.json` | Firebase Hosting or Cloudflare Pages | free, HTTPS included |
| APK distribution | GitHub Releases | free, unmetered |
| Payments | UPI direct to your handle | no processor fee |

Deliberately **not** used: RevenueCat, Stripe, Sentry, Firebase Analytics,
OneSignal, or any object storage. Avatars are URLs, not uploads, so there is no
storage bill and no bucket to secure. Supabase's own free tier pauses rather
than charging you, so there is no path to a surprise invoice.

---

## Setup

```bash
git clone https://github.com/knightscans014-ctrl/Forge-Fitness
cd Forge-Fitness
npm install
cp .env.example .env      # then fill it in
```

### 1. Supabase

Create a project, then in the SQL Editor run, in order:

1. `supabase/schema.sql` — tables, RLS, and the security-definer functions
2. `supabase/migrations/0001_security_hardening.sql` — idempotent, safe to re-run

Before running the schema, uncomment the seed block near the `admins` table and
put your own email in it. Then set the same address as `EXPO_PUBLIC_OWNER_EMAILS`.

**Authentication → URL Configuration:** add `forge://auth/callback` to Redirect URLs.

Email confirmation needs real SMTP — Supabase's built-in sender allows only two
messages per hour. See [`docs/EMAIL-SETUP.md`](docs/EMAIL-SETUP.md).

### 2. Run

```bash
npm run web      # fastest loop; no UPI deep links, no Play Integrity
npm start        # Expo Go on a device
```

### 3. Checks

```bash
npx tsc --noEmit
npx jest
```

---

## Security model

The client is assumed to be compromised. Anything shipped in the APK — including
the Supabase anon key and the admin panel code — is treated as public.

- **Row-level security on all 11 tables.** The `admins` table has RLS enabled with
  *zero* policies, so it is unreadable and unwritable through the REST API by
  anyone. Only `SECURITY DEFINER` functions can see it.
- **Entitlements are server-granted.** Editing local storage to set
  `premium: true` does nothing; `state.ts` lets a server verdict override any
  local value.
- **Leaderboard scores are validated** against your stored `save_state.xp` by a
  trigger. A claimed score of 999999999 is written as your real XP.
- **Payment approval is atomic and admin-only**, and double-approval raises.
- **The hidden admin panel is obfuscation, not security.** Extracting the code
  reveals the UI; every button behind it still fails server-side unless
  `is_admin()` passes.

Verified against a live project using only the public anon key — self-inserting
into `admins`, reading others' payments, `grant_premium`, `approve_payment`,
`reject_payment`, `admin_list_payments`, `revoke_premium`, and writing another
user's save all fail with `permission denied` or `not authorized`.

Reproduce it yourself: `supabase/tests/` contains a Postgres harness and a
seven-step attack script.

### Known limitations

- `save_state.xp` is still written by the client. The trigger stops leaderboard
  inflation, but a determined user can still inflate their own save. Real fix is
  server-side workout validation.
- Play Integrity requires deploying `supabase/functions/verify-integrity` and
  setting `GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT`. Until then the app treats
  integrity as unknown and does not block.
- No APK has been built yet, so ProGuard rules are unverified in practice.

---

## Layout

```
src/engine/      pure TypeScript game rules, no React — unit tested
src/services/    supabase client, auth, payments, sync, integrity
src/screens/     UI
src/context/     auth, game, and security providers
supabase/        schema, migration, edge function, attack tests
site/            landing page, privacy policy, version manifest
docs/            email setup
```

---

## Licensing

FORGE is licensed under the **GNU Affero General Public License v3.0**.

In plain terms:

- Use it, study it, modify it, self-host it — yes, freely.
- Distribute a modified version, or **run one as a network service**, and you must
  publish your source under the same license.

The network clause is the point. A plain GPL app can be reskinned and shipped as
a closed-source competitor; AGPL closes that. You keep the freedom to build on
this, and nobody gets to take it private.

If you self-host, you must change: the seeded admin email, `EXPO_PUBLIC_ADMIN_CODE`,
and `EXPO_PUBLIC_FAMPAY_UPI_ID` — otherwise payments go to the upstream author.

The name "FORGE" and the project's artwork are not covered by the AGPL. Fork the
code, but ship it under your own name.
