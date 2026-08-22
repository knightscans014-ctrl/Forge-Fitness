import { THEMES, THEME_LIST, getTheme, getThemeColors, getThemeRankAura, setActiveThemeId, getActiveThemeId, ThemeId } from '../../theme/themes';
import { colors, rankAura, shadows } from '../../theme/colors';
import { RANKS } from '../levels';
import { defaultState, normalize } from '../state';

describe('UI Themes System', () => {
  const EXPECTED_THEMES: ThemeId[] = ['solo', 'berserker', 'cyberpunk', 'paladin'];

  test('contains exactly 4 distinct gamified themes', () => {
    expect(THEME_LIST.length).toBe(4);
    EXPECTED_THEMES.forEach(id => {
      expect(THEMES[id]).toBeDefined();
      expect(THEMES[id].id).toBe(id);
    });
  });

  test('each theme has distinct identity metadata and vibrant visual config', () => {
    EXPECTED_THEMES.forEach(id => {
      const t = THEMES[id];
      expect(t.name).toBeTruthy();
      expect(t.subtitle).toBeTruthy();
      expect(t.badge).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.quote).toBeTruthy();
      expect(t.desc).toBeTruthy();
      expect(t.preview).toBeDefined();
      expect(t.preview.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.preview.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  test('each theme defines all required color tokens', () => {
    const requiredColorKeys = [
      'bg', 'bg2', 'bg3', 'card', 'card2', 'card3', 'glass',
      'ink', 'ink2', 'mut', 'mut2', 'mut3',
      'gold', 'goldDim', 'xpa', 'xpaDim', 'hp', 'hpDim', 'en', 'enDim', 'mana', 'manaDim',
      'str', 'vig', 'vit', 'flx', 'foc',
      'accent', 'accent2', 'success', 'warning', 'danger',
      'sys', 'sysDim', 'sysDeep', 'sysGlow', 'sysFaint', 'violet', 'violetGlow', 'crimson',
      'line', 'line2', 'glow', 'common', 'rare', 'epic', 'legendary', 'mythic',
    ];

    EXPECTED_THEMES.forEach(id => {
      const themeColors = THEMES[id].colors;
      requiredColorKeys.forEach(key => {
        expect((themeColors as unknown as Record<string, string>)[key]).toBeDefined();
      });
      expect(Array.isArray(themeColors.gradientGold)).toBe(true);
      expect(Array.isArray(themeColors.gradientXP)).toBe(true);
      expect(Array.isArray(themeColors.gradientSys)).toBe(true);
    });
  });

  test('each theme provides an aura color for every rank in the rank ladder', () => {
    EXPECTED_THEMES.forEach(id => {
      const auras = THEMES[id].rankAura;
      expect(auras).toBeDefined();
      RANKS.forEach(rk => {
        expect(auras[rk.id]).toBeDefined();
        expect(auras[rk.id].length).toBeGreaterThan(0);
      });
      // Also check unranked/F rank
      expect(auras['F']).toBeDefined();
      expect(auras['NATIONAL']).toBeDefined();
      expect(auras['MONARCH']).toBeDefined();
    });
  });

  test('getTheme, getThemeColors, getThemeRankAura gracefully handle missing or invalid theme IDs', () => {
    expect(getTheme('unknown_theme' as any).id).toBe('solo');
    expect(getTheme(null).id).toBe('solo');
    expect(getThemeColors('unknown_theme' as any).sys).toBe(THEMES.solo.colors.sys);
    expect(getThemeRankAura('unknown_theme' as any)['A']).toBe(THEMES.solo.rankAura['A']);
  });

  test('active theme switching and dynamic proxy resolution work', () => {
    setActiveThemeId('berserker');
    expect(getActiveThemeId()).toBe('berserker');
    expect(colors.sys).toBe(THEMES.berserker.colors.sys);
    expect(rankAura['S']).toBe(THEMES.berserker.rankAura['S']);
    expect(shadows.sysGlow.shadowColor).toBe(THEMES.berserker.colors.sys);

    setActiveThemeId('cyberpunk');
    expect(getActiveThemeId()).toBe('cyberpunk');
    expect(colors.sys).toBe(THEMES.cyberpunk.colors.sys);
    expect(rankAura['D']).toBe(THEMES.cyberpunk.rankAura['D']);

    setActiveThemeId('paladin');
    expect(getActiveThemeId()).toBe('paladin');
    expect(colors.sys).toBe(THEMES.paladin.colors.sys);
    expect(rankAura['A']).toBe(THEMES.paladin.rankAura['A']);

    // Reset back to solo
    setActiveThemeId('solo');
    expect(getActiveThemeId()).toBe('solo');
    expect(colors.sys).toBe(THEMES.solo.colors.sys);
  });

  test('GameState handles theme in defaultState and normalize', () => {
    const s = defaultState('Jinwoo', 'warrior');
    expect(s.theme).toBe('solo');

    s.theme = 'berserker';
    const norm = normalize(s);
    expect(norm.theme).toBe('berserker');

    // Invalid theme falls back to 'solo'
    (s as any).theme = 'invalid_theme';
    const norm2 = normalize(s);
    expect(norm2.theme).toBe('solo');
  });
});
