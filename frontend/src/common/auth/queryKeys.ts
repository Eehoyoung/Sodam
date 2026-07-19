/**
 * 인증 세션 쿼리 키 (WP-05 2단계).
 *
 * auth는 `AppNavigator`·`useOfflineSync` 등 common 계층도 함께 참조하는 핵심 세션 상태라
 * feature(`features/auth`) 대신 common/auth에 둔다 — sessionCoordinator를 common/auth에 둔
 * 배치 원칙(Phase E)과 동일하다. 다른 도메인(attendance/salary/store/recruitment)의 쿼리 키는
 * 각 feature hook 파일이 직접 소유한다.
 */
export const authQueryKeys = {
    all: ['auth'] as const,
    currentUser: () => [...authQueryKeys.all, 'currentUser'] as const,
    profile: (userId: string) => [...authQueryKeys.all, 'profile', userId] as const,
};
