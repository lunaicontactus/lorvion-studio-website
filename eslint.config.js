import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/legacy/**', 'assets/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: [
      'vite.config.ts',
      'eslint.config.js',
      'playwright.config.ts',
      'playwright.live.config.ts',
      'test/**/*.ts',
      'e2e/**/*.ts',
      'scripts/**/*.mjs',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
)
