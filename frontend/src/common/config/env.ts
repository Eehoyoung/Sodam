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
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string env var means "unset"; must fall through to default, so ?? would be wrong
    (process.env.SODAM_API_BASE_URL) || undefined;

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
    if (FORCE_ENV) {return FORCE_ENV;}
    if (typeof __DEV__ !== 'undefined' && __DEV__) {return 'dev';}
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
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string env var means "unset"; must fall through to default, so ?? would be wrong
        (process.env.SODAM_TOSS_CLIENT_KEY) ||
        'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq',

    /** Sentry DSN (FE) */
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string env var means "unset"; must fall through to default, so ?? would be wrong
    sentryDsn: (process.env.SODAM_SENTRY_DSN) || '',

    /** 채널톡 플러그인 키 */
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string env var means "unset"; must fall through to default, so ?? would be wrong
    channelTalkKey: (process.env.SODAM_CHANNEL_TALK_KEY) || '',

    /** 카카오 네이티브 앱 키 (소셜 로그인 SDK) */
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string env var means "unset"; must fall through to default, so ?? would be wrong
    kakaoNativeKey: (process.env.SODAM_KAKAO_NATIVE_KEY) || '',

    /**
     * 카카오 OAuth redirect URI — 앱 전용 커스텀 스킴(sodam://)으로 통일.
     * BE HTTP 엔드포인트를 직접 가리키면 브라우저가 그 URL에 머물러 앱으로 돌아오지 못한다(구 버그) —
     * Kakao 인증 완료 시 OS 가 이 스킴을 앱으로 라우팅해야 KakaoLoginScreen 의 Linking 리스너가 code 를 받는다.
     * iOS Info.plist(CFBundleURLTypes)·Android AndroidManifest.xml(intent-filter) 양쪽에 동일 스킴 등록 필요.
     * Kakao Developers 콘솔의 등록 Redirect URI 도 이 값과 반드시 일치해야 한다(사람 설정).
     */
    kakaoRedirectUri:
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string env var means "unset"; must fall through to default, so ?? would be wrong
        (process.env.SODAM_KAKAO_REDIRECT_URI) || 'sodam://oauth/kakao',

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

/**
 * 토스 결제가 "실키 모드"인지 판별.
 *
 * - 빈 값 또는 토스 샌드박스 테스트 키(`test_*`)면 false → FE 는 결제 창을 띄우지 않고
 *   "유료 결제는 준비 중이에요" 안내만 한다 (키 주입 전 안전망).
 * - 운영용 클라이언트 키(`live_*` 등)가 주입되면 true → 실제 빌링 인증 창을 띄운다.
 */
export function isTossLive(): boolean {
    const key = env.tossClientKey?.trim() ?? '';
    if (key.length === 0) {
        return false;
    }
    return !key.startsWith('test_');
}

export default env;
