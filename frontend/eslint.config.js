import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Ban "as unknown as Type" double assertions - these bypass type safety
      'no-restricted-syntax': [
        'error',
        {
          // Match: expr as unknown as Type (nested TSAsExpression where inner is TSUnknownKeyword)
          selector: 'TSAsExpression > TSAsExpression > TSUnknownKeyword',
          message: 'Avoid "as unknown as Type" double assertions. Use proper type guards, generics, or fix the underlying type issue instead.',
        },
      ],
    },
  },
)
