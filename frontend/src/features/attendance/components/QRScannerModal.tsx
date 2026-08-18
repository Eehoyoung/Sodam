/**
 * QR 스캐너 모달(WP-C, D-2 해소) — 59 NFCScanModal과 대칭되는 자리(다크 풀스크린).
 * 판독 수단만 카메라로 바뀔 뿐, 판정 로직(토큰 검증)은 그대로 BE가 담당한다 — 이 컴포넌트는
 * 카메라로 QR 문자열을 읽어 onScanned로 상위에 넘기기만 한다(대리출근 방지 로직은 건드리지 않음).
 *
 * 카메라 권한이 없으면 요청하고, 거부됐거나 카메라 기기가 없으면 안내만 보여준다(크래시 방지).
 */
import React, {useEffect, useRef} from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Camera, useCameraDevice, useCameraPermission, useCodeScanner} from 'react-native-vision-camera';

interface Props {
    visible: boolean;
    onScanned: (token: string) => void;
    onClose: () => void;
    /** 개발용 시각 검증 전용 — Modal은 별도 Android 창이라 배경 마커가 uiautomator에 안 잡힌다. */
    captureMarker?: string;
}

/**
 * 59 NFCScanModal과 같은 고정 다크 팔레트 — 여기서도 테마 토큰(c.*) 대신 이 값을 쓴다
 * (조도가 낮은 환경에서 카메라 프리뷰 위 오버레이 대비를 항상 보장하기 위해 라이트/다크 설정 무관).
 */
const QR_SCAN = {
    canvas: '#12141B',
    iconCircle: '#173330',
    text: '#F5F3EF',
    textMuted: 'rgba(245,243,239,0.7)',
    frameBorder: '#2DD4BF',
    cancelBorder: 'rgba(245,243,239,0.35)',
} as const;

export const QRScannerModal: React.FC<Props> = ({visible, onScanned, onClose, captureMarker}) => {
    const device = useCameraDevice('back');
    const {hasPermission, requestPermission} = useCameraPermission();

    useEffect(() => {
        if (visible && !hasPermission) {
            requestPermission();
        }
    }, [visible, hasPermission, requestPermission]);

    // 같은 QR 이 프레임에 남아 있는 동안 콜백이 계속 불린다 — 출퇴근 요청이 반복 발사되지 않도록
    // 모달이 열려 있는 동안 1회만 통과시킨다(H-5).
    const hasScannedRef = useRef(false);

    useEffect(() => {
        if (visible) {
            hasScannedRef.current = false;
        }
    }, [visible]);

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            const value = codes[0]?.value;
            if (value && !hasScannedRef.current) {
                hasScannedRef.current = true;
                onScanned(value);
            }
        },
    });

    const canShowCamera = visible && !!device && hasPermission;

    return (
        <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                {captureMarker ? <Text style={styles.captureMarker}>{captureMarker}</Text> : null}

                {canShowCamera && device ? (
                    <Camera
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={visible}
                        codeScanner={codeScanner}
                    />
                ) : (
                    <View style={styles.permissionBox}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="camera-outline" size={32} color={QR_SCAN.frameBorder} />
                        </View>
                        <Text style={styles.title}>
                            {device ? '카메라 권한이 필요해요' : '이 기기에서 카메라를 찾을 수 없어요'}
                        </Text>
                        <Text style={styles.sub}>
                            {device
                                ? '매장에 게시된 QR을 스캔하려면 카메라 접근을 허용해 주세요.'
                                : '다른 출퇴근 방법을 이용해 주세요.'}
                        </Text>
                    </View>
                )}

                {canShowCamera ? (
                    <View style={styles.overlay} pointerEvents="box-none">
                        <View style={styles.scanFrame} />
                        <Text style={styles.hint}>매장 QR을 사각형 안에 맞춰 주세요</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    onPress={onClose}
                    style={styles.cancelBtn}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="QR 스캔 취소">
                    <Text style={styles.cancelText}>취소</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: QR_SCAN.canvas,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 32,
        paddingBottom: 40,
    },
    captureMarker: {position: 'absolute', width: 1, height: 1, fontSize: 1, lineHeight: 1, color: 'transparent'},
    permissionBox: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: QR_SCAN.iconCircle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '800',
        color: QR_SCAN.text,
        textAlign: 'center',
    },
    sub: {
        marginTop: 10,
        fontSize: 14,
        lineHeight: 21,
        color: QR_SCAN.textMuted,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanFrame: {
        width: 240,
        height: 240,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: QR_SCAN.frameBorder,
    },
    hint: {
        marginTop: 20,
        fontSize: 14,
        color: QR_SCAN.text,
        textAlign: 'center',
        paddingHorizontal: 24,
    },
    cancelBtn: {
        marginTop: 24,
        alignSelf: 'stretch',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: QR_SCAN.cancelBorder,
        alignItems: 'center',
    },
    cancelText: {
        color: QR_SCAN.text,
        fontSize: 15,
        fontWeight: '700',
    },
});

export default QRScannerModal;
