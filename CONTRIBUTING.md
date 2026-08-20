# Contributing to FORGE

Thanks for taking a look. FORGE is a single-player, offline fitness RPG with no
backend, so there is nothing to provision — clone, `npm install`, and run.

## Getting set up

```bash
git clone https://github.com/knightscans014-ctrl/Forge-Fitness
cd Forge-Fitness
npm install
npm run web      # fastest loop; the whole app runs in a browser
```

`npm start` opens Expo Go on a physical device if you want to check touch
behaviour or real fonts.

## The checks that must pass

```bash
npx tsc --noEmit     # types, app + engine
npx jest             # ~250 tests
npx eslint . --ext .ts,.tsx
```

CI runs the first two on every push. ESLint currently reports warnings but zero
errors; please don't add new ones.

## Where code goes

```
src/engine/      game rules, pure TypeScript, no React — unit tested
src/services/    AsyncStorage persistence
src/screens/     UI
src/context/     the Zustand game store
src/components/  shared UI primitives
src/theme/       colors and icons
tools/           dev scripts, not shipped in the app
```

The engine is the important boundary. `src/engine/` imports nothing from React
or React Native, which is why it can be tested directly. **If a change is a game
rule, put it in the engine with a test** rather than inlining it in a screen.
Every mutation flows through `mutate()` in `src/context/GameContext.ts`, which
re-checks achievements and daily resets and then saves.

### Writing tests

Drive the public API. Tests that hand-construct a `GameState` and assert on it
have repeatedly passed while the real code path was broken — build state by
calling `ENGINE.logActivity`, `ENGINE.completeQuest`, and friends.

When you fix a bug, **watch the new test fail first.** Reintroduce the bug, run
the test, confirm red, then restore the fix. A regression test never seen red is
not evidence of anything.

Time-dependent tests run under a pinned timezone (`jest.globalSetup.js` sets
`TZ=America/New_York`). Setting `process.env.TZ` inside a test body does nothing.

### Quest content

Quest ids in `src/engine/content.ts` are permanent save keys. Completed quests
are stored by id, so **renaming or removing an id silently rewrites a player's
history.** Append new quests; don't edit existing ids.

## Icons

Icons come from two fonts — Ionicons (`family="ion"`, the default) and
MaterialCommunityIcons (`family="mci"`). Their name sets overlap but differ:
`home` and `flash` exist in both, `sword` and `chart-box` are MCI-only,
`list-circle` is Ionicons-only, and some plausible names like `coin` exist in
neither.

A name from the wrong family renders as a `?` box with no error. TypeScript
can't catch it, and the tests don't mount UI. `src/engine/__tests__/icons.test.ts`
guards this by checking every icon reference against the real glyph maps in
`node_modules/@expo/vector-icons/.../glyphmaps/`. If it fails, the name isn't in
the family you declared — look the name up rather than guessing.

## Regenerating the README screenshots

The images in `docs/img/` are captured from the real app, seeded with a
mid-game save so the screens show actual progression.

```bash
# 1. compile the engine for the save generator (gitignored output)
node_modules/.bin/tsc --project tsconfig.engine.json \
  --noEmit false --outDir tools/.engine-build --declaration false

# 2. serve the app
CI=1 npx expo start --web --port 8081 --clear

# 3. in another terminal
CHROME_PATH=/path/to/chrome node tools/shoot-readme.js
```

`tools/make-demo-save.js` builds the demo save by driving the real engine, so
the numbers on screen are internally consistent rather than mocked.

Two things to know:

- **`CI=1` disables Metro's watch mode.** After changing app code you must
  restart Expo or you will screenshot a stale bundle — this has produced
  confusing "the fix didn't work" results more than once.
- **Emoji need a system font.** Quest and boss icons are emoji; on a bare Linux
  box without `fonts-noto-color-emoji` they render as empty boxes in the
  screenshots even though real devices are fine.

## Pull requests

Keep changes focused, explain the behaviour change in the description, and note
anything you deliberately left out. Small PRs get reviewed faster.

## License

Contributions are accepted under the project's AGPL-3.0 license.
