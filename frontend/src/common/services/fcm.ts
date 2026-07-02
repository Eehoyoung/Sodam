import {Platform} from 'react-native';
import {notificationApi} from './NotificationService';

/**
 * FCM (Firebase Cloud Messaging) "key-ready" 래퍼.
 *
 * 철학: Toss 결제·OCR 과 동일하게, 네이티브 모듈/키(google-services.json)가
 * 주입되면 즉시 작동하고, 없으면 graceful fallback 로 크래시 없이 동작한다.
 *
 * ⚠️ `@react-native-firebase/messaging` 를 static import 하면
 *   - tsc 모듈 해석 실패 (모듈이 아직 node_modules 에 없음)
 *   - jest 임포트 크래시
 * 가 발생하므로, 반드시 try/catch 내부 require() 로 lazy optional-load 한다.
 * (App.tsx / MainLayout 의 optional-require 패턴과 동일.)
 *
 * 키 주입 시 활성화 절차:
 *   1. android/app/google-services.json 배치 (시크릿 — 커밋 금지)
 *   2. (iOS) ios/GoogleService-Info.plist 배치 + `cd ios && pod install`
 *   3. `npm install` (package.json 에 @react-native-firebase/app·messaging 선언됨)
 *   4. android/iOS rebuild → 본 래퍼가 자동으로 실 SDK 경로로 전환된다.
 */

// optional-require 경계 — 네이티브 모듈 부재 시 타입을 알 수 없어 any 허용.
// RNFirebase v22+ 모듈러 API(getMessaging/getToken/...)를 사용한다. 네임스페이스
// API(messaging())는 deprecated 라 호출 시 콘솔 경고(→LogBox 배너)가 떠서 제거.
type FcmModule = any;

let _resolved = false;
let _mod: FcmModule = null;   // @react-native-firebase/messaging (모듈러 named exports 보유)
let _instance: any = null;    // getMessaging(getApp()) 결과 인스턴스

/**
 * `@react-native-firebase/messaging`·`/app` 을 1회 lazy-load 하고
 * 모듈러 메시징 인스턴스를 캐시한다. 모듈/네이티브 미배선이면 둘 다 null.
 */
function loadFcm(): {mod: FcmModule; instance: any} {
    if (_resolved) {
        return {mod: _mod, instance: _instance};
    }
    _resolved = true;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- optional native module, guarded require (FCM 키 주입 전에는 부재)
        const mod = require('@react-native-firebase/messaging');
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- optional native module
        const appMod = require('@react-native-firebase/app');
        if (typeof mod?.getMessaging === 'function' && typeof appMod?.getApp === 'function') {
            _mod = mod;
            _instance = mod.getMessaging(appMod.getApp());
        } else if (typeof mod?.default === 'function') {
            // 구버전 폴백: 네임스페이스 팩토리(경고 동반)
            _mod = mod;
            _instance = mod.default();
        }
    } catch (_e) {
        // 모듈/네이티브 미배선 — fallback (no-op) 경로로 동작
        _mod = null;
        _instance = null;
    }
    return {mod: _mod, instance: _instance};
}

/** FCM 네이티브 모듈이 사용 가능한지 여부. */
export function isFcmAvailable(): boolean {
    return loadFcm().instance !== null;
}

/**
 * 푸시 권한 요청.
 *  - iOS: messaging().requestPermission()
 *  - Android 13+(API 33): POST_NOTIFICATIONS 런타임 권한
 *  - Android <13: 권한 불필요 → true
 *  - 모듈 부재: false (크래시 금지)
 */
export async function requestPushPermission(): Promise<boolean> {
    const {mod, instance} = loadFcm();
    if (!mod || !instance) {
        return false;
    }

    try {
        if (Platform.OS === 'android') {
            // Android 13+ 만 런타임 알림 권한이 필요하다.
            if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
                // PermissionsAndroid 는 Android 전용 — split-platform-components 규칙을
                // 피하고 iOS 번들 영향을 없애기 위해 분기 내부에서 require 한다.
                // eslint-disable-next-line @typescript-eslint/no-var-requires -- platform-scoped require
                const {PermissionsAndroid} = require('react-native');
                const result = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                );
                return result === PermissionsAndroid.RESULTS.GRANTED;
            }
            return true;
        }

        // iOS: Firebase 권한 요청. authStatus 가 AUTHORIZED/PROVISIONAL 이면 허용.
        const authStatus = await mod.requestPermission(instance);
        const AUTHORIZED = 1;
        const PROVISIONAL = 2;
        return authStatus === AUTHORIZED || authStatus === PROVISIONAL;
    } catch (_e) {
        return false;
    }
}

/**
 * 현재 디바이스의 FCM 토큰. 모듈 부재/실패 시 null.
 */
export async function getFcmToken(): Promise<string | null> {
    const {mod, instance} = loadFcm();
    if (!mod || !instance) {
        return null;
    }
    try {
        const token = await mod.getToken(instance);
        return token || null;
    } catch (_e) {
        return null;
    }
}

/**
 * 권한 → 토큰 발급 → 서버 등록(notificationApi.register).
 * 토큰이 없으면 no-op (서버 호출 안 함).
 */
export async function registerDeviceToken(): Promise<void> {
    if (!isFcmAvailable()) {
        return;
    }
    const granted = await requestPushPermission();
    if (!granted) {
        return;
    }
    const token = await getFcmToken();
    if (!token) {
        return;
    }
    try {
        await notificationApi.register(token);
    } catch (_e) {
        // 네트워크/서버 오류 — 다음 토큰 refresh 또는 재로그인 시 재시도된다.
    }
}

/**
 * 현재 토큰으로 서버 등록 해제(notificationApi.unregister).
 * 토큰이 없으면 no-op.
 */
export async function unregisterDeviceToken(): Promise<void> {
    if (!isFcmAvailable()) {
        return;
    }
    const token = await getFcmToken();
    if (!token) {
        return;
    }
    try {
        await notificationApi.unregister(token);
    } catch (_e) {
        // 서버 오류 무시 — 토큰은 만료되거나 다음 등록 시 갱신된다.
    }
}

/** 구독 해제 함수 타입. */
export type Unsubscribe = () => void;

/**
 * 포그라운드 메시지 구독. 모듈 부재 시 no-op unsubscribe 반환.
 */
export function subscribeForegroundMessages(
    handler: (message: any) => void, // optional-require 경계 — RemoteMessage 타입 부재
): Unsubscribe {
    const {mod, instance} = loadFcm();
    if (!mod || !instance) {
        return () => {};
    }
    try {
        return mod.onMessage(instance, handler) as Unsubscribe;
    } catch (_e) {
        return () => {};
    }
}

/**
 * 토큰 갱신 구독. 갱신된 토큰을 서버에 재등록할 때 사용.
 * 모듈 부재 시 no-op unsubscribe 반환.
 */
export function subscribeTokenRefresh(
    handler: (token: string) => void,
): Unsubscribe {
    const {mod, instance} = loadFcm();
    if (!mod || !instance) {
        return () => {};
    }
    try {
        return mod.onTokenRefresh(instance, handler) as Unsubscribe;
    } catch (_e) {
        return () => {};
    }
}

export default {
    isFcmAvailable,
    requestPushPermission,
    getFcmToken,
    registerDeviceToken,
    unregisterDeviceToken,
    subscribeForegroundMessages,
    subscribeTokenRefresh,
};
