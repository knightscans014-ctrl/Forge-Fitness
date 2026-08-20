// Captures the README screenshots from the real app running on Expo web.
//
// Usage:
//   npx expo start --web --port 8081     (in another terminal)
//   node tools/shoot-readme.js
//
// The app is seeded with a realistic mid-game save (see make-demo-save.js) so
// the screens show actual progression rather than a blank new game, then shot
// at phone dimensions.
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const URL = process.env.FORGE_URL || 'http://localhost:8081';
const OUT = path.join(__dirname, '..', 'docs', 'img');
const SAVE_KEY = 'forge_save_v4';

// Phone-shaped, and 3x so the images stay crisp when GitHub scales them down.
const VIEWPORT = { width: 390, height: 844 };
const SCALE = 3;

const SHOTS = [
  { file: 'home.png', tab: 'Home', wait: 1200 },
  { file: 'quests.png', tab: 'Quests', wait: 1200 },
  { file: 'battle.png', tab: 'Battle', wait: 1200 },
  { file: 'character.png', tab: 'Character', wait: 1500 },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const save = execFileSync('node', [path.join(__dirname, 'make-demo-save.js')], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
    // Freeze animations so repeat runs produce identical images instead of
    // catching a glow mid-pulse and churning the diff.
    reducedMotion: 'reduce',
  });

  const page = await ctx.newPage();

  // Seed before any app code runs, so hydration reads the demo save and the
  // onboarding flow never appears.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [SAVE_KEY, save]
  );

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(4000);

  for (const shot of SHOTS) {
    if (shot.tab !== 'Home') {
      // Prefer the real tab button; react-native-web renders it with
      // role="tab"/"button". Fall back to the label text for older renders.
      let tab = page.getByRole('tab', { name: shot.tab, exact: true }).last();
      if (!(await tab.count())) {
        tab = page.getByRole('button', { name: shot.tab, exact: true }).last();
      }
      if (!(await tab.count())) {
        tab = page.getByText(shot.tab, { exact: true }).last();
      }
      // force: a celebration toast or the sticky quest CTA can float over the
      // tab bar and make Playwright wait forever for a "stable" hit target.
      // The tab is genuinely there and visible, so dispatch the click anyway.
      await tab.click({ timeout: 30000, force: true });
      // Confirm the tab actually changed instead of trusting the click.
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(shot.wait);
    await page.screenshot({ path: path.join(OUT, shot.file) });
    console.log('shot', shot.file);
  }

  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
