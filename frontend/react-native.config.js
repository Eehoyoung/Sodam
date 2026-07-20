
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
  // @invertase/react-native-apple-authentication 은 iOS 전용 기능(Sign in with Apple)이라
  // Android 노출이 없다(LoginScreen.tsx의 Platform.OS==='ios' 분기, c2977e6). 그런데 이 라이브러리의
  // autolinking.json android 항목이 codegen(cmakeListsPath)을 기대해 :app:compileDebugJavaWithJavac가
  // "package com.RNAppleAuthentication does not exist"로 실패했다(PackageList.java는 참조를 생성하지만
  // settings.gradle 프로젝트 포함은 되지 않는 불일치). Android autolinking에서 제외해 해결한다.
  dependencies: {
    '@invertase/react-native-apple-authentication': {
      platforms: {
        android: null,
      },
    },
  },
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
