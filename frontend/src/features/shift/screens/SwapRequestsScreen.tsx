import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
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
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {radius, spacing} from '../../../theme/tokens';
import storeService from '../../store/services/storeService';
import {addDays, fetchStoreShifts, shortTime, todayIso, WorkShift} from '../services/shiftService';
import {
    approveSwapRequest,
    cancelSwapRequest,
    createSwapRequest,
    fetchSwapRequests,
    SwapRequest,
} from '../services/swapService';

type Route = RouteProp<HomeStackParamList, 'SwapRequests'>;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dateLabel(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${m}월 ${d}일 (${WEEKDAYS[date.getDay()]})`;
}

/**
 * 대타 구하기 — 사장이 확정 시프트에 대해 대타 모집을 열고,
 * 지원한 직원 중 한 명을 골라 확정한다.
 */
const SwapRequestsScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [requests, setRequests] = useState<SwapRequest[]>([]);
    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [employeeNames, setEmployeeNames] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setError(false);
        try {
            const from = todayIso();
            const to = addDays(from, 7);
            const [reqList, shiftList, empList] = await Promise.all([
                fetchSwapRequests(storeId, 'OPEN'),
                fetchStoreShifts(storeId, from, to),
                storeService.getStoreEmployees(storeId).catch(() => []),
            ]);
            setRequests(reqList);
            setShifts([...shiftList].sort((a, b) =>
                a.shiftDate === b.shiftDate
                    ? a.startTime.localeCompare(b.startTime)
                    : a.shiftDate.localeCompare(b.shiftDate),
            ));
            const names: Record<number, string> = {};
            empList.forEach(emp => { names[emp.id] = emp.name; });
            setEmployeeNames(names);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    // 이미 모집 중인 시프트는 후보에서 제외
    const openShiftIds = useMemo(() => new Set(requests.map(r => r.shiftId)), [requests]);
    const candidateShifts = useMemo(
        () => shifts.filter(s => !openShiftIds.has(s.id)),
        [shifts, openShiftIds],
    );

    const approve = (request: SwapRequest, employeeId: number, employeeName: string) => {
        ConfirmSheet.confirm({
            title: `${employeeName}님으로 확정할까요?`,
            description: `${dateLabel(request.shiftDate)} ${shortTime(request.startTime)}~${shortTime(request.endTime)} 근무를 맡게 돼요.`,
            primary: {
                label: '확정하기',
                onPress: async () => {
                    try {
                        await approveSwapRequest(request.id, employeeId);
                        AppToast.success(`${employeeName}님으로 확정했어요`);
                        setExpandedId(null);
                        load();
                    } catch {
                        AppToast.error('확정에 실패했어요. 다시 시도해 주세요.');
                    }
                },
            },
            secondary: {label: '취소'},
        });
    };

    const cancelRecruit = (request: SwapRequest) => {
        ConfirmSheet.confirm({
            title: '모집을 취소할까요?',
            description: '지원한 직원들에게는 모집이 종료됐다고 안내돼요.',
            primary: {
                label: '모집 취소',
                destructive: true,
                onPress: async () => {
                    try {
                        await cancelSwapRequest(request.id);
                        AppToast.show('모집을 취소했어요');
                        setExpandedId(null);
                        load();
                    } catch {
                        AppToast.error('취소에 실패했어요. 다시 시도해 주세요.');
                    }
                },
            },
            secondary: {label: '닫기'},
        });
    };

    const startRecruit = async () => {
        if (selectedShiftId === null || submitting) { return; }
        setSubmitting(true);
        try {
            await createSwapRequest(selectedShiftId);
            AppToast.success('직원들에게 알림을 보냈어요');
            setSelectedShiftId(null);
            await load();
        } catch {
            AppToast.error('모집을 시작하지 못했어요. 다시 시도해 주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderRequest = (request: SwapRequest) => {
        const expanded = expandedId === request.id;
        return (
            <AppCard key={request.id} variant="flat">
                <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setExpandedId(expanded ? null : request.id)}>
                    <View style={styles.reqTop}>
                        <View style={styles.flex}>
                            <AppText variant="titleMd" weight="700">
                                {dateLabel(request.shiftDate)} · {shortTime(request.startTime)}~{shortTime(request.endTime)}
                            </AppText>
                            <AppText variant="caption" tone="secondary">
                                {request.originalEmployeeName ? `원 배정: ${request.originalEmployeeName} · ` : ''}
                                지원자 {request.applicants.length}명
                            </AppText>
                        </View>
                        {request.applicants.length > 0 && <AppBadge label={`지원 ${request.applicants.length}`} tone="info" />}
                        <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={c.textTertiary}
                        />
                    </View>
                </TouchableOpacity>

                {expanded && (
                    <View style={[styles.reqBody, {borderTopColor: c.divider}]}>
                        {request.applicants.length === 0 ? (
                            <AppText variant="caption" tone="tertiary">아직 지원한 직원이 없어요.</AppText>
                        ) : (
                            request.applicants.map(applicant => (
                                <View key={applicant.employeeId} style={styles.applicantRow}>
                                    <View style={styles.flex}>
                                        <AppText variant="titleMd">{applicant.employeeName}</AppText>
                                        <AppText variant="caption" tone="tertiary">
                                            {applicant.appliedAt?.slice(0, 16).replace('T', ' ')} 지원
                                        </AppText>
                                    </View>
                                    <AppButton
                                        label="이 직원으로 확정"
                                        size="sm"
                                        onPress={() => approve(request, applicant.employeeId, applicant.employeeName)}
                                    />
                                </View>
                            ))
                        )}
                        <AppButton
                            label="모집 취소"
                            variant="ghost"
                            size="sm"
                            onPress={() => cancelRecruit(request)}
                        />
                    </View>
                )}
            </AppCard>
        );
    };

    const renderCandidate = (shift: WorkShift) => {
        const selected = selectedShiftId === shift.id;
        return (
            <TouchableOpacity
                key={shift.id}
                activeOpacity={0.75}
                style={[
                    styles.shiftRow,
                    {backgroundColor: c.surface, borderColor: selected ? c.brandPrimary : c.border},
                ]}
                onPress={() => setSelectedShiftId(selected ? null : shift.id)}>
                <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selected ? c.brandPrimary : c.textTertiary}
                />
                <View style={styles.flex}>
                    <AppText variant="titleMd" weight={selected ? '700' : '600'}>
                        {dateLabel(shift.shiftDate)} · {shortTime(shift.startTime)}~{shortTime(shift.endTime)}
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                        {employeeNames[shift.employeeId] ?? '직원'}
                        {shift.memo ? ` · ${shift.memo}` : ''}
                    </AppText>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="대타 구하기" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState title="불러오는 중" description="대타 모집 현황을 불러오고 있어요" />
            ) : error ? (
                <ErrorState
                    title="대타 현황을 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : (
                <>
                    {/* ── 모집 중 ── */}
                    <AppText variant="headingSm" style={styles.sectionTitle}>모집 중</AppText>
                    {requests.length === 0 ? (
                        <AppCard variant="flat">
                            <AppText variant="bodyMd" tone="secondary" center>
                                지금 모집 중인 대타가 없어요.
                            </AppText>
                        </AppCard>
                    ) : (
                        <View style={styles.list}>{requests.map(renderRequest)}</View>
                    )}

                    {/* ── 대타 모집 열기 ── */}
                    <AppText variant="headingSm" style={styles.sectionTitleGap}>대타 모집 열기</AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.sectionHint}>
                        오늘부터 7일 안의 근무 중 대타가 필요한 근무를 선택하세요.
                    </AppText>
                    {candidateShifts.length === 0 ? (
                        <AppCard variant="flat">
                            <AppText variant="bodyMd" tone="secondary" center>
                                모집을 열 수 있는 근무가 없어요.
                            </AppText>
                        </AppCard>
                    ) : (
                        <>
                            <View style={styles.list}>{candidateShifts.map(renderCandidate)}</View>
                            <AppButton
                                label="대타 모집 시작"
                                loading={submitting}
                                disabled={selectedShiftId === null}
                                onPress={startRecruit}
                                style={styles.startBtn}
                            />
                        </>
                    )}
                </>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    flex: {flex: 1, minWidth: 0},
    list: {gap: spacing.sm},
    sectionTitle: {marginBottom: spacing.sm},
    sectionTitleGap: {marginTop: spacing.xxl, marginBottom: spacing.xs},
    sectionHint: {marginBottom: spacing.sm},

    reqTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    reqBody: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        gap: spacing.md,
    },
    applicantRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},

    shiftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        padding: spacing.md,
    },
    startBtn: {marginTop: spacing.lg},
});

export default SwapRequestsScreen;
