import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useFocusEffect, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    BottomSheet,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import timeOffService from '../../myPage/services/timeOffService';
import {formatConsumedDays, TIME_OFF_LEAVE_TYPE_LABEL, TIME_OFF_UNIT_LABEL, type TimeOffResponse} from '../types';

function formatPeriod(item: TimeOffResponse): string {
    const [, sm, sd] = item.startDate.split('-');
    const [, em, ed] = item.endDate.split('-');
    const range = item.startDate === item.endDate ? `${sm}/${sd}` : `${sm}/${sd} ~ ${em}/${ed}`;
    if (item.unit === 'HOURS' && item.startTime && item.endTime) {
        return `${range} ${item.startTime.slice(0, 5)}~${item.endTime.slice(0, 5)}`;
    }
    return range;
}

/**
 * 사장 연차/휴가 승인 — 대기 중인 직원 휴가 신청을 승인/거부.
 * BE: GET /api/master/timeoff/pending, PUT /api/master/timeoff/{id}/approve|reject.
 * 거부는 사유 입력을 강제한다(§60⑤ 시기변경권이 유일한 법적 거부 근거).
 */
export default function TimeOffApprovalScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'TimeOffApproval'>>();
    const storeId = route.params?.storeId;
    const c = useThemeColors();
    const [items, setItems] = useState<TimeOffResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const [rejectTarget, setRejectTarget] = useState<TimeOffResponse | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setItems(storeId
                ? await timeOffService.fetchStorePendingTimeOffs(storeId)
                : await timeOffService.fetchPendingTimeOffs());
        } catch (err: any) {
            setError(err?.response?.data?.message || '승인 대기 목록을 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const approve = async (item: TimeOffResponse) => {
        setBusyId(item.id);
        try {
            if (storeId) {
                await timeOffService.approveStoreTimeOff(item.id);
            } else {
                await timeOffService.approveTimeOff(item.id);
            }
            AppToast.success(`${item.employeeName}님 휴가 신청을 승인했어요.`);
            await load();
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || '승인에 실패했어요. 잔여 연차를 확인해 주세요.');
        } finally {
            setBusyId(null);
        }
    };

    const openReject = (item: TimeOffResponse) => {
        setRejectTarget(item);
        setRejectReason('');
    };
    const closeReject = () => {
        setRejectTarget(null);
        setRejectReason('');
    };

    const confirmReject = async () => {
        if (!rejectTarget) {
            return;
        }
        const trimmed = rejectReason.trim();
        if (trimmed.length < 2) {
            AppToast.warn('거부 사유를 2자 이상 입력해 주세요.');
            return;
        }
        setBusyId(rejectTarget.id);
        try {
            if (storeId) {
                await timeOffService.rejectStoreTimeOff(rejectTarget.id, trimmed);
            } else {
                await timeOffService.rejectTimeOff(rejectTarget.id, trimmed);
            }
            AppToast.show(`${rejectTarget.employeeName}님 휴가 신청을 거부했어요.`);
            closeReject();
            await load();
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || '처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusyId(null);
        }
    };

    const header = <AppHeader title="휴가 승인" onBack={() => navigation.goBack()} />;

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="승인 대기 목록 불러오는 중" description="대기 중인 휴가 신청을 확인하고 있어요." />
            </ScreenContainer>
        );
    }
    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="불러오지 못했어요" description={error} primary={{label: '다시 시도', onPress: load}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <View style={styles.intro}>
                <AppText variant="headingSm">대기 중인 휴가 신청</AppText>
                <AppText variant="bodyMd" tone="secondary">
                    승인하면 연차인 경우 잔여 연차에서 자동으로 차감돼요.
                </AppText>
            </View>

            {items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="umbrella-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="대기 중인 신청이 없어요"
                    description="직원이 휴가를 신청하면 여기에 표시돼요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(item => {
                        const busy = busyId === item.id;
                        return (
                            <AppCard key={item.id} variant="flat" style={styles.card}>
                                <View style={styles.cardHead}>
                                    <View style={[styles.icon, {backgroundColor: c.surfaceMint}]}>
                                        <Ionicons name="umbrella-outline" size={20} color={c.success} />
                                    </View>
                                    <View style={styles.flex}>
                                        <AppText variant="titleMd" numberOfLines={1}>
                                            {item.employeeName}님 {TIME_OFF_LEAVE_TYPE_LABEL[item.leaveType]} 신청
                                        </AppText>
                                        <AppText variant="caption" tone="secondary">
                                            {formatPeriod(item)} · {TIME_OFF_UNIT_LABEL[item.unit]} · {formatConsumedDays(item.consumedDays)}일
                                        </AppText>
                                    </View>
                                    <AppBadge label="대기" tone="warning" />
                                </View>
                                <AppText variant="bodyMd" tone="secondary" numberOfLines={3}>
                                    {item.reason}
                                </AppText>
                                <View style={styles.actions}>
                                    <AppButton
                                        label="거부"
                                        variant="secondary"
                                        fullWidth={false}
                                        disabled={busy}
                                        style={styles.flex}
                                        onPress={() => openReject(item)}
                                    />
                                    <AppButton
                                        label="승인"
                                        fullWidth={false}
                                        loading={busy}
                                        disabled={busy}
                                        style={styles.flex}
                                        leftIcon={<Ionicons name="checkmark-outline" size={18} color={c.textInverse} />}
                                        onPress={() => approve(item)}
                                    />
                                </View>
                            </AppCard>
                        );
                    })}
                </View>
            )}

            <BottomSheet
                visible={!!rejectTarget}
                onClose={closeReject}
                title={`${rejectTarget?.employeeName ?? ''}님 휴가 신청 거부`}
                description="거부 사유는 근로기준법 §60⑤ 시기변경권 등 법적 근거를 남기기 위해 꼭 필요해요."
                primary={{
                    label: '거부 확정',
                    variant: 'destructive',
                    loading: !!rejectTarget && busyId === rejectTarget.id,
                    onPress: confirmReject,
                }}
                secondary={{label: '취소', variant: 'ghost', onPress: closeReject}}>
                <AppInput
                    label="거부 사유"
                    placeholder="예: 해당 기간 인력 공백 우려"
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    multiline
                    maxLength={200}
                    helper={`${rejectReason.length} / 200자`}
                />
            </BottomSheet>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    intro: {gap: spacing.xs, marginBottom: spacing.lg},
    list: {gap: spacing.md},
    card: {gap: spacing.md, paddingVertical: spacing.md},
    cardHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    icon: {
        width: 40,
        height: 40,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flex: {flex: 1, minWidth: 0},
    actions: {flexDirection: 'row', gap: spacing.sm},
});
