# 서비스 시연 중 코드 수정 내역

## 2026-07-18: Android APK 빌드 점검

- 증상: `frontend/android`에서 `assembleDebug` 실행 시 React Native 버전 카탈로그를 읽지 못해 빌드가 중단됨.
- 원인: `npm ci`와 Gradle 빌드를 동시에 실행해 `node_modules`가 교체되는 중 Gradle이 카탈로그 파일을 읽음.
- 조치: 경로를 변경하지 않고 기존 `node_modules/react-native/gradle/libs.versions.toml` 참조를 유지했다. npm 설치가 완료된 뒤 Gradle 빌드를 단독 실행한다.
- 검증 결과: npm 설치 완료 후 단독 `./gradlew.bat assembleDebug`를 다시 실행했으나 10분 제한 내 출력·완료가 없어 최신 APK 재생성은 확인하지 못했다. 기존 debug APK를 사용한 런타임 시연은 별도로 진행한다.
