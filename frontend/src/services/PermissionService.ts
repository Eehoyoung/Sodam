import {Alert, Platform} from 'react-native';
import {
    check,
    checkMultiple,
    openSettings,
    Permission,
    PERMISSIONS,
    PermissionStatus,
    request,
    requestMultiple,
    RESULTS
} from 'react-native-permissions';
import {safeLogger} from '../utils/safeLogger';

/**
 * 권한 타입 정의
 */
export type PermissionType =
    | 'location'
    | 'microphone'
    | 'storage'
    | 'notification'
    | 'nfc';

/**
 * 권한 요청 결과
 */
export interface PermissionResult {
    granted: boolean;
    status: PermissionStatus;
    canAskAgain: boolean;
    message?: string;
}

/**
 * 다중 권한 요청 결과
 */
export interface MultiplePermissionResult {
    allGranted: boolean;
    results: Record<PermissionType, PermissionResult>;
    deniedPermissions: PermissionType[];
    blockedPermissions: PermissionType[];
}

/**
 * 권한 설정 정보
 */
interface PermissionConfig {
    android: Permission;
    ios: Permission;
    title: string;
    description: string;
    rationale: string;
}

/**
 * 플랫폼별 권한 매핑
 */
const PERMISSION_MAP: Record<PermissionType, PermissionConfig> = {
    location: {
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        title: '위치 권한',
        description: '출퇴근 위치 확인을 위해 위치 권한이 필요합니다.',
        rationale: '정확한 출퇴근 관리를 위해 현재 위치를 확인해야 합니다. 위치 정보는 출퇴근 기록에만 사용됩니다.',
    },
    microphone: {
        android: PERMISSIONS.ANDROID.RECORD_AUDIO,
        ios: PERMISSIONS.IOS.MICROPHONE,
        title: '마이크 권한',
        description: '음성 기능 사용을 위해 마이크 권한이 필요합니다.',
        rationale: '음성 명령 및 녹음 기능을 위해 마이크 접근이 필요합니다.',
    },
    storage: {
        android: PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
        title: '저장소 권한',
        description: '파일 저장을 위해 저장소 권한이 필요합니다.',
        rationale: '급여명세서 및 출퇴근 기록 저장을 위해 저장소 접근이 필요합니다.',
    },
    notification: {
        android: PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE, // Fallback for notification permission
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY, // iOS에서는 알림 권한을 다른 방식으로 처리
        title: '알림 권한',
        description: '중요한 알림을 받기 위해 알림 권한이 필요합니다.',
        rationale: '출퇴근 알림, 급여 정보 등 중요한 정보를 놓치지 않도록 알림을 보내드립니다.',
    },
    nfc: {
        android: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE, // TODO: NFC permission not available, using placeholder
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY, // iOS NFC fallback using available permission
        title: 'NFC 권한',
        description: 'NFC 태그를 통한 출퇴근을 위해 NFC 권한이 필요합니다.',
        rationale: 'NFC 태그를 사용한 간편한 출퇴근 등록을 위해 NFC 접근이 필요합니다.',
    },
};

/**
 * 권한 관리 서비스
 */
export class PermissionService {
    /**
     * 권한 상태 확인
     */
    static async checkPermission(type: PermissionType): Promise<PermissionResult> {
        try {
            const permission = this.getPermissionForPlatform(type);
            const status = await check(permission);

            console.log(`[DEBUG_LOG] 권한 확인 - ${type}:`, status);

            return {
                granted: status === RESULTS.GRANTED,
                status,
                canAskAgain: status !== RESULTS.BLOCKED,
            };
        } catch (error) {
            console.error(`[DEBUG_LOG] 권한 확인 실패 - ${type}:`, error);
            safeLogger.error(`Permission check failed for ${type}`, error);

            return {
                granted: false,
                status: RESULTS.UNAVAILABLE,
                canAskAgain: false,
                message: '권한 확인 중 오류가 발생했습니다.',
            };
        }
    }

    /**
     * 다중 권한 상태 확인
     */
    static async checkMultiplePermissions(types: PermissionType[]): Promise<MultiplePermissionResult> {
        try {
            const permissions = types.reduce((acc, type) => {
                acc[type] = this.getPermissionForPlatform(type);
                return acc;
            }, {} as Record<PermissionType, Permission>);

            const statuses = await checkMultiple(Object.values(permissions));

            const results = {} as Record<PermissionType, PermissionResult>;
            const deniedPermissions: PermissionType[] = [];
            const blockedPermissions: PermissionType[] = [];

            let allGranted = true;

            for (const type of types) {
                const permission = permissions[type];
                const status = statuses[permission];

                const result: PermissionResult = {
                    granted: status === RESULTS.GRANTED,
                    status,
                    canAskAgain: status !== RESULTS.BLOCKED,
                };

                results[type] = result;

                if (!result.granted) {
                    allGranted = false;
                    if (status === RESULTS.BLOCKED) {
                        blockedPermissions.push(type);
                    } else {
                        deniedPermissions.push(type);
                    }
                }
            }

            console.log('[DEBUG_LOG] 다중 권한 확인 결과:', {
                allGranted,
                deniedPermissions,
                blockedPermissions,
            });

            return {
                allGranted,
                results,
                deniedPermissions,
                blockedPermissions,
            };
        } catch (error) {
            console.error('[DEBUG_LOG] 다중 권한 확인 실패:', error);
            safeLogger.error('Multiple permissions check failed', error);

            // 에러 발생 시 모든 권한을 거부된 것으로 처리
            const results = types.reduce((acc, type) => {
                acc[type] = {
                    granted: false,
                    status: RESULTS.UNAVAILABLE,
                    canAskAgain: false,
                    message: '권한 확인 중 오류가 발생했습니다.',
                };
                return acc;
            }, {} as Record<PermissionType, PermissionResult>);

            return {
                allGranted: false,
                results,
                deniedPermissions: types,
                blockedPermissions: [],
            };
        }
    }

    /**
     * 권한 요청
     */
    static async requestPermission(
        type: PermissionType,
        showRationale: boolean = true
    ): Promise<PermissionResult> {
        try {
            const config = PERMISSION_MAP[type];
            const permission = this.getPermissionForPlatform(type);

            // 먼저 현재 상태 확인
            const currentStatus = await check(permission);

            // 이미 허용된 경우
            if (currentStatus === RESULTS.GRANTED) {
                return {
                    granted: true,
                    status: currentStatus,
                    canAskAgain: true,
                };
            }

            // 차단된 경우 설정으로 이동 안내
            if (currentStatus === RESULTS.BLOCKED) {
                if (showRationale) {
                    await this.showBlockedPermissionAlert(type);
                }
                return {
                    granted: false,
                    status: currentStatus,
                    canAskAgain: false,
                    message: '설정에서 권한을 허용해주세요.',
                };
            }

            // 권한 요청 전 설명 표시
            if (showRationale && currentStatus === RESULTS.DENIED) {
                const shouldRequest = await this.showPermissionRationale(type);
                if (!shouldRequest) {
                    return {
                        granted: false,
                        status: currentStatus,
                        canAskAgain: true,
                        message: '사용자가 권한 요청을 취소했습니다.',
                    };
                }
            }

            // 권한 요청
            console.log(`[DEBUG_LOG] 권한 요청 - ${type}`);
            const status = await request(permission);

            console.log(`[DEBUG_LOG] 권한 요청 결과 - ${type}:`, status);

            return {
                granted: status === RESULTS.GRANTED,
                status,
                canAskAgain: status !== RESULTS.BLOCKED,
            };
        } catch (error) {
            console.error(`[DEBUG_LOG] 권한 요청 실패 - ${type}:`, error);
            safeLogger.error(`Permission request failed for ${type}`, error);

            return {
                granted: false,
                status: RESULTS.UNAVAILABLE,
                canAskAgain: false,
                message: '권한 요청 중 오류가 발생했습니다.',
            };
        }
    }

    /**
     * 다중 권한 요청
     */
    static async requestMultiplePermissions(
        types: PermissionType[],
        showRationale: boolean = true
    ): Promise<MultiplePermissionResult> {
        try {
            // 먼저 현재 상태들 확인
            const currentResult = await this.checkMultiplePermissions(types);

            // 이미 모든 권한이 허용된 경우
            if (currentResult.allGranted) {
                return currentResult;
            }

            // 차단된 권한이 있는 경우 안내
            if (currentResult.blockedPermissions.length > 0 && showRationale) {
                await this.showBlockedMultiplePermissionsAlert(currentResult.blockedPermissions);
            }

            // 요청할 권한들만 필터링 (차단되지 않은 권한들)
            const permissionsToRequest = types.filter(type =>
                !currentResult.results[type].granted &&
                currentResult.results[type].canAskAgain
            );

            if (permissionsToRequest.length === 0) {
                return currentResult;
            }

            // 권한 요청 전 설명 표시
            if (showRationale) {
                const shouldRequest = await this.showMultiplePermissionsRationale(permissionsToRequest);
                if (!shouldRequest) {
                    return {
                        ...currentResult,
                        allGranted: false,
                    };
                }
            }

            // 다중 권한 요청
            const permissions = permissionsToRequest.reduce((acc, type) => {
                acc[this.getPermissionForPlatform(type)] = this.getPermissionForPlatform(type);
                return acc;
            }, {} as Record<Permission, Permission>);

            console.log('[DEBUG_LOG] 다중 권한 요청:', permissionsToRequest);
            const statuses = await requestMultiple(Object.keys(permissions) as Permission[]);

            // 결과 업데이트
            const updatedResults = {...currentResult.results};
            const newDeniedPermissions: PermissionType[] = [];
            const newBlockedPermissions: PermissionType[] = [...currentResult.blockedPermissions];

            for (const type of permissionsToRequest) {
                const permission = this.getPermissionForPlatform(type);
                const status = statuses[permission];

                updatedResults[type] = {
                    granted: status === RESULTS.GRANTED,
                    status,
                    canAskAgain: status !== RESULTS.BLOCKED,
                };

                if (status !== RESULTS.GRANTED) {
                    if (status === RESULTS.BLOCKED) {
                        newBlockedPermissions.push(type);
                    } else {
                        newDeniedPermissions.push(type);
                    }
                }
            }

            const allGranted = Object.values(updatedResults).every(result => result.granted);

            console.log('[DEBUG_LOG] 다중 권한 요청 결과:', {
                allGranted,
                deniedPermissions: newDeniedPermissions,
                blockedPermissions: newBlockedPermissions,
            });

            return {
                allGranted,
                results: updatedResults,
                deniedPermissions: newDeniedPermissions,
                blockedPermissions: newBlockedPermissions,
            };
        } catch (error) {
            console.error('[DEBUG_LOG] 다중 권한 요청 실패:', error);
            safeLogger.error('Multiple permissions request failed', error);

            return {
                allGranted: false,
                results: types.reduce((acc, type) => {
                    acc[type] = {
                        granted: false,
                        status: RESULTS.UNAVAILABLE,
                        canAskAgain: false,
                        message: '권한 요청 중 오류가 발생했습니다.',
                    };
                    return acc;
                }, {} as Record<PermissionType, PermissionResult>),
                deniedPermissions: types,
                blockedPermissions: [],
            };
        }
    }

    /**
     * 출퇴근 관리에 필요한 권한들 요청
     */
    static async requestAttendancePermissions(): Promise<MultiplePermissionResult> {
        const requiredPermissions: PermissionType[] = ['location'];
        const optionalPermissions: PermissionType[] = ['nfc'];

        console.log('[DEBUG_LOG] 출퇴근 관리 권한 요청 시작');

        // 필수 권한 먼저 요청
        const requiredResult = await this.requestMultiplePermissions(requiredPermissions, true);

        if (!requiredResult.allGranted) {
            console.warn('[DEBUG_LOG] 필수 권한이 허용되지 않음:', requiredResult.deniedPermissions);
            return requiredResult;
        }

        // 선택적 권한 요청 (실패해도 계속 진행)
        const optionalResult = await this.requestMultiplePermissions(optionalPermissions, false);

        // 결과 합치기
        return {
            allGranted: requiredResult.allGranted, // 필수 권한만 체크
            results: {
                ...requiredResult.results,
                ...optionalResult.results,
            },
            deniedPermissions: [
                ...requiredResult.deniedPermissions,
                ...optionalResult.deniedPermissions,
            ],
            blockedPermissions: [
                ...requiredResult.blockedPermissions,
                ...optionalResult.blockedPermissions,
            ],
        };
    }

    /**
     * 앱 설정 화면 열기
     */
    static async openAppSettings(): Promise<void> {
        try {
            await openSettings();
        } catch (error) {
            console.error('[DEBUG_LOG] 앱 설정 열기 실패:', error);
            safeLogger.error('Failed to open app settings', error);
        }
    }

    /**
     * 플랫폼에 맞는 권한 반환
     */
    private static getPermissionForPlatform(type: PermissionType): Permission {
        const config = PERMISSION_MAP[type];
        return Platform.OS === 'ios' ? config.ios : config.android;
    }

    /**
     * 권한 설명 다이얼로그 표시
     */
    private static showPermissionRationale(type: PermissionType): Promise<boolean> {
        const config = PERMISSION_MAP[type];

        return new Promise((resolve) => {
            Alert.alert(
                config.title,
                config.rationale,
                [
                    {
                        text: '취소',
                        style: 'cancel',
                        onPress: () => resolve(false),
                    },
                    {
                        text: '허용',
                        onPress: () => resolve(true),
                    },
                ]
            );
        });
    }

    /**
     * 다중 권한 설명 다이얼로그 표시
     */
    private static showMultiplePermissionsRationale(types: PermissionType[]): Promise<boolean> {
        const titles = types.map(type => PERMISSION_MAP[type].title).join(', ');
        const descriptions = types.map(type => `• ${PERMISSION_MAP[type].description}`).join('\n');

        return new Promise((resolve) => {
            Alert.alert(
                '권한 요청',
                `다음 권한들이 필요합니다:\n\n${descriptions}\n\n앱의 정상적인 동작을 위해 권한을 허용해주세요.`,
                [
                    {
                        text: '취소',
                        style: 'cancel',
                        onPress: () => resolve(false),
                    },
                    {
                        text: '허용',
                        onPress: () => resolve(true),
                    },
                ]
            );
        });
    }

    /**
     * 차단된 권한 안내 다이얼로그
     */
    private static showBlockedPermissionAlert(type: PermissionType): Promise<void> {
        const config = PERMISSION_MAP[type];

        return new Promise((resolve) => {
            Alert.alert(
                '권한 설정 필요',
                `${config.title}이 차단되어 있습니다.\n\n${config.description}\n\n설정에서 권한을 허용해주세요.`,
                [
                    {
                        text: '취소',
                        style: 'cancel',
                        onPress: () => resolve(),
                    },
                    {
                        text: '설정으로 이동',
                        onPress: () => {
                            openSettings().catch(() => {
                                console.error('[DEBUG_LOG] 설정 화면 열기 실패');
                            });
                            resolve();
                        },
                    },
                ]
            );
        });
    }

    /**
     * 차단된 다중 권한 안내 다이얼로그
     */
    private static showBlockedMultiplePermissionsAlert(types: PermissionType[]): Promise<void> {
        const titles = types.map(type => PERMISSION_MAP[type].title).join(', ');

        return new Promise((resolve) => {
            Alert.alert(
                '권한 설정 필요',
                `다음 권한들이 차단되어 있습니다:\n${titles}\n\n앱의 정상적인 동작을 위해 설정에서 권한을 허용해주세요.`,
                [
                    {
                        text: '취소',
                        style: 'cancel',
                        onPress: () => resolve(),
                    },
                    {
                        text: '설정으로 이동',
                        onPress: () => {
                            openSettings().catch(() => {
                                console.error('[DEBUG_LOG] 설정 화면 열기 실패');
                            });
                            resolve();
                        },
                    },
                ]
            );
        });
    }
}

export default PermissionService;
