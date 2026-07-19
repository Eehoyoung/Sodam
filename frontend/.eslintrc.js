module.exports = {
  root: true,
  extends: ['@react-native', 'eslint:recommended', 'prettier', 'plugin:storybook/recommended'],
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
    // WP-10 — 계층 경계 고정. screens는 common/api를 직접 import하지 않고 feature의
    // services/를 거쳐야 한다(frontend.md 기존 규칙을 lint로 강제). common은 feature를
    // 참조하지 않는다(WP-05/WP-10) — sessionCoordinator.ts(Phase E, authService 위임 —
    // client.ts와의 순환 참조를 피하려 함수 바디 안에서만 참조)와 RoleTabBar.tsx(기존부터
    // storeService에 의존하던 pre-existing 예외, 이번 작업 범위 밖)는 문서화된 예외로 제외한다.
    {
      files: ['src/features/**/screens/**/*.{ts,tsx}', 'src/features/**/*Screen.tsx'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [{
            group: ['**/common/api', '**/common/api/*', '**/common/utils/api'],
            message: 'screens는 common/api를 직접 import할 수 없습니다 — feature의 services/ 레이어를 거칠 것(frontend.md).',
          }],
        }],
      },
    },
    {
      files: ['src/common/**/*.{ts,tsx}'],
      excludedFiles: [
        'src/common/auth/sessionCoordinator.ts',
        'src/common/components/navigation/RoleTabBar.tsx',
        '**/__tests__/**',
      ],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [{
            group: ['**/features/**'],
            message: 'common 계층은 feature를 참조하지 않습니다(WP-05/WP-10). 불가피한 예외는 이 설정 파일에 이유와 함께 문서화할 것.',
          }],
        }],
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
