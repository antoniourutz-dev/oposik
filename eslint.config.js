import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * ESLint flat config (ESLint 9 + typescript-eslint + React + React Hooks + Prettier).
 * Alcance: TypeScript/TSX del frontend y `vite.config.ts`. `supabase/` ignorado (Deno/CLI).
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'node_modules/**',
      'coverage/**',
      'supabase/**',
      '.claude/**',
      'package-lock.json',
      // Script Node suelto: sin tipos/globals aqui; lint opcional mas adelante
      'scripts/**',
    ],
  },
  {
    settings: {
      react: {
        version: '19.2',
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      // Reglas nuevas (React 19 / compiler): demasiado estrictas para el codigo actual; revisar mas adelante
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      // JSX con comillas en castellano: warning hasta limpiar copy
      'react/no-unescaped-entities': 'warn',
      // Proyecto con TypeScript: no exigir propTypes en runtime
      'react/prop-types': 'off',
      // Incremental: no bloquear el equipo al inicio
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  eslintConfigPrettier,
);
