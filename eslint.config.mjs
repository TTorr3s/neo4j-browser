import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import promise from 'eslint-plugin-promise'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  // Ignore patterns (migrated from .eslintignore)
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      'mvn/**',
      'cypress/**',
      'yarn-cache/**',
      'coverage/**',
      '*.min.js',
      'build_scripts/**',
      'scripts/**',
      'auth_server/**',
      'docs/server.js',
      '*.config.js',
      '*.config.mjs'
    ]
  },

  // Base JavaScript config
  js.configs.recommended,

  // TypeScript config for .ts and .tsx files
  ...tseslint.configs.recommended,

  // React plugin config
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      promise
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        neo: true,
        FileReader: true,
        Blob: true,
        fetch: true
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      // Base rules
      'no-case-declarations': 'off',
      'no-prototype-builtins': 'off',
      'prefer-const': 'warn',
      'no-async-promise-executor': 'off',
      'no-empty': 'warn',
      'no-sparse-arrays': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-useless-escape': 'warn',
      'no-control-regex': 'warn',
      'no-loss-of-precision': 'warn',
      'no-constant-binary-expression': 'warn',

      // React rules
      ...react.configs.recommended.rules,
      'react/jsx-handler-names': 'off',
      'react/jsx-fragments': 'off',
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'react/jsx-indent': 'off',
      'react/no-deprecated': 'warn',
      'react/display-name': 'warn',
      'react/no-unescaped-entities': 'off',
      'react/react-in-jsx-scope': 'off',

      // Import rules
      'import/no-webpack-loader-syntax': 'off',

      // Restricted imports
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '*/neo4j-arc/*',
            'neo4j-arc/common/*',
            'neo4j-arc/graph-visualization/*',
            'neo4j-arc/cypher-language-support/*',
            '^monaco-editor$'
          ]
        }
      ]
    }
  },

  // TypeScript specific rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      // React hooks rules
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'warn',

      // TypeScript rules
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unnecessary-type-constraint': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-expressions': [
        'warn',
        { allowShortCircuit: true, allowTernary: true }
      ],

      // General rules
      'no-var': 'warn',
      'prefer-rest-params': 'warn',
      'prefer-spread': 'warn',

      // React rules for TypeScript
      'react/no-unescaped-entities': 'warn',
      'react/no-unknown-property': 'warn',
      'react/prop-types': 'error'
    }
  },

  // neo4j-arc specific config - stricter import rules
  {
    files: ['src/neo4j-arc/**/*.ts', 'src/neo4j-arc/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['redux', 'react-redux', 'react-suber'],
          patterns: ['browser/*', 'shared/*', 'services/*']
        }
      ]
    }
  },

  // Prettier config (must be last to override other formatting rules)
  prettier
)
