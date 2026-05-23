import React, {useEffect, useRef, useState} from 'react';
import {Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import NfcManager, {Ndef, NfcTech} from 'react-native-nfc-manager';
import {Button, Card, Toast} from '../../../common/components';
import {colors, spacing} from '../../../common/styles/theme';
import {useAuth} from '../../../contexts/AuthContext';
import {
    isNFCTagValid,
    parseNFCTagData,
    verifyCheckInByNFC,
    verifyCheckOutByNFC
} from '../services/nfcAttendanceService';
import {Icon} from '../../../common/components/Icon';

const c = colors as any;

interface NFCAttendanceProps {
    onSuccess?: (isCheckIn: boolean) => void;
    onError?: (error: string) => void;
}

const NFCAttendance: React.FC<NFCAttendanceProps> = ({
                                                         onSuccess,
                                                         onError
                                                     }) => {
    const {user} = useAuth();
    const [isNFCSupported, setIsNFCSupported] = useState(false);
    const [isNFCEnabled, setIsNFCEnabled] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isCheckingIn, setIsCheckingIn] = useState(true); // true: 출근, false: 퇴근

    // Refs to track NFC services and component mount status for proper cleanup
    const isMountedRef = useRef(true);
    const nfcListenerRef = useRef<(() => void) | null>(null);

    // Cleanup effect to properly stop NFC services when component unmounts
    useEffect(() => {
        return () => {
            isMountedRef.current = false;

            // Stop NFC scanning to prevent memory leaks
            setIsActive(false);

            // Clean up NFC listeners
            if (nfcListenerRef.current) {
                nfcListenerRef.current();
                nfcListenerRef.current = null;
            }

            // Cancel any ongoing NFC operations
            NfcManager.cancelTechnologyRequest().catch(() => {
                // Ignore errors during cleanup
            });
        };
    }, []);

    // NFC 초기화 및 지원 여부 확인
    const initializeNFC = async () => {
        if (!isMountedRef.current) {
            return;
        }

        try {
            // NFC Manager 초기화
            const isSupported = await NfcManager.isSupported();

            if (!isMountedRef.current) {
                console.log('[DEBUG_LOG] NFCAttendance: Component unmounted during NFC initialization, skipping state update');
                return;
            }

            setIsNFCSupported(isSupported);

            if (!isSupported) {
                if (onError) onError('이 기기는 NFC를 지원하지 않습니다.');
                return;
            }

            // NFC Manager 시작
            await NfcManager.start();

            // NFC 활성화 상태 확인
            const isEnabled = await NfcManager.isEnabled();

            if (!isMountedRef.current) {
                console.log('[DEBUG_LOG] NFCAttendance: Component unmounted during NFC status check, skipping state update');
                return;
            }

            setIsNFCEnabled(isEnabled);

            if (!isEnabled) {
                Alert.alert(
                    'NFC 비활성화',
                    'NFC 출퇴근을 위해 NFC를 활성화해주세요. 설정에서 NFC를 켜주세요.',
                    [
                        {text: '취소', style: 'cancel'},
                        {
                            text: '설정으로 이동',
                            onPress: () => {
                                if (Platform.OS === 'android') {
                                    Linking.sendIntent('android.settings.NFC_SETTINGS');
                                } else {
                                    Linking.openSettings();
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('[DEBUG_LOG] NFCAttendance: NFC initialization failed:', error);
            if (!isMountedRef.current) return;

            if (onError) onError('NFC 초기화에 실패했습니다.');
        }
    };

    // 컴포넌트 마운트 시 NFC 초기화
    useEffect(() => {
        initializeNFC();
    }, []);

    // NFC 태그 스캔 처리
    const handleNFCTagScanned = async (nfcData: string) => {
        // Check if component is still mounted
        if (!isMountedRef.current) {
            console.log('[DEBUG_LOG] NFCAttendance: Component unmounted, skipping NFC tag processing');
            return;
        }

        if (loading) {
            console.log('[DEBUG_LOG] NFCAttendance: Already processing, ignoring duplicate NFC tag');
            return;
        }

        setLoading(true);

        try {
            // NFC 태그 데이터 파싱
            const parsedData = parseNFCTagData(nfcData);
            if (!parsedData) {
                throw new Error('유효하지 않은 NFC 태그입니다.');
            }

            // NFC 태그 유효성 검사
            if (!isNFCTagValid(parsedData.timestamp)) {
                throw new Error('만료된 NFC 태그입니다. 새로운 태그를 요청해주세요.');
            }

            if (!user?.id) {
                throw new Error('사용자 정보를 찾을 수 없습니다.');
            }

            // 출근/퇴근 API 호출
            const verifyFunction = isCheckingIn ? verifyCheckInByNFC : verifyCheckOutByNFC;
            const employeeIdNum = Number(user.id);
            if (!Number.isFinite(employeeIdNum)) {
                throw new Error('유효하지 않은 사용자 ID입니다.');
            }
            const result = await verifyFunction({
                employeeId: employeeIdNum,
                storeId: parsedData.storeId,
                nfcTagId: nfcData
            });

            if (!isMountedRef.current) {
                console.log('[DEBUG_LOG] NFCAttendance: Component unmounted during API call, skipping result processing');
                return;
            }

            if (result.success) {
                Toast.show({
                    type: 'success',
                    text1: isCheckingIn ? '출근 완료' : '퇴근 완료',
                    text2: result.message || `${isCheckingIn ? '출근' : '퇴근'}이 성공적으로 처리되었습니다.`,
                    visibilityTime: 3000,
                });

                if (onSuccess) {
                    onSuccess(isCheckingIn);
                }
            } else {
                throw new Error(result.message || 'NFC 출퇴근 처리에 실패했습니다.');
            }
        } catch (error) {
            console.error('[DEBUG_LOG] NFCAttendance: NFC tag processing failed:', error);

            if (!isMountedRef.current) return;

            const errorMessage = error instanceof Error ? error.message : 'NFC 태그 처리 중 오류가 발생했습니다.';

            Toast.show({
                type: 'error',
                text1: 'NFC 출퇴근 실패',
                text2: errorMessage,
                visibilityTime: 4000,
            });

            if (onError) {
                onError(errorMessage);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
                setIsActive(false);
            }
        }
    };

    // NFC 태그 읽기 시작
    const startNFCReading = async () => {
        if (!isNFCSupported || !isNFCEnabled) {
            Alert.alert('NFC 사용 불가', 'NFC가 지원되지 않거나 비활성화되어 있습니다.');
            return;
        }

        if (!isMountedRef.current) return;

        try {
            setIsActive(true);
            setLoading(false);

            // NFC 태그 감지 시작
            await NfcManager.requestTechnology(NfcTech.Ndef);

            // NFC 태그 읽기
            const tag = await NfcManager.getTag();

            if (!isMountedRef.current) {
                console.log('[DEBUG_LOG] NFCAttendance: Component unmounted during NFC reading, canceling operation');
                await NfcManager.cancelTechnologyRequest();
                return;
            }

            if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
                // NDEF 메시지에서 데이터 추출
                const ndefRecord = tag.ndefMessage[0];
                const nfcData = Ndef.text.decodePayload(Uint8Array.from((ndefRecord as any).payload || []));

                await handleNFCTagScanned(nfcData);
            } else {
                // 일반 태그 ID 사용
                const tagId = tag?.id || '';
                if (tagId) {
                    await handleNFCTagScanned(tagId);
                } else {
                    throw new Error('NFC 태그에서 데이터를 읽을 수 없습니다.');
                }
            }
        } catch (error) {
            console.error('[DEBUG_LOG] NFCAttendance: NFC reading failed:', error);

            if (!isMountedRef.current) return;

            const errorMessage = error instanceof Error ? error.message : 'NFC 태그 읽기에 실패했습니다.';

            Toast.show({
                type: 'error',
                text1: 'NFC 읽기 실패',
                text2: errorMessage,
                visibilityTime: 4000,
            });

            if (onError) {
                onError(errorMessage);
            }
        } finally {
            if (isMountedRef.current) {
                setIsActive(false);
            }

            // NFC 기술 요청 취소
            NfcManager.cancelTechnologyRequest().catch(() => {
                // Ignore cleanup errors
            });
        }
    };

    // NFC 태그 읽기 중지
    const stopNFCReading = async () => {
        try {
            await NfcManager.cancelTechnologyRequest();
            if (isMountedRef.current) {
                setIsActive(false);
            }
        } catch (error) {
            console.error('[DEBUG_LOG] NFCAttendance: Failed to stop NFC reading:', error);
        }
    };

    // 출근/퇴근 모드 전환
    const toggleCheckInMode = () => {
        if (!loading && !isActive) {
            setIsCheckingIn(!isCheckingIn);
        }
    };

    if (!isNFCSupported) {
        return (
            <Card style={styles.container}>
                <View style={styles.unsupportedContainer}>
                    <Icon name="nfc-off" size={64} color={c.text?.secondary || '#666'}/>
                    <Text style={styles.unsupportedTitle}>NFC 미지원</Text>
                    <Text style={styles.unsupportedMessage}>
                        이 기기는 NFC를 지원하지 않습니다.{'\n'}
                        다른 출퇴근 방법을 이용해주세요.
                    </Text>
                </View>
            </Card>
        );
    }

    return (
        <Card style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>NFC 출퇴근</Text>
                <TouchableOpacity
                    style={[
                        styles.modeToggle,
                        isCheckingIn ? styles.checkInMode : styles.checkOutMode
                    ]}
                    onPress={toggleCheckInMode}
                    disabled={loading || isActive}
                >
                    <Text style={styles.modeText}>
                        {isCheckingIn ? '출근' : '퇴근'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.nfcReaderContainer}>
                {isActive ? (
                    <View style={styles.activeReader}>
                        <View style={styles.nfcIcon}>
                            <Icon name="nfc" size={48} color={c.primary?.main || '#1976D2'}/>
                        </View>
                        <Text style={styles.instructionText}>
                            NFC 태그를 기기에 가까이 대주세요
                        </Text>
                        <Text style={styles.subInstructionText}>
                            {isCheckingIn ? '출근' : '퇴근'} 처리를 위해 태그를 터치하세요
                        </Text>
                        {loading && (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>처리 중...</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.inactiveReader}>
                        <View style={styles.nfcIcon}>
                            <Icon name="nfc" size={48} color={c.text?.secondary || '#666'}/>
                        </View>
                        <Text style={styles.instructionText}>
                            NFC 태그 읽기 준비 완료
                        </Text>
                        <Text style={styles.subInstructionText}>
                            아래 버튼을 눌러 {isCheckingIn ? '출근' : '퇴근'} 태그를 스캔하세요
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.buttonContainer}>
                {!isActive ? (
                    <Button
                        title={`NFC ${isCheckingIn ? '출근' : '퇴근'} 시작`}
                        onPress={startNFCReading}
                        disabled={!isNFCEnabled || loading}
                        style={[
                            styles.actionButton,
                            isCheckingIn ? styles.checkInButton : styles.checkOutButton
                        ]}
                    />
                ) : (
                    <Button
                        title="NFC 읽기 중지"
                        onPress={stopNFCReading}
                        style={styles.actionButton}
                    />
                )}
            </View>

            {!isNFCEnabled && (
                <View style={styles.warningContainer}>
                    <Icon name="warning" size={20} color={c.warning?.main || '#FFC107'}/>
                    <Text style={styles.warningText}>
                        NFC가 비활성화되어 있습니다. 설정에서 NFC를 활성화해주세요.
                    </Text>
                </View>
            )}
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.lg,
        margin: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: c.text?.primary || '#222',
    },
    modeToggle: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        minWidth: 60,
        alignItems: 'center',
    },
    checkInMode: {
        backgroundColor: c.success?.main || '#4CAF50',
    },
    checkOutMode: {
        backgroundColor: c.warning?.main || '#FFC107',
    },
    modeText: {
        color: c.text?.inverse || '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    nfcReaderContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        minHeight: 200,
        justifyContent: 'center',
    },
    activeReader: {
        alignItems: 'center',
    },
    inactiveReader: {
        alignItems: 'center',
    },
    nfcIcon: {
        marginBottom: spacing.lg,
        padding: spacing.lg,
        borderRadius: 50,
        backgroundColor: c.background?.secondary || '#F5F5F5',
    },
    instructionText: {
        fontSize: 16,
        fontWeight: '600',
        color: c.text?.primary || '#222',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subInstructionText: {
        fontSize: 14,
        color: c.text?.secondary || '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    loadingContainer: {
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: c.primary?.main || '#1976D2',
        fontWeight: '500',
    },
    buttonContainer: {
        marginTop: spacing.lg,
    },
    actionButton: {
        minHeight: 48,
    },
    checkInButton: {
        backgroundColor: c.success?.main || '#4CAF50',
    },
    checkOutButton: {
        backgroundColor: c.warning?.main || '#FFC107',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: c.warning?.light || '#FFF3CD',
        borderRadius: 8,
    },
    warningText: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: 14,
        color: c.warning?.dark || '#856404',
    },
    unsupportedContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    unsupportedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: c.text?.primary || '#222',
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    unsupportedMessage: {
        fontSize: 14,
        color: c.text?.secondary || '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default NFCAttendance;
