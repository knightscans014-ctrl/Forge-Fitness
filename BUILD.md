# 📱 FORGE — Build Your APK (Step-by-Step)

This guide builds the **actual Android APK** on your computer. You'll need a Windows/Mac/Linux PC (not a phone, not this workspace).

**Time:** ~30–60 min first time (mostly downloads). After that, ~5–10 min per build.
**Disk space:** need ~15–20 GB free.

---

## Prerequisites (do these ONCE, in order)

### 1. Install Node.js (free)
- Download from https://nodejs.org (choose **LTS** version, e.g. 20.x)
- Install it. Verify in a terminal/cmd:
  ```
  node --version
  npm --version
  ```

### 2. Install Git (free)
- Download from https://git-scm.com
- Verify: `git --version`

### 3. Install Java JDK 17 (free) — REQUIRED
Modern React Native **requires JDK 17** (not 8/11).
- Download **Temurin 17**: https://adoptium.net → Temurin 17 → your OS installer
- After install, set JAVA_HOME. Verify:
  ```
  java -version   # must say "version 17.x"
  ```
  - Windows: set in System Environment Variables → `JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.x.x`
  - Mac: add to `~/.zshrc`: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`

### 4. Install Android Studio (free) — this gives you the Android SDK
- Download from https://developer.android.com/studio
- Install it fully (this downloads the Android SDK).
- First launch → it installs SDK components automatically.

### 5. Add Android SDK path
- **Windows:** Create environment variable `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
  (add to PATH: `%LOCALAPPDATA%\Android\Sdk\platform-tools`)
- **Mac:** add to `~/.zshrc`:
  ```
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

---

## Get your project code

```bash
git clone https://github.com/knightscans014-ctrl/Forge-Fitness.git
cd Forge-Fitness
npm install
```

> If you haven't pushed to GitHub yet, just copy the `forge-native` folder to your PC instead.

---

## Set your config values (IMPORTANT)

Before building, open these files and set real values:

1. **`src/services/fampay.ts`** → set `upiId: 'YOUR-REAL-FAMPAY-UPI-ID'`
2. **`src/services/adminAccess.ts`** →
   - `OWNER_EMAILS = ['YOUR-REAL-EMAIL']`
   - `ADMIN_SECRET = 'a-secret-code-only-you-know'`
3. **`.env`** (create from `.env.example`) → set Supabase URL + anon key (if you want auth to work)
   - (Skip Supabase for now if you just want a test APK — the app will run, just without login/payments.)

---

## Generate the Android project

Expo needs to create the native Android folder. Run:
```bash
npx expo prebuild --platform android
```
This creates the full `android/` folder (gradle files, manifest, etc.).

---

## Create your signing keystore (ONCE — do not lose this!)

The APK must be signed. Generate a keystore:
```bash
keytool -genkey -v \
  -keystore forge-release.keystore \
  -alias forge \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_PASSWORD
```
You'll be asked for your name/org — enter anything. **Keep `forge-release.keystore` and the password SAFE. Never share them. Never put them on GitHub.**

Then make gradle sign automatically with it:
1. Create `android/keystore.properties`:
   ```
   storePassword=YOUR_PASSWORD
   keyPassword=YOUR_PASSWORD
   keyAlias=forge
   storeFile=forge-release.keystore
   ```
2. Put `forge-release.keystore` in the `android/` folder.

---

## Build the APK

```bash
cd android
./gradlew assembleRelease
```
- **Windows** use: `gradlew.bat assembleRelease`

**First time** this downloads Gradle + dependencies (~5–15 min). 

**Output:** your signed APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Install & test

- **On your phone:** copy the APK to your phone, tap it, allow "install from unknown sources", install.
- **On emulator:** in Android Studio, open the AVD manager, start a device, then:
  ```bash
  ./gradlew installRelease
  ```

---

## Distribute

Upload `app-release.apk` to:
- **UptoDown**
- **APKPure**, **Aptoide**
- **Your website** (with the version-check pointing to a `latest.json`)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `java` not found / wrong version | Install JDK 17, set JAVA_HOME, restart terminal |
| `ANDROID_HOME is not defined` | Set ANDROID_HOME env var (step 5), restart |
| `SDK location not found` | Run Android Studio once to install SDK, or add `sdk.dir` to `android/local.properties` |
| Gradle download slow | It's normal first time; wait |
| Build fails with memory error | In `android/gradle.properties` increase: `org.gradle.jvmargs=-Xmx2048m` |
| `proguard` errors | The `proguard-rules.pro` already handles RN; if you get warnings, they're usually safe to ignore |

---

## iOS?
These APK mirrors + your website are **Android-only** (iOS can't sideload like this). iOS would need a Mac + Apple Developer account ($99/yr) — optional later.

---

## After a code change, rebuild

```bash
npx expo prebuild --platform android   # if you added native modules
cd android
./gradlew assembleRelease
```
(The keystore signs it again automatically.)
