/**
 * 애니메이션 활성 플래그.
 *
 * 예전에는 ENABLE_STACK_NAV / ENABLE_SCREENS_NATIVE / *_RECOVERY_STAGE / stageAtLeast() 로
 * 단계적 롤아웃을 제어했지만, 전부 영구 true(= 20단계 도달)로 굳은 지 오래라 조건식이
 * 언제나 같은 값을 냈다(P3-9). 실제로 남은 의미는 "애니메이션을 켠다" 하나뿐이다.
 */
export const ANIMATIONS_ENABLED = true;
