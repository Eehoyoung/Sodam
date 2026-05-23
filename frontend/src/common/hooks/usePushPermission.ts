import {useEffect, useState} from 'react';
import {Platform} from 'react-native';

/**
 * 푸시 알림 권한 요청 훅 (PRD_GUEST 후속 onboarding).
 *
 * 동작:
 *  - iOS: requestPermissions
 *  - Android 13+: POST_NOTIFICATIONS 런타임 권한
 *  - 기타: 즉시 granted=true
 *
 * TODO[CONFIRM-C-2 후]: `@react-native-firebase/messaging` 도입 시
 *   `await messaging().requestPermission()` 으로 실제 권한 요청 + 토큰 발급.
 *   현재는 stub — granted 항상 true 로 진행, 토큰 등록은 NotificationService 가 처리.
 */
export type PushPermissionStatus = 'unknown' | 'granted' | 'denied' | 'requesting';

export interface UsePushPermissionResult {
    status: PushPermissionStatus;
    request: () => Promise<boolean>;
}

export function usePushPermission(autoRequest = false): UsePushPermissionResult {
    const [status, setStatus] = useState<PushPermissionStatus>('unknown');

    const request = async (): Promise<boolean> => {
        setStatus('requesting');
        try {
            // 실 SDK 도입 전 stub
            if (Platform.OS === 'ios') {
                // TODO: messaging().requestPermission()
                setStatus('granted');
                return true;
            }
            if (Platform.OS === 'android') {
                if (Platform.Version >= 33) {
                    // TODO: PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
                    setStatus('granted');
                    return true;
                }
                setStatus('granted');
                return true;
            }
            setStatus('granted');
            return true;
        } catch (_) {
            setStatus('denied');
            return false;
        }
    };

    useEffect(() => {
        if (autoRequest) request();
    }, [autoRequest]);

    return {status, request};
}

export default usePushPermission;
