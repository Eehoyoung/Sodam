import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useFocusEffect, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useStoreLiveSync} from '../../../common/realtime/useStoreLiveSync';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {
    AttendanceApproval,
    approveRequest,
    fetchStoreApprovals,
    rejectRequest,
} from '../services/attendanceApprovalService';

type AttendanceApprovalRouteProp = RouteProp<HomeStackParamList, 'AttendanceApproval'>;

interface Props {
    route: AttendanceApprovalRouteProp;
    navigation: NativeStackNavigationProp<HomeStackParamList>;
}

function formatRequestedTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return iso;
    }
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

/**
 * 사장 승인 출퇴근 — 직원이 위치/NFC 없이 요청한 출퇴근을 사장이 승인/거절.
 * 승인 시 직원이 요청한 시각으로 출퇴근이 기록된다.
 */
export default function AttendanceApprovalScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();
    const [items, setItems] = useState<AttendanceApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setItems(await fetchStoreApprovals(storeId, 'PENDING'));
        } catch (err: any) {
            setError(err?.message || '승인 요청을 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    // 직원이 요청하면(보고 있는 동안) 목록 즉시 갱신.
    useStoreLiveSync(storeId ? [storeId] : [], () => load());

    const decide = async (item: AttendanceApproval, approve: boolean) => {
        const verb = item.type === 'CHECK_IN' ? '출근' : '퇴근';
        setBusyId(item.id);
        try {
            if (approve) {
                await approveRequest(item.id);
                AppToast.success(`${item.employeeName}님 ${verb}을 승인했어요.`);
            } else {
                await rejectRequest(item.id);
                AppToast.show(`${item.employeeName}님 ${verb} 요청을 거절했어요.`);
            }
            await load();
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || '처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusyId(null);
        }
    };

    const header = <AppHeader title="출근 승인" onBack={() => navigation.goBack()} />;

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="승인 요청 불러오는 중" description="대기 중인 출퇴근 요청을 확인하고 있어요." />
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
                <AppText variant="headingSm">대기 중인 출퇴근 요청</AppText>
                <AppText variant="bodyMd" tone="secondary">
                    승인하면 직원이 요청한 시각으로 출퇴근이 기록돼요.
                </AppText>
            </View>

            {items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="checkmark-done-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="대기 중인 요청이 없어요"
                    description="직원이 승인 출퇴근을 요청하면 여기에 표시돼요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(item => {
                        const isCheckIn = item.type === 'CHECK_IN';
                        const busy = busyId === item.id;
                        return (
                            <AppCard key={item.id} variant="flat" style={styles.card}>
                                <View style={styles.cardHead}>
                                    <View style={[styles.icon, {backgroundColor: isCheckIn ? c.brandPrimarySoft : c.surfaceSky}]}>
                                        <Ionicons
                                            name={isCheckIn ? 'log-in-outline' : 'log-out-outline'}
                                            size={20}
                                            color={isCheckIn ? c.brandPrimary : c.info}
                                        />
                                    </View>
                                    <View style={styles.flex}>
                                        <AppText variant="titleMd" numberOfLines={1}>
                                            {item.employeeName}님 {isCheckIn ? '출근' : '퇴근'} 요청
                                        </AppText>
                                        <AppText variant="caption" tone="secondary">
                                            요청 시각 {formatRequestedTime(item.requestedTime)}
                                        </AppText>
                                    </View>
                                </View>
                                <View style={styles.actions}>
                                    <AppButton
                                        label="거절"
                                        variant="secondary"
                                        fullWidth={false}
                                        disabled={busy}
                                        style={styles.flex}
                                        onPress={() => decide(item, false)}
                                    />
                                    <AppButton
                                        label="승인"
                                        fullWidth={false}
                                        loading={busy}
                                        disabled={busy}
                                        style={styles.flex}
                                        leftIcon={<Ionicons name="checkmark-outline" size={18} color={c.textInverse} />}
                                        onPress={() => decide(item, true)}
                                    />
                                </View>
                            </AppCard>
                        );
                    })}
                </View>
            )}
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
