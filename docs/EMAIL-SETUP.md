# Production email setup — Brevo SMTP + Supabase

Supabase's built-in email sender is capped at **2 emails per hour** and is explicitly
not for production. That cap is what produced `over_email_send_rate_limit` during
testing. Brevo's free tier raises this to **300/day** and needs no credit card.

---

## 1. Create the Brevo account

1. Sign up at <https://www.brevo.com> and verify your own login email.
2. Go to **Settings → SMTP & API → SMTP** tab.
3. Click **Generate a new SMTP key**. Copy it now — it is shown once.

You now have:

```
Host:     smtp-relay.brevo.com
Port:     587
Username: <the login email shown on the SMTP page>
Password: <the SMTP key, NOT your Brevo account password>
```

The username is the address Brevo displays on that page. It is not always your
account email — read it off the panel rather than assuming.

---

## 2. Authenticate your sending domain

Do this as soon as you own a domain. Skipping it means Brevo rewrites your sender
to `something@brevosend.com`, which looks like spam next to a payment request.

1. **Settings → Senders, Domains & Dedicated IPs → Domains → Add a domain.**
2. Enter your domain, e.g. `forge-fitness.in`.
3. Brevo shows three DNS records. Add them at your registrar:

| Type | Purpose |
|---|---|
| TXT (`brevo-code`) | proves you own the domain |
| TXT or CNAME (DKIM) | signs your mail so Gmail trusts it |
| TXT (DMARC) | policy for unauthenticated mail |

4. Wait for propagation (minutes to a few hours), then hit **Verify**.

Notes:

- **Do not** add `include:spf.sendinblue.com` to your SPF record. On Brevo's shared
  IPs the Return-Path is Brevo's own domain, so SPF contributes nothing to DMARC
  alignment. DKIM alone is what makes DMARC pass.
- A reasonable starting DMARC record:
  `v=DMARC1; p=none; rua=mailto:you@yourdomain.in`
  Move to `p=quarantine` once you've confirmed mail is passing.
- Add a sender address such as `noreply@forge-fitness.in` under **Senders**.

Until the domain is verified, use your own verified email address as the sender.
Mail will arrive, just branded as Brevo.

---

## 3. Point Supabase at Brevo

**Supabase Dashboard → Project Settings → Authentication → SMTP Settings → Enable
custom SMTP.**

| Field | Value |
|---|---|
| Sender email | `noreply@forge-fitness.in` (or your verified Brevo sender) |
| Sender name | `FORGE` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | the address from Brevo's SMTP panel |
| Password | the Brevo **SMTP key** |
| Minimum interval between emails | `60` seconds |

Save. Supabase now sends every auth email through Brevo, and the 2/hour cap is gone.

### Raise Supabase's own rate limits

**Authentication → Rate Limits.** The email limit is still throttled independently of
your SMTP provider. Raise "Rate limit for sending emails" to something matching
Brevo's 300/day (e.g. 100/hour). Leaving it at the default keeps you throttled even
with working SMTP.

---

## 4. Redirect URLs (required — the app is native, not a website)

**Authentication → URL Configuration.**

Add to **Redirect URLs**:

```
forge://auth/callback
```

Set **Site URL** to your landing page once deployed (e.g. `https://forge-fitness.web.app`),
otherwise it defaults to `http://localhost:3000` and any link that falls back to it
is dead for a phone user.

This works because `app.json` now declares `"scheme": "forge"`, and `signUp()` passes
`emailRedirectTo: googleRedirectUri()` which resolves to `forge://auth/callback`.
Both were missing and have been fixed — without them the confirmation link opened a
blank page instead of the app.

> In Expo Go during development the scheme resolves to an `exp://` URL instead.
> Add that URL to the Redirect URLs list too while testing, or test confirmation on
> a real dev build.

---

## 5. Customise the confirmation email

**Authentication → Email Templates → Confirm signup.** The default is unbranded and
reads like a phishing attempt. Minimum viable version:

```html
<h2>Confirm your FORGE account</h2>
<p>Tap below to activate your account and start earning XP.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm my account</a></p>
<p>If you didn't sign up for FORGE, ignore this email.</p>
```

Keep `{{ .ConfirmationURL }}` exactly as written.

---

## 6. Verify it works

1. Keep **Confirm email ON** (Authentication → Providers → Email).
2. Register a real address from the app.
3. Check **Brevo → Transactional → Logs** — the send should appear there. If it
   doesn't, Supabase never handed it over: re-check host, port and the SMTP key.
4. Open the link on the phone. It should open FORGE, not a browser error.
5. Confirm the session lands and a `profiles` row is created.

---

## Limits to keep in mind

| | Value |
|---|---|
| Brevo free | 300 emails/day, resets daily, no rollover |
| Branding | "Sent with Brevo" on every email; removing it costs ~$10.80/mo |
| Logs | unlimited retention on free |
| Paid | Starter $9/mo for 5,000/month with no daily cap |

300/day is roughly 300 signups plus password resets per day. Well beyond launch needs.

## If email still fails

- `over_email_send_rate_limit` after enabling SMTP → you didn't raise the Supabase
  auth rate limit in step 3.
- Mail lands in spam → domain not authenticated yet (step 2).
- Confirmation link opens a blank page → `forge://auth/callback` missing from
  Redirect URLs, or you're on a build made before the `scheme` fix.
