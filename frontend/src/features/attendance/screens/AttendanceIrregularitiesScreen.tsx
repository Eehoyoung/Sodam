/**
 * 월급제 정규직 지각/조퇴/결근 — 사장 확인 화면.
 *
 * 공제 자체는 정산(PayrollService) 시점에 스케줄-출퇴근 대조로 이미 자동 계산되므로, 이 화면은
 * "그대로 둘지(공제 확인) / 취소할지(공제 없음) / 연차로 대체할지"를 사장이 결정하는 창구다.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationProp, RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    ConfirmSheet,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import attendanceIrregularityService from '../services/attendanceIrregularityService';
import type {AttendanceIrregularity, AttendanceIrregularityType} from '../types';

type Route = RouteProp<{R: {storeId: number}}, 'R'>;

const TYPE_LABEL: Record<AttendanceIrregularityType, string> = {
    LATE: '지각',
    EARLY_LEAVE: '조퇴',
    ABSENCE: '결근',
};

function minutesLabel(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) { return `${m}분`; }
    if (m === 0) { return `${h}시간`; }
    return `${h}시간 ${m}분`;
}

function toDateInputString(d: Date): string {
    return d.toISOString().slice(0, 10);
}

const AttendanceIrregularitiesScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const range = useMemo(() => {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 13);
        return {from: toDateInputString(from), to: toDateInputString(to)};
    }, []);

    const [items, setItems] = useState<AttendanceIrregularity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setItems(await attendanceIrregularityService.list(storeId, range.from, range.to));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, range]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const runAction = async (
        item: AttendanceIrregularity,
        action: (storeId: number, id: number) => Promise<AttendanceIrregularity>,
        successMessage: string,
    ) => {
        setBusyId(item.id);
        try {
            await action(storeId, item.id);
            AppToast.success(successMessage);
            await load();
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message || '처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusyId(null);
        }
    };

    const waive = (item: AttendanceIrregularity) => {
        ConfirmSheet.confirm({
            title: '공제 없이 처리할까요?',
            description: '이 건의 미근무시간만큼 이번 정산에서 공제를 취소해요.',
            primary: {
                label: '공제 없이 처리',
                onPress: () => runAction(item, attendanceIrregularityService.waive, '공제 없이 처리했어요.'),
            },
            secondary: {label: '취소'},
        });
    };

    const deduct = (item: AttendanceIrregularity) => {
        runAction(item, attendanceIrregularityService.deduct, '공제를 확인했어요.');
    };

    const convertToLeave = (item: AttendanceIrregularity) => {
        ConfirmSheet.confirm({
            title: '연차로 대체할까요?',
            description: item.type === 'ABSENCE'
                ? '종일 연차 1일이 승인 처리되고, 이번 정산의 결근 공제가 취소돼요.'
                : '반차(0.5일)가 승인 처리되고, 이번 정산의 공제가 취소돼요.',
            primary: {
                label: '연차로 전환',
                onPress: () => runAction(item, attendanceIrregularityService.convertToLeave, '연차로 대체했어요.'),
            },
            secondary: {label: '취소'},
        });
    };

    const header = (
        <AppHeader title="지각/조퇴/결근" onBack={() => navigation.goBack()} />
    );

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="불러오는 중" description="근태 이상 내역을 확인하고 있어요." />
            </ScreenContainer>
        );
    }
    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="불러오지 못했어요" description="잠시 후 다시 시도해 주세요." primary={{label: '다시 시도', onPress: load}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <View style={styles.intro}>
                <AppText variant="bodyMd" tone="secondary">
                    최근 14일간 스케줄 대비 지각/조퇴/결근이 자동으로 감지돼요. 공제는 이미 이번 정산에
                    반영되어 있으니, 사유가 있으면 공제 없이 처리하거나 연차로 대체할 수 있어요.
                </AppText>
            </View>

            {items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="checkmark-circle-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="근태 이상이 없어요"
                    description="최근 14일간 지각/조퇴/결근 기록이 없어요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(item => {
                        const busy = busyId === item.id;
                        const pending = item.resolution === 'PENDING';
                        return (
                            <AppCard key={item.id} variant="flat" style={styles.card}>
                                <View style={styles.cardHead}>
                                    <View style={styles.flex}>
                                        <AppText variant="titleMd">
                                            {item.employeeName ?? '직원'} · {TYPE_LABEL[item.type]}
                                        </AppText>
                                        <AppText variant="caption" tone="secondary">
                                            {item.shiftDate} · {minutesLabel(item.minutesShort)}
                                        </AppText>
                                    </View>
                                    <AppBadge
                                        label={
                                            pending ? '미확인'
                                                : item.resolution === 'WAIVED' ? '공제없음'
                                                : item.resolution === 'DEDUCTED' ? '공제확인'
                                                : '연차전환'
                                        }
                                        tone={pending ? 'warning' : item.resolution === 'WAIVED' ? 'neutral' : 'success'}
                                    />
                                </View>
                                {pending ? (
                                    <View style={styles.actions}>
                                        <AppButton
                                            label="공제 없음"
                                            variant="secondary"
                                            fullWidth={false}
                                            disabled={busy}
                                            style={styles.flex}
                                            onPress={() => waive(item)}
                                        />
                                        <AppButton
                                            label="연차 전환"
                                            variant="secondary"
                                            fullWidth={false}
                                            disabled={busy}
                                            style={styles.flex}
                                            onPress={() => convertToLeave(item)}
                                        />
                                        <AppButton
                                            label="공제 확인"
                                            fullWidth={false}
                                            loading={busy}
                                            disabled={busy}
                                            style={styles.flex}
                                            onPress={() => deduct(item)}
                                        />
                                    </View>
                                ) : (
                                    item.note ? (
                                        <AppText variant="caption" tone="secondary">메모: {item.note}</AppText>
                                    ) : null
                                )}
                            </AppCard>
                        );
                    })}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    intro: {marginBottom: spacing.lg},
    list: {gap: spacing.md},
    card: {gap: spacing.md, paddingVertical: spacing.md},
    cardHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    flex: {flex: 1, minWidth: 0},
    actions: {flexDirection: 'row', gap: spacing.sm},
});

export default AttendanceIrregularitiesScreen;
