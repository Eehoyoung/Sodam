/**
 * 소담 FE 환경설정 — 단일 진실 공급원.
 *
 * 런타임 분기:
 *  - Android 에뮬레이터:  10.0.2.2 (호스트 OS의 localhost)
 *  - iOS 시뮬레이터:      localhost / 127.0.0.1
 *  - 실기기(개발):        env 변수 또는 PC IP
 *  - 운영(release):       https://sodam-api.com
 *
 * 우선순위:
 *  1) Metro 환경변수 (`process.env.SODAM_API_BASE_URL`) — `.env` 또는 빌드시 주입
 *  2) Platform.OS + __DEV__ 자동 분기
 *  3) 운영 기본값
 */
import {Platform, NativeModules} from 'react-native';

type Env = 'dev' | 'staging' | 'prod';

const FORCE_ENV: Env | undefined =
    (process.env.SODAM_ENV as Env | undefined) ?? undefined;

/** Metro/빌드 시 주입 가능. .env.local → babel 변환으로 노출. */
const ENV_BASE_URL: string | undefined =
    (process.env.SODAM_API_BASE_URL as string | undefined) || undefined;

function detectDefaultBaseUrl(): string {
    // 포트는 application-dev.yml 의 server.port 와 일치 — 8080 충돌 회피로 7070 사용
    if (Platform.OS === 'android') {
        // Android 에뮬레이터에서 호스트 PC 의 localhost 는 10.0.2.2
        return 'http://10.0.2.2:7070';
    }
    if (Platform.OS === 'ios') {
        return 'http://localhost:7070';
    }
    // web fallback
    return 'http://localhost:7070';
}

function detectEnv(): Env {
    if (FORCE_ENV) return FORCE_ENV;
    // @ts-ignore RN global
    if (typeof __DEV__ !== 'undefined' && __DEV__) return 'dev';
    return 'prod';
}

const ENV: Env = detectEnv();

export const env = {
    /** 현재 환경 (dev/staging/prod) */
    name: ENV,

    /** API 베이스 URL */
    apiBaseUrl: ENV_BASE_URL
        ? ENV_BASE_URL
        : ENV === 'prod'
            ? 'https://sodam-api.com'
            : ENV === 'staging'
                ? 'https://dev-api.sodam.com'
                : detectDefaultBaseUrl(),

    /** 토스페이먼츠 클라이언트 키 (FE) — dev 는 토스 공개 테스트 키 */
    tossClientKey:
        (process.env.SODAM_TOSS_CLIENT_KEY as string | undefined) ||
        'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq',

    /** Sentry DSN (FE) */
    sentryDsn: (process.env.SODAM_SENTRY_DSN as string | undefined) || '',

    /** 채널톡 플러그인 키 */
    channelTalkKey: (process.env.SODAM_CHANNEL_TALK_KEY as string | undefined) || '',

    /** 카카오 네이티브 앱 키 (소셜 로그인 SDK) */
    kakaoNativeKey: (process.env.SODAM_KAKAO_NATIVE_KEY as string | undefined) || '',

    /** 카카오 OAuth redirect URI */
    kakaoRedirectUri:
        (process.env.SODAM_KAKAO_REDIRECT_URI as string | undefined) ||
        (Platform.OS === 'android'
            ? 'http://10.0.2.2:7070/kakao/auth/proc'
            : 'http://localhost:7070/kakao/auth/proc'),

    /** 디버그 모드 토글 */
    debug: __DEV__,

    /** 네트워크 타임아웃 (ms) */
    apiTimeout: 10_000,

    /** FE 버전 — package.json 과 별개로 빌드시 주입 권장 */
    appVersion: (NativeModules as any)?.PlatformConstants?.appVersion ?? '0.0.1',
} as const;

if (env.debug) {
    // 시크릿 마스킹
    const mask = (s: string) => (s ? `${s.slice(0, 6)}…(${s.length}b)` : '(empty)');
    console.log('[SODAM env]', {
        name: env.name,
        apiBaseUrl: env.apiBaseUrl,
        tossClientKey: mask(env.tossClientKey),
        sentryDsn: mask(env.sentryDsn),
    });
}

export default env;
