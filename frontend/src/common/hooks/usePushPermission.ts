import {useEffect, useState} from 'react';
import {requestPushPermission} from '../services/fcm';

/**
 * 푸시 알림 권한 요청 훅 (PRD_GUEST 후속 onboarding).
 *
 * 동작 (fcm.requestPushPermission 위임):
 *  - iOS: messaging().requestPermission()
 *  - Android 13+: POST_NOTIFICATIONS 런타임 권한
 *  - Android <13: 권한 불필요 → granted
 *  - FCM 네이티브 모듈/키 부재: denied (크래시 없이 자연스럽게 처리)
 *
 * key-ready: google-services.json·@react-native-firebase/messaging 주입 시
 *   별도 코드 변경 없이 실제 권한 요청으로 전환된다.
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
            const granted = await requestPushPermission();
            setStatus(granted ? 'granted' : 'denied');
            return granted;
        } catch (_) {
            setStatus('denied');
            return false;
        }
    };

    useEffect(() => {
        if (autoRequest) {request();}
    }, [autoRequest]);

    return {status, request};
}

export default usePushPermission;
