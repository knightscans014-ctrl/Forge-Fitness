# Building the APK

Two ways: locally with Android Studio, or on GitHub Actions with no local setup.

---

## The one thing that trips everyone up

**There is no `android/` folder in this repo, and that is deliberate.**

FORGE is a *managed* Expo project. The native Android project is **generated**
from `app.json` by `expo prebuild`, and `android/` is in `.gitignore`.

So do **not** open this repo folder in Android Studio and expect it to build —
Android Studio will not recognise it as an Android project, because at that
point it isn't one. You generate the native project first, then open the
`android/` folder it creates.

Why it works this way: `app.json` stays the single source of truth for the
version, package name, icons, splash and permissions. Committing `android/`
means those values exist in two places and drift apart. The cost is one extra
command before your first build.

---

## Option A — Android Studio (local)

### Prerequisites

| Need | Version | Notes |
|---|---|---|
| Node.js | 20+ | |
| JDK | **17** | Not 11, not 21. Expo SDK 51 + AGP 8 want 17. Android Studio bundles a 17 (Embedded JDK) — use it. |
| Android SDK Platform | **34** | SDK Manager → SDK Platforms |
| Build-Tools | **34.0.0** | SDK Manager → SDK Tools |
| NDK | **26.1.10909125** | SDK Manager → SDK Tools → tick *Show Package Details* |
| Gradle | 8.8 | The wrapper downloads this itself. Don't install it. |

The NDK is the one people skip. Hermes needs it, and without it the build
fails partway through with a message that doesn't obviously say "install the
NDK".

### Steps

```bash
git clone https://github.com/knightscans014-ctrl/Forge-Fitness.git
cd Forge-Fitness
npm install

# Generate the native Android project (creates ./android)
npx expo prebuild --platform android
```

Now **open the `android/` folder** in Android Studio — *not* the repo root.
Let it finish Gradle Sync, then:

**Build → Build Bundle(s) / APK(s) → Build APK(s)**

Output lands in:

```
android/app/build/outputs/apk/release/app-release.apk
```

Or skip the IDE entirely — the wrapper does the same job:

```bash
cd android
./gradlew assembleRelease          # release APK
./gradlew assembleDebug            # debug APK
./gradlew installDebug             # build + install to a connected device
```

### Faster builds while developing

You do not need to build an APK to run the app. With a device on the same
Wi-Fi, or an emulator running:

```bash
npx expo start --android
```

That gives you live reload. Build APKs only when you want a shippable file.

### Shrinking the APK

The default build packs four CPU architectures into one file. To build only
for real phones (roughly halves the size):

```bash
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

`arm64-v8a` covers essentially every phone from the last several years.

---

## Option B — GitHub Actions (no local setup)

**Actions → Build APK → Run workflow →** choose `release` → **Run**.

Takes 10–15 minutes. Download `forge-apk-release` from the finished run's
Artifacts section; the `.apk` is inside the zip. Artifacts are kept 14 days.

Useful when you're on a machine without the SDK, or you want a clean-room build
that doesn't depend on your local state.

---

## Signing — read this before publishing

By default `expo prebuild` points **release** builds at the **debug keystore**.
Expo leaves a comment in `build.gradle` saying as much.

That means an unsigned-for-production APK:

- installs fine for sideloading and sharing ✅
- is **rejected by the Play Store** ❌
- uses a key that differs per machine, so a later build may refuse to install
  over it as an upgrade ❌

### Generating a real key

Once, and once only:

```bash
keytool -genkeypair -v -keystore forge.keystore -alias forge \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Back this file up somewhere you will not lose it.** If you lose the keystore
you can never publish an update to the same Play listing — there is no recovery
process for this. Do not commit it to the repo.

#### Using it locally

Put the keystore in `android/app/`, then add to `android/gradle.properties`
(which is gitignored):

```properties
FORGE_UPLOAD_STORE_FILE=forge.keystore
FORGE_UPLOAD_STORE_PASSWORD=<yours>
FORGE_UPLOAD_KEY_ALIAS=forge
FORGE_UPLOAD_KEY_PASSWORD=<yours>
```

Then run `python3 .github/scripts/sign_release.py` from the repo root to point
the release buildType at that key. It is idempotent and safe to re-run, and it
will refuse rather than guess if the Expo template ever changes shape.

Note that `expo prebuild` regenerates `android/`, so re-run that script after
any prebuild.

#### Using it in CI

Add four repository secrets under **Settings → Secrets and variables →
Actions** and the workflow picks them up with no other changes:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 forge.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | store password |
| `ANDROID_KEY_ALIAS` | `forge` |
| `ANDROID_KEY_PASSWORD` | key password |

Without them the build still succeeds and logs a warning that it used the debug
key.

---

## Versioning

Both values live in `app.json` — never edit them in `build.gradle`, since
prebuild overwrites that file.

```jsonc
"version": "1.0.0",        // shown to users
"android": { "versionCode": 1 }   // must increase on EVERY Play upload
```

Play rejects an upload whose `versionCode` is not higher than the last one.
`1` is correct for a first publish.

---

## Troubleshooting

**"No Android project found" / Android Studio won't recognise the folder**
You opened the repo root. Run `npx expo prebuild --platform android`, then open
the generated `android/` folder.

**`Unsupported class file major version` / Gradle fails on startup**
Wrong JDK. It needs 17. In Android Studio: *Settings → Build, Execution,
Deployment → Build Tools → Gradle → Gradle JDK* → pick the embedded 17.

**NDK not found / Hermes build fails**
Install NDK `26.1.10909125` via SDK Manager (tick *Show Package Details* to see
specific versions).

**Build succeeds but the app crashes instantly on launch**
Usually a stale JS bundle. `cd android && ./gradlew clean`, then rebuild.

**Out of memory during the build**
Raise the heap in `android/gradle.properties`:
`org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`

**Changes to `app.json` aren't showing up**
Re-run `npx expo prebuild --platform android --clean`. Note `--clean` deletes
and regenerates `android/`, discarding any manual edits you made there —
including local signing config.
