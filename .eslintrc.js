// ESLint for the FORGE codebase.
//
// The rule set is deliberately conservative: it targets the bug classes this
// project has actually shipped (unused/dead code, floating state, accidental
// shadowing) rather than style. Formatting rules are left off entirely so the
// linter never argues with a diff.
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: '18.2' } },
  env: { es2021: true, node: true },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    // React Native has no import React requirement under the new JSX runtime.
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    // The engine is typed; prop validation lives in TypeScript.
    'react/display-name': 'off',

    // Dead code is the recurring defect in this repo -- an unused local was
    // how the habit-stacking bug hid. Surface it, but allow _-prefixed
    // intentional discards.
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],

    // `any` is pragmatic in a few navigation and JSON-parsing spots.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-empty-function': 'off',

    // Real-bug rules.
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'no-implicit-coercion': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.expo/',
    'babel.config.js',
    'jest.config.js',
    'jest.globalSetup.js',
    '.eslintrc.js',
  ],
  overrides: [
    {
      // Tests legitimately poke at internals and fabricate partial state.
      files: ['src/engine/__tests__/**/*.ts'],
      env: { jest: true },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      // state.ts <-> loot.ts and levels.ts form genuine import cycles. Each
      // site below is a deliberate in-function `require()` that defers
      // resolution past module init; converting them to static imports
      // reintroduces the cycle and yields undefined at load time. The comments
      // at each call site explain the specific edge being broken.
      files: ['src/engine/*.ts', 'src/components/modals.tsx'],
      rules: { '@typescript-eslint/no-var-requires': 'off' },
    },
  ],
};
