
// React Native CLI configuration for autolinking (updated to refresh cache)
module.exports = {
  project: {
    android: {
      sourceDir: './android',
      appName: 'app',
      manifestPath: './android/app/src/main/AndroidManifest.xml',
      packageName: 'com.sodam_front_end',
    },
    // iOS 설정은 React Native 0.81.0에서 자동 감지됨
    // ios: {
    //   sourceDir: './ios',
    //   xcodeProjectPath: './ios/SodamFrontEnd.xcodeproj',
    // },
  },
  // 의존성 수동 설정 (필요시)
  dependencies: {},
  assets: [
    './src/assets/fonts/',
    './src/assets/images/',
  ],
  // 개발 전용 설정
  commands: [
    {
      name: 'clean-cache',
      description: 'Clean Metro and Gradle cache',
      func: () => {
        console.log('Cleaning caches...');
      },
    },
  ],
};
