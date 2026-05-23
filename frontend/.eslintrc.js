module.exports = {
  root: true,
  extends: [
    '@react-native',
    'eslint:recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-native'],
  rules: {
    // React 관련 규칙
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-key': 'error',

    // React Native 관련 규칙
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',

    // 일반 규칙
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
  },
  env: {
    'react-native/react-native': true,
  },
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      excludedFiles: ['**/*.test.{ts,tsx}', '**/__tests__/**/*'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        // TypeScript specific rules are kept here
        '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      },
    },
    {
      files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*', '**/*.test.js', '**/*.spec.{js,ts,tsx}', 'tests/**/*'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        // Test specific rules - allow console and any for testing purposes
        'no-console': 'off',
        '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
