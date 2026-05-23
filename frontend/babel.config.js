module.exports = {
  presets: [
    [
      'module:@react-native/babel-preset',
      {
        // TypeScript 컴파일 최적화
        typescript: {
          allowNamespaces: true,
          allowDeclareFields: true,
        },
      },
    ],
  ],
  plugins: [
    // 프로덕션 환경에서만 콘솔 로그 제거
    ...(process.env.NODE_ENV === 'production'
      ? ['transform-remove-console']
      : []),
    // Reanimated Babel plugin must be listed last
      // 절대 수정 금지
    'react-native-worklets/plugin',
  ],
  env: {
    production: {
      plugins: [
        // 프로덕션 빌드에서 콘솔 로그 완전 제거
        ['transform-remove-console', {
          exclude: ['error', 'warn'] // error와 warn은 유지
        }],
      ],
    },
    test: {
      plugins: [
        // 테스트 전용 최적화
        ['@babel/plugin-transform-modules-commonjs'],
      ],
    },
  },
  // Jest 호환성을 위해 캐싱 최적화는 Metro에서만 적용
  // cacheDirectory: true,
  // compact: false,
};
