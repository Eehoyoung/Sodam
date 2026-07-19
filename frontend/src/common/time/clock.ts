/**
 * 테스트에서 교체 가능한 now() 경계 (WP-05).
 *
 * 화면 코드가 `new Date()`를 직접 호출하면 시간 의존 로직을 고정된 시각으로 테스트하기 어렵다.
 * 새 코드는 `systemClock.now()`를 쓰고, 테스트는 `{now: () => fixedDate}` 형태의 목 Clock을 주입한다.
 * 기존 `new Date()` 호출부를 일괄 치환하지는 않는다(계획서 WP-10에서 점진 치환).
 */
export interface Clock {
    now(): Date;
}

export const systemClock: Clock = {
    now: () => new Date(),
};
