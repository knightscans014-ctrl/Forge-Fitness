# FORGE

A fitness RPG for Android. Log a workout, earn XP, level your stats, climb the
ranks, and fight bosses.

Built with Expo / React Native. The game engine is pure TypeScript with no React
dependency, so the rules are testable in isolation.

**FORGE runs entirely on your device.** No account, no server, no network calls,
no analytics, no ads, no in-app purchases. Your save file never leaves your
phone. Every feature is unlocked for everyone.

Licensed under [AGPL-3.0](#license).

---

## Setup

```bash
git clone https://github.com/knightscans014-ctrl/Forge-Fitness
cd Forge-Fitness
npm install
```

There is nothing to configure — no `.env`, no API keys, no backend project to
create. Clone and run.

```bash
npm run web      # fastest dev loop, runs in a browser
npm start        # Expo Go on a physical device
```

### Checks

```bash
npx tsc --noEmit
npx jest
```

---

## How it works

Your entire game state is one JSON object persisted to `AsyncStorage` through
`src/services/storage.ts`. That is the whole persistence layer.

All game rules live in `src/engine/` as plain functions over that state object.
The engine imports nothing from React or React Native, which is why it can be
unit-tested directly — see `src/engine/__tests__/`.

Every mutation goes through `mutate()` in `src/context/GameContext.ts`, which
runs the change, re-checks achievements and daily resets, fires any
level-up/rank-up celebration, and writes to disk. Adding a feature usually means
adding a function in `src/engine/` and calling it inside `mutate()`.

### Difficulty paths

`PREMIUM_TIERS` in `src/engine/content.ts` — Ranger, Elite, Monarch — is a
leftover name from when this was a paid app. They are now free difficulty paths
that only change XP and gold rates, switchable anytime from the Shop. The
constant keeps its old name because it is threaded through the engine and
renaming it is a wide, mechanical change nobody has needed yet.

### No anti-cheat

There is deliberately none. The save file is plain JSON on your own device and
you are welcome to edit it. There is no leaderboard to protect and no purchase
to defend, so integrity checks would only punish honest users on rooted phones.
The leaderboard screen shows fixed local benchmarks, not other players.

---

## Layout

```
src/engine/      game rules, pure TypeScript, no React — unit tested
src/services/    AsyncStorage persistence
src/screens/     UI
src/context/     the Zustand game store
src/components/  shared UI primitives
src/theme/       colors and icons
```

---

## Contributing

Issues and pull requests are welcome. Keep `npx tsc --noEmit` and `npx jest`
green, and prefer putting logic in `src/engine/` with a test over putting it in
a screen.

---

## License

GNU Affero General Public License v3.0. Use it, modify it, self-host it. If you
distribute a modified version or run one as a network service, you must publish
your source under the same license.

The name "FORGE" and the artwork in `assets/` are not covered by the AGPL — fork
the code, but ship it under your own name.
