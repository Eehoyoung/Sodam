/**
 * fcm.ts — key-ready 래퍼 검증.
 * jest.setup.js 가 @react-native-firebase/messaging 를 virtual mock 으로 등록하므로
 * (패키지 미설치 상태에서도) "모듈 주입됨" 경로를 검증할 수 있다.
 */
import {Platform} from 'react-native';
import {
    isFcmAvailable,
    getFcmToken,
    requestPushPermission,
    registerDeviceToken,
    subscribeForegroundMessages,
    subscribeTokenRefresh,
} from '../../../src/common/services/fcm';
import {notificationApi} from '../../../src/common/services/NotificationService';

jest.mock('../../../src/common/services/NotificationService', () => ({
    notificationApi: {
        register: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve()),
    },
}));

describe('fcm key-ready 래퍼', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Platform as any).OS = 'ios';
    });

    it('모듈 주입 시 isFcmAvailable=true', () => {
        expect(isFcmAvailable()).toBe(true);
    });

    it('getFcmToken 은 mock 토큰을 반환', async () => {
        await expect(getFcmToken()).resolves.toBe('test-fcm-token');
    });

    it('iOS 권한 요청은 granted', async () => {
        await expect(requestPushPermission()).resolves.toBe(true);
    });

    it('registerDeviceToken 은 토큰을 서버에 등록', async () => {
        await registerDeviceToken();
        expect(notificationApi.register).toHaveBeenCalledWith('test-fcm-token');
    });

    it('foreground/token-refresh 구독은 unsubscribe 함수를 반환', () => {
        expect(typeof subscribeForegroundMessages(() => {})).toBe('function');
        expect(typeof subscribeTokenRefresh(() => {})).toBe('function');
    });
});
