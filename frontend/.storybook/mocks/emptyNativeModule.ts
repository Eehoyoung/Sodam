/**
 * Storybook 전용 빈 모듈 — 웹(react-native-web) 번들에 대응 파일이 없는
 * 네이티브 전용 패키지(@react-native-firebase/* 등)를 이걸로 alias 한다.
 *
 * 실 코드(예: common/services/fcm.ts)는 이런 모듈을 항상
 * `try { require('@react-native-firebase/...') } catch {}` 로 optional-load 하고,
 * 반환값이 기대한 함수 모양이 아니면 자체적으로 no-op 폴백한다. 즉 이 목업이
 * 빈 객체를 내보내도 실제 화면 동작(런타임 분기)에는 영향이 없다 — 그냥
 * Vite/Rolldown이 그 네이티브 전용 하위 파일을 실제로 열어보려다 실패하는
 * "빌드 타임" 에러만 피하기 위한 용도다.
 */
export default {};
