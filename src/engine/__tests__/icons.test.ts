// Every icon name must exist in the font family it is declared against.
//
// A mismatch is invisible to TypeScript -- @expo/vector-icons takes a string,
// and the app casts it to `any` -- so a wrong family silently renders a
// tofu box at runtime. Twenty icons across the tab bar, the class picker and
// the activity list shipped broken this way; the bug was only caught by
// looking at a screenshot.
//
// This test lives with the engine tests purely because that is where the jest
// project is rooted; it exercises the theme layer, not the engine.
import ionGlyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import mciGlyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { TAB_ICONS, ICONS } from '../../theme/iconNames';

const GLYPHS: Record<string, Record<string, number>> = {
  ion: ionGlyphs as Record<string, number>,
  mci: mciGlyphs as Record<string, number>,
};

// `family` is optional throughout the icon tables and defaults to Ionicons,
// which is exactly the trap: an MCI-only name with no family looks fine.
function exists(name: string, family: 'ion' | 'mci' = 'ion'): boolean {
  return name in GLYPHS[family];
}

describe('icon tables resolve to real glyphs', () => {
  const tabCases = Object.entries(TAB_ICONS).flatMap(([tab, def]) => [
    [`${tab} (active)`, def.active, def.family] as const,
    [`${tab} (inactive)`, def.inactive, def.family] as const,
  ]);

  test.each(tabCases)('TAB_ICONS %s', (_label, name, family) => {
    expect({ name, family: family ?? 'ion', found: exists(name, family) })
      .toEqual({ name, family: family ?? 'ion', found: true });
  });

  const iconCases = Object.entries(ICONS).map(
    ([key, def]) => [key, def.name, def.family] as const
  );

  test.each(iconCases)('ICONS.%s', (_key, name, family) => {
    expect({ name, family: family ?? 'ion', found: exists(name, family) })
      .toEqual({ name, family: family ?? 'ion', found: true });
  });

  // Guards the guard: if the glyph maps ever move or fail to import, every
  // lookup above would return false and the suite would look meaningful while
  // testing nothing.
  it('loaded both glyph maps', () => {
    expect(Object.keys(ionGlyphs).length).toBeGreaterThan(500);
    expect(Object.keys(mciGlyphs).length).toBeGreaterThan(1000);
  });

  // Separate failure mode from a wrong family: a tab whose route name has no
  // TAB_ICONS entry at all falls through to the fallback glyph. That is how the
  // Quests tab shipped as a '?' -- the table was keyed 'Missions' (the screen
  // component's name) while the route was named 'Quests'. Read the route names
  // out of App.tsx rather than duplicating them here, so the check tracks the
  // real navigator.
  it('every tab route in App.tsx has a TAB_ICONS entry', () => {
    const app = readFileSync(join(__dirname, '../../../App.tsx'), 'utf8');
    const tabsBlock = app.match(/const TABS = \[([\s\S]*?)\];/);
    expect(tabsBlock).not.toBeNull();

    const routes = [...tabsBlock![1].matchAll(/name:\s*'([^']+)'/g)].map(m => m[1]);
    expect(routes.length).toBeGreaterThan(1); // guard against a regex that matched nothing

    expect(routes.filter(r => !(r in TAB_ICONS))).toEqual([]);
  });

  // Third failure mode: literal icon names written straight into JSX, which
  // bypass the tables entirely. These come in two shapes -- <Icon name="x"
  // family="mci" /> and wrapper props like <ScreenHeader icon="sword"
  // iconFamily="mci" />. The Battle/Trials/Progress/Shop headers all shipped
  // broken because ScreenHeader forwarded no family at all, so every header
  // icon silently resolved against Ionicons.
  it('literal icon names in JSX resolve against their declared family', () => {
    const srcDir = join(__dirname, '../../');
    const files: string[] = [];
    (function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.tsx')) files.push(full);
      }
    })(srcDir);
    expect(files.length).toBeGreaterThan(5);

    const bad: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      // Each JSX tag, so a name and its family stay associated.
      for (const tag of text.match(/<[A-Z][A-Za-z]*[^>]*?\/?>/gs) || []) {
        const pairs: Array<[string, string]> = [];
        const nameAttr = tag.match(/\bname="([a-z0-9-]+)"/);
        if (nameAttr) {
          const fam = tag.match(/\bfamily=\{?"(ion|mci)"\}?/);
          pairs.push([nameAttr[1], fam ? fam[1] : 'ion']);
        }
        const iconAttr = tag.match(/\bicon="([a-z0-9-]+)"/);
        if (iconAttr) {
          const fam = tag.match(/\biconFamily=\{?"(ion|mci)"\}?/);
          pairs.push([iconAttr[1], fam ? fam[1] : 'ion']);
        }
        for (const [name, fam] of pairs) {
          // Skip dynamic/derived values and non-icon `name` props.
          if (!(name in GLYPHS.ion) && !(name in GLYPHS.mci)) continue;
          if (!exists(name, fam as 'ion' | 'mci')) {
            bad.push(`${file.replace(srcDir, 'src/')}: "${name}" is not in ${fam}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('rejects a name from the wrong family', () => {
    // 'sword' is MaterialCommunityIcons-only; 'list-circle' is Ionicons-only.
    // Both of these were real mismatches in the shipped tables.
    expect(exists('sword', 'ion')).toBe(false);
    expect(exists('sword', 'mci')).toBe(true);
    expect(exists('list-circle', 'mci')).toBe(false);
    expect(exists('list-circle', 'ion')).toBe(true);
  });
});
