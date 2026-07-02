import api from '../utils/api';
import {Platform} from 'react-native';

export type DevicePlatform = 'ANDROID' | 'IOS' | 'WEB';

/**
 * FCM 디바이스 토큰 등록/해제 API 래퍼.
 * 실제 FCM SDK 호출은 별도 (react-native-firebase 도입 후 ./fcm.ts 추가).
 *
 * 사용:
 *   const token = await getFcmToken();      // SDK
 *   await notificationApi.register(token);  // 서버 등록
 */
export const notificationApi = {
    async register(token: string, platform?: DevicePlatform): Promise<void> {
        const resolved =
            platform ??
            (Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB');
        await api.post('/api/notifications/token', {token, platform: resolved});
    },

    async unregister(token: string): Promise<void> {
        await api.delete(`/api/notifications/token?token=${encodeURIComponent(token)}`);
    },
};

export default notificationApi;
