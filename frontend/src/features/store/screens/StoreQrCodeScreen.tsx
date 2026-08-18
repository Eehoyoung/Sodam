import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import {useFocusEffect, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    ConfirmSheet,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {parseServerDateTime} from '../../../common/format/dateTime';
import {useRotateStoreQrCode, useStoreQrCode} from '../hooks/useStoreQrCodeQueries';

type StoreQrCodeRouteProp = RouteProp<HomeStackParamList, 'StoreQrCode'>;

interface Props {
    route: StoreQrCodeRouteProp;
    navigation: NativeStackNavigationProp<HomeStackParamList>;
}

function extractErrorMessage(err: unknown, fallback: string): string {
    const message = (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
    return message ?? fallback;
}

function safeFormatServerDateTime(value?: string): string {
    if (!value) {return '-';}
    const d = parseServerDateTime(value);
    return isNaN(d.getTime()) ? '-' : format(d, 'M월 d일 (EEE) HH:mm', {locale: ko});
}

/**
 * 매장 QR 표시(사장 전용, WP-C — D-2 해소) — 매장에 게시할 QR을 보여주고 유출 시 재발급한다.
 * BE: StoreQrCodeController (`/api/stores/{storeId}/qr`, `@MasterOnly`).
 *
 * ⚠️ 직원이 이 QR을 스캔해 출퇴근하는 흐름(AttendanceScreen의 QRScannerModal)과는 별개 화면이다.
 * 여기서는 판독 로직을 다루지 않는다 — 조회/재발급 API 호출만 담당.
 */
export default function StoreQrCodeScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();

    const {data: qr, isLoading, isError, refetch} = useStoreQrCode(storeId);
    const rotateMutation = useRotateStoreQrCode(storeId);

    // 포커스마다 재조회 — 다른 화면 갔다 돌아와도 최신 만료 시각 반영.
    useFocusEffect(
        useCallback(() => {
            void refetch();
        }, [refetch]),
    );

    const handleRotate = () => {
        ConfirmSheet.confirm({
            title: 'QR을 재발급할까요?',
            description: '재발급하면 이전 QR은 즉시 무효화돼요. 매장에 붙여둔 QR을 새로 인쇄해 교체해 주세요.',
            primary: {
                label: '재발급',
                destructive: true,
                onPress: () => {
                    rotateMutation.mutate(undefined, {
                        onSuccess: () => {
                            AppToast.success('QR을 재발급했어요. 새 QR로 교체해 주세요.');
                        },
                        onError: (err: unknown) => {
                            AppToast.error(extractErrorMessage(err, 'QR 재발급에 실패했어요. 다시 시도해 주세요.'));
                        },
                    });
                },
            },
            secondary: {label: '취소'},
        });
    };

    const header = <AppHeader title="매장 QR" onBack={() => navigation.goBack()} />;

    if (isLoading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="QR 불러오는 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }
    if (isError || !qr) {
        return (
            <ScreenContainer header={header}>
                <ErrorState
                    title="불러오지 못했어요"
                    description="매장 QR을 가져오지 못했어요."
                    primary={{label: '다시 시도', onPress: () => refetch()}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <AppCard variant="spot" style={styles.qrCard}>
                <View style={styles.qrWrap}>
                    <QRCode value={qr.token} size={220} backgroundColor="#FFFFFF" />
                </View>
                <AppText variant="titleMd" weight="700" style={styles.qrHint}>
                    이 QR을 매장에 붙여 두세요
                </AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.qrSub}>
                    직원이 출퇴근할 때 이 QR을 스캔해요. 화면 캡처보다 인쇄해서 붙이는 걸 추천해요.
                </AppText>
            </AppCard>

            <AppCard variant="flat" style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <AppText variant="bodyMd" tone="secondary">발급 시각</AppText>
                    <AppText variant="bodyMd" weight="700">{safeFormatServerDateTime(qr.issuedAt)}</AppText>
                </View>
                <View style={styles.infoRow}>
                    <AppText variant="bodyMd" tone="secondary">만료 시각</AppText>
                    <AppText variant="bodyMd" weight="700">{safeFormatServerDateTime(qr.expiresAt)}</AppText>
                </View>
            </AppCard>

            <AppCard variant="outlined" style={styles.warnCard}>
                <View style={styles.warnRow}>
                    <Ionicons name="alert-circle-outline" size={18} color={c.warning} />
                    <AppText variant="bodyMd" tone="secondary" style={styles.warnText}>
                        QR 사진이 유출됐다고 판단되면 즉시 재발급하세요. 이전 QR은 바로 무효화돼요.
                    </AppText>
                </View>
            </AppCard>

            <AppButton
                label="QR 재발급"
                variant="destructive"
                onPress={handleRotate}
                loading={rotateMutation.isPending}
                style={styles.rotateBtn}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    qrCard: {alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl},
    qrWrap: {padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: radius.lg},
    qrHint: {marginTop: spacing.sm, textAlign: 'center'},
    qrSub: {textAlign: 'center'},
    infoCard: {marginTop: spacing.xl, gap: spacing.sm},
    infoRow: {flexDirection: 'row', justifyContent: 'space-between'},
    warnCard: {marginTop: spacing.md},
    warnRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs},
    warnText: {flex: 1},
    rotateBtn: {marginTop: spacing.xl},
});
