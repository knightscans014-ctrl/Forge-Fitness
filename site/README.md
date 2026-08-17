# FORGE — public site

Three static files. No build step, no dependencies. Works on Firebase Hosting,
Cloudflare Pages, GitHub Pages, or GoDaddy cPanel identically.

| File | Purpose |
|---|---|
| `index.html` | Landing page — features, tiers, install instructions |
| `privacy.html` | Privacy policy (required for Play Store; accurate to what the app actually collects) |
| `latest.json` | Version manifest read by `src/services/versionCheck.ts` |
| `firebase.json` | Firebase Hosting config (only needed for Firebase) |

## Deploy to Firebase Hosting (free)

```bash
npm install -g firebase-tools
firebase login
cd site
firebase init hosting     # choose existing/new project; when asked for public dir, accept "."
                          # answer NO to "configure as single-page app"
                          # answer NO to overwriting index.html
firebase deploy --only hosting
```

You get `https://<project>.web.app`. Custom domain: Firebase Console → Hosting →
Add custom domain. SSL is provisioned automatically and free.

## Then wire the app to it

Add to `.env`:

```
EXPO_PUBLIC_VERSION_MANIFEST_URL=https://<project>.web.app/latest.json
```

Until this is set, `checkForUpdate()` returns `null` and the in-app update
prompt never fires. This is the last open item from the review.

## Releasing a new version

1. Bump `version` in `app.json` and `package.json`, bump `android.versionCode`.
2. Build the APK, attach it to a GitHub release named after the version.
3. Update `version` (and `notes`) in `latest.json`, redeploy the site.

`apkUrl` points at GitHub's `releases/latest/download/forge.apk`, so as long as
the release asset is named `forge.apk` the URL never needs changing.

## Why the APK is not hosted here

Firebase Hosting's free Spark tier allows **360 MB/day of transfer**, and on
Spark exceeding it takes the whole site offline until midnight Pacific. A ~50 MB
APK means roughly six downloads before the landing page, privacy policy and
version manifest all stop serving. GitHub Releases has no such cap.

Serve the APK over **HTTPS only**. Over plain HTTP anyone on the same network can
substitute the file, which defeats the app's signature and Play Integrity checks.

## Before going live

- Replace `knightscans014@gmail.com` in both HTML files if you want a separate
  support address — that email is currently public on the page.
- Confirm the privacy policy still matches the app if you add data collection.
- Update the `Last updated` date in `privacy.html` when you change it.
