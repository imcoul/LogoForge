import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * ESLint baseline for Forgel.
 *
 * Scope note: this codebase had no linter before Phase 0, so a maximal ruleset would
 * report thousands of pre-existing violations and be ignored. This config deliberately
 * enables the rules that catch REAL DEFECTS (bad hook dependencies, unreachable code,
 * accidental globals, misuse of promises) and leaves pure style to the formatter.
 *
 * Ratchet policy: tighten this over time — never loosen it to make a new change pass.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'e2e-tests/**',
      '*.config.js',
      '*.config.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // --- Real-defect rules (errors) ---
      'react-hooks/rules-of-hooks': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-self-compare': 'error',
      'no-unsafe-negation': 'error',
      'no-constant-binary-expression': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // --- Signal rules (warnings while the debt is paid down) ---
      // Exhaustive-deps is a warning because the editors have many known-stale
      // dependency arrays; Phase 1 rewrites those components.
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // --- Deliberately disabled ---
      // The codebase uses `any` extensively at API and store boundaries. Turning this on
      // today would produce noise, not fixes; it is a Phase 1/2 cleanup target.
      '@typescript-eslint/no-explicit-any': 'off',
      // Non-null assertions are used in guarded contexts throughout the store.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Empty catch blocks are used intentionally for optional browser APIs.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Plain Node scripts (build/CI helpers) run outside the browser.
  {
    files: ['scripts/**/*.js', 'scripts/**/*.cjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Tests may use loose typing and test globals.
  {
    files: ['**/*.test.{ts,tsx}', 'src/tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
