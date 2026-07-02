import {useEffect, useRef} from 'react';
import {
    isFcmAvailable,
    registerDeviceToken,
    subscribeTokenRefresh,
    unregisterDeviceToken,
} from '../services/fcm';
import {notificationApi} from '../services/NotificationService';

/**
 * 인증 상태에 FCM 디바이스 토큰 등록/해제를 연결하는 훅.
 *
 *  - 로그인(isAuthenticated=true): 권한→토큰→서버 등록 + 토큰 refresh 구독
 *  - 로그아웃(false): 서버 등록 해제 + 구독 정리
 *
 * key-ready: FCM 모듈/키 부재 시 모든 경로가 no-op 이므로 크래시 없이 통과한다.
 * App.tsx 의 안정성 가드 철학에 맞춰, 호출부는 effect 내부에서 예외를 삼킨다.
 */
export function useFcmRegistration(isAuthenticated: boolean): void {
    // 토큰 refresh 구독 해제 함수 보관.
    const tokenRefreshUnsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!isFcmAvailable()) {
            return;
        }

        let cancelled = false;

        if (isAuthenticated) {
            // 권한·토큰·서버 등록 (내부에서 예외 처리됨, fire-and-forget)
            registerDeviceToken().catch(() => {});

            // 토큰 갱신 시 서버 재등록 — 중복 구독 방지
            if (!tokenRefreshUnsubRef.current) {
                tokenRefreshUnsubRef.current = subscribeTokenRefresh((token) => {
                    if (cancelled || !token) {
                        return;
                    }
                    notificationApi.register(token).catch(() => {
                        // 재시도는 다음 갱신/재로그인 시
                    });
                });
            }
        } else {
            // 로그아웃 — 구독 정리 후 서버 등록 해제
            tokenRefreshUnsubRef.current?.();
            tokenRefreshUnsubRef.current = null;
            unregisterDeviceToken().catch(() => {});
        }

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated]);

    // 언마운트 시 구독 정리
    useEffect(() => {
        return () => {
            tokenRefreshUnsubRef.current?.();
            tokenRefreshUnsubRef.current = null;
        };
    }, []);
}

export default useFcmRegistration;
