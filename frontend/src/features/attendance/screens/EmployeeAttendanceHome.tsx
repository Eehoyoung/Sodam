/* eslint-disable react-native/no-color-literals -- this screen intentionally follows the approved blue/green employee-home mockup. */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useAuth} from '../../../contexts/AuthContext';
import api from '../../../common/utils/api';
import {formatTimer, formatWage} from '../../../common/utils/format';
import {
    fetchMyShifts,
    shortTime,
    thisWeekRange,
    WorkShift,
} from '../../shift/services/shiftService';
import storeService from '../../store/services/storeService';
import {requestApproval} from '../services/attendanceApprovalService';
import {useStoreLiveSync} from '../../../common/hooks/useStoreLiveSync';
import {spacing, radius, shadow} from '../../../theme/tokens';

type AttendanceState = 'IDLE' | 'WORKING' | 'DONE' | 'LOADING';

interface MyStore {
    id: number;
    storeName: string;
    appliedHourlyWage: number;
}

interface TodayAttendance {
    id?: number;
    storeId: number;
    storeName?: string;
    checkInTime?: string;
    checkOutTime?: string;
    appliedHourlyWage?: number;
    workingHours?: number;
    workingMinutes?: number;
    dailyWage?: number;
}

const BLUE = '#1877F2';
const BLUE_DARK = '#0F55B8';
const GREEN = '#16A36A';
const GREEN_SOFT = '#E7F7EF';
const SKY = '#E8F3FF';
const SURFACE = '#FFFFFF';
const CANVAS = '#F6F7F9';
const LINE = '#E1E6EE';
const INK = '#17191F';
const MUTED = '#6B7280';
const AMBER_SOFT = '#FFF5DF';
const AMBER_TEXT = '#9A5B00';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const EmployeeAttendanceHome: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {user} = useAuth();

    const [state, setState] = useState<AttendanceState>('LOADING');
    const [stores, setStores] = useState<MyStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
    const [weekShifts, setWeekShifts] = useState<WorkShift[]>([]);
    const [monthlyAttendances, setMonthlyAttendances] = useState<TodayAttendance[]>([]);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [tick, setTick] = useState(0);

    const selectedStore = useMemo(
        () => stores.find(store => store.id === selectedStoreId) ?? stores[0] ?? null,
        [stores, selectedStoreId],
    );

    const loadStores = useCallback(async () => {
        try {
            setState('LOADING');
            if (!user?.id) {
                setStores([]);
                setSelectedStoreId(null);
                setState('IDLE');
                return;
            }

            const [storeList, wageList] = await Promise.all([
                storeService.getEmployeeStores(user.id),
                Promise.resolve([] as Array<{storeId: number; hourlyWage: number}>),
            ]);
            const wageByStore = wageList.reduce<Record<number, number>>((acc, item) => {
                acc[item.storeId] = item.hourlyWage;
                return acc;
            }, {});
            const mapped = storeList.map(store => ({
                id: store.id,
                storeName: store.storeName,
                appliedHourlyWage: wageByStore[store.id] ?? store.storeStandardHourWage ?? 0,
            }));

            setStores(mapped);
            setSelectedStoreId(prev => prev ?? mapped[0]?.id ?? null);
            if (mapped.length === 0) {
                setState('IDLE');
            }
        } catch (error) {
            console.warn('[EmployeeAttendanceHome] loadStores failed', error);
            AppToast.error('매장 정보를 불러오지 못했어요.');
            setState('IDLE');
        }
    }, [user?.id]);

    const loadStoreScopedData = useCallback(async (store: MyStore) => {
        if (!user?.id) {
            return;
        }
        try {
            setState('LOADING');
            const now = new Date();
            const {from, to} = thisWeekRange(now);
            const [todayRes, shiftList, monthRes, wageRes] = await Promise.all([
                api.get<TodayAttendance>(`/api/attendance/employee/${user.id}/store/${store.id}/today`)
                    .catch(() => null),
                fetchMyShifts(from, to).catch(() => []),
                api.get<TodayAttendance[]>(
                    `/api/attendance/employee/${user.id}/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
                ).catch(() => ({data: [] as TodayAttendance[]})),
                api.get<number>(`/api/wages/employee/${user.id}/store/${store.id}`).catch(() => null),
            ]);

            const wage = typeof wageRes?.data === 'number' ? wageRes.data : store.appliedHourlyWage;
            setStores(prev => prev.map(item => (
                item.id === store.id ? {...item, appliedHourlyWage: wage} : item
            )));

            const today = todayRes?.data ?? null;
            setTodayRecord(today);
            setWeekShifts(shiftList.filter(item => item.storeId === store.id));
            setMonthlyAttendances((monthRes.data ?? []).filter(item => item.storeId === store.id));
            setState(determineState(today));
        } catch (error) {
            console.warn('[EmployeeAttendanceHome] loadStoreScopedData failed', error);
            setTodayRecord(null);
            setWeekShifts([]);
            setMonthlyAttendances([]);
            setState('IDLE');
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            loadStores();
        }, [loadStores]),
    );

    // 실시간 동기화 — 내 매장의 출퇴근/직원 변경 시(보고 있는 동안) 선택 매장 데이터 즉시 갱신.
    useStoreLiveSync(stores.map(s => s.id), () => {
        if (selectedStore) {
            loadStoreScopedData(selectedStore);
        }
    });

    useEffect(() => {
        if (!selectedStore || !user?.id) {
            return;
        }
        loadStoreScopedData(selectedStore);
        // ⚠️ deps 에 selectedStore(객체)를 넣으면 무한 루프: loadStoreScopedData 가 setStores 로
        // stores 를 갱신 → selectedStore 객체 정체성 변경 → 이 effect 재실행 → … 반복.
        // 매장 식별은 id 로 충분하므로 selectedStore?.id 만 의존한다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStore?.id, user?.id, loadStoreScopedData]);

    useEffect(() => {
        if (state !== 'WORKING') {
            return;
        }
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [state]);

    const workingDuration = useMemo(() => {
        if (state !== 'WORKING' || !todayRecord?.checkInTime) {
            return '00:00:00';
        }
        const start = new Date(todayRecord.checkInTime).getTime();
        return formatTimer(Math.max(0, Date.now() - start) / 1000);
    }, [state, todayRecord?.checkInTime, tick]);

    const todaySchedule = useMemo(() => {
        const today = toIsoDate(new Date());
        return weekShifts.find(item => item.shiftDate === today) ?? null;
    }, [weekShifts]);

    const tomorrowSchedule = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomorrow = toIsoDate(d);
        return weekShifts.find(item => item.shiftDate === tomorrow) ?? null;
    }, [weekShifts]);

    const monthlySummary = useMemo(() => {
        const attendanceDays = new Set<string>();
        let estimatedWage = 0;
        for (const item of monthlyAttendances) {
            if (item.checkInTime) {
                attendanceDays.add(item.checkInTime.slice(0, 10));
            }
            if (typeof item.dailyWage === 'number') {
                estimatedWage += item.dailyWage;
                continue;
            }
            const hours = typeof item.workingHours === 'number'
                ? item.workingHours
                : (item.workingMinutes ?? 0) / 60;
            estimatedWage += Math.round(hours * (item.appliedHourlyWage ?? selectedStore?.appliedHourlyWage ?? 0));
        }
        if (state === 'WORKING' && todayRecord?.checkInTime && selectedStore) {
            const elapsedHours = Math.max(0, Date.now() - new Date(todayRecord.checkInTime).getTime()) / 3600000;
            estimatedWage += Math.round(elapsedHours * selectedStore.appliedHourlyWage);
            attendanceDays.add(todayRecord.checkInTime.slice(0, 10));
        }
        return {
            attendanceDays: attendanceDays.size,
            estimatedWage,
        };
    }, [monthlyAttendances, selectedStore, state, todayRecord]);

    const currentWage = todayRecord?.appliedHourlyWage ?? selectedStore?.appliedHourlyWage ?? 0;
    const hasPendingCorrection = false;
    const isWorking = state === 'WORKING';

    const [approvalBusy, setApprovalBusy] = useState(false);

    // 위치/NFC 없이 사장 승인으로 출퇴근 — 요청 버튼. 누르면 사장에게 알림이 가고, 승인 시 요청 시각으로 처리된다.
    const requestApprovalPunch = async () => {
        if (!selectedStore) {
            AppToast.show('먼저 매장에 합류해 주세요.');
            navigation.navigate('JoinStoreByCode');
            return;
        }
        if (state === 'DONE') {
            AppToast.show('오늘은 이미 퇴근 완료됐어요.');
            return;
        }
        const reqType = isWorking ? 'CHECK_OUT' : 'CHECK_IN';
        setApprovalBusy(true);
        try {
            await requestApproval(selectedStore.id, reqType);
            AppToast.success(reqType === 'CHECK_IN'
                ? '출근 승인을 요청했어요. 사장님 승인을 기다려 주세요.'
                : '퇴근 승인을 요청했어요. 사장님 승인을 기다려 주세요.');
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || '요청에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setApprovalBusy(false);
        }
    };

    const handlePunch = () => {
        if (!selectedStore) {
            AppToast.show('먼저 매장에 합류해 주세요.');
            navigation.navigate('JoinStoreByCode');
            return;
        }
        if (state === 'DONE') {
            AppToast.show('오늘은 이미 퇴근 완료됐어요.');
            return;
        }
        navigation.navigate('Attendance');
    };

    if (state === 'LOADING' && stores.length === 0) {
        return (
            <ScreenContainer header={<AppHeader title={`${user?.name ?? '직원'}님`} />}>
                <LoadingState title="오늘 근무 상태 확인 중" description="소속 매장과 스케줄을 불러오고 있어요." />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            padded={false}
            header={
                <AppHeader
                    title={`${user?.name ?? '직원'}님, 안녕하세요`}
                    actions={[
                        {label: '알림', icon: <Ionicons name="notifications-outline" size={20} color={BLUE} />, onPress: () => navigation.navigate('NotificationCenter')},
                        {label: '설정', icon: <Ionicons name="settings-outline" size={20} color={BLUE} />, onPress: () => navigation.navigate('AccountSettings')},
                    ]}
                />
            }>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}>
                <View style={styles.dateBlock}>
                    <AppText variant="caption" tone="secondary">{formatToday()}</AppText>
                    <AppText variant="bodyMd" tone="secondary">오늘도 안전하게 근무하세요</AppText>
                </View>

                <Pressable
                    style={styles.storeSelector}
                    onPress={() => setSelectorOpen(open => !open)}
                    accessibilityRole="button"
                    accessibilityLabel="매장 선택">
                    <View style={styles.storeSelectorMain}>
                        <Ionicons name="storefront-outline" size={18} color={BLUE} />
                        <AppText variant="titleMd" numberOfLines={1} style={styles.storeName}>
                            {selectedStore?.storeName ?? '소속 매장이 없어요'}
                        </AppText>
                    </View>
                    <View style={styles.storeSelectorRight}>
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                            시급 {formatWage(currentWage)}
                        </AppText>
                        <Ionicons name={selectorOpen ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
                    </View>
                </Pressable>

                {selectorOpen && stores.length > 1 ? (
                    <View style={styles.storeChips}>
                        {stores.map(store => {
                            const selected = store.id === selectedStore?.id;
                            return (
                                <Pressable
                                    key={store.id}
                                    style={[styles.storeChip, selected && styles.storeChipSelected]}
                                    onPress={() => {
                                        setSelectedStoreId(store.id);
                                        setSelectorOpen(false);
                                    }}>
                                    <AppText
                                        variant="caption"
                                        tone={selected ? 'brand' : 'secondary'}
                                        numberOfLines={1}>
                                        {store.storeName}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </View>
                ) : null}

                <AppCard variant="plain" style={styles.punchCard}>
                    <View style={styles.punchTop}>
                        <View style={styles.flex}>
                            <AppText variant="headingMd" style={styles.darkText}>
                                {state === 'WORKING' ? '지금 근무 중이에요' : state === 'DONE' ? '오늘 근무 완료' : '출근 준비가 됐어요'}
                            </AppText>
                            <AppText variant="bodyMd" tone="secondary" style={styles.punchDesc}>
                                {state === 'WORKING'
                                    ? `${formatTime(todayRecord?.checkInTime)}에 출근했어요. 퇴근 전 휴게 기록도 확인해 주세요.`
                                    : state === 'DONE'
                                        ? `${formatTime(todayRecord?.checkOutTime)}에 퇴근했어요. 내일 스케줄을 확인해 주세요.`
                                        : '출근 전 매장과 오늘 스케줄을 확인해 주세요.'}
                            </AppText>
                        </View>
                        <View style={[
                            styles.statusBadge,
                            state === 'DONE' && styles.statusBadgeDone,
                            state === 'IDLE' && styles.statusBadgeIdle,
                        ]}>
                            <AppText variant="caption" weight="700" style={[
                                styles.statusBadgeText,
                                state === 'DONE' && styles.statusBadgeTextDone,
                                state === 'IDLE' && styles.statusBadgeTextIdle,
                            ]}>
                                {state === 'WORKING' ? '정상 출근' : state === 'DONE' ? '퇴근 완료' : '출근 전'}
                            </AppText>
                        </View>
                    </View>

                    <View style={styles.timerPanel}>
                        <AppText variant="caption" tone="inverse" style={styles.timerLabel}>
                            {state === 'WORKING' ? '현재 근무 시간' : '오늘 누적 근무'}
                        </AppText>
                        <AppText style={styles.timerText}>
                            {state === 'WORKING'
                                ? workingDuration
                                : formatTimer(todayWorkedSeconds(todayRecord))}
                        </AppText>
                        <View style={styles.timerMeta}>
                            <AppText variant="caption" tone="inverse">출근 {formatTime(todayRecord?.checkInTime)}</AppText>
                            <AppText variant="caption" tone="inverse">
                                {todaySchedule ? `예정 퇴근 ${shortTime(todaySchedule.endTime)}` : '예정 없음'}
                            </AppText>
                        </View>
                    </View>

                    <AppButton
                        label={state === 'WORKING' ? '퇴근하기' : state === 'DONE' ? '퇴근 완료' : '출근하기'}
                        onPress={handlePunch}
                        disabled={state === 'DONE'}
                        leftIcon={<Ionicons name="timer-outline" size={20} color="#FFFFFF" />}
                        style={styles.punchButton}
                    />
                    {state !== 'DONE' ? (
                        <AppButton
                            label={state === 'WORKING' ? '사장님 승인으로 퇴근 요청' : '사장님 승인으로 출근 요청'}
                            variant="secondary"
                            loading={approvalBusy}
                            disabled={approvalBusy}
                            leftIcon={<Ionicons name="checkmark-done-outline" size={18} color={BLUE} />}
                            style={styles.approvalButton}
                            onPress={requestApprovalPunch}
                        />
                    ) : null}
                    <View style={styles.secondaryActions}>
                        <AppButton
                            label="휴게 기록"
                            variant="secondary"
                            size="md"
                            fullWidth={false}
                            style={styles.secondaryAction}
                            onPress={() => {
                                if (!selectedStore) {return;}
                                navigation.navigate('BreakRecord', {
                                    storeId: selectedStore.id,
                                    employeeId: user?.id ?? 0,
                                    employeeName: user?.name,
                                });
                            }}
                        />
                        <AppButton
                            label="출퇴근 정정"
                            variant="secondary"
                            size="md"
                            fullWidth={false}
                            style={styles.secondaryAction}
                            onPress={() => navigation.navigate('AttendanceCorrectionRequest', {
                                attendanceId: todayRecord?.id,
                                date: todayRecord?.checkInTime?.slice(0, 10),
                                storeName: selectedStore?.storeName,
                                currentCheckIn: todayRecord?.checkInTime,
                                currentCheckOut: todayRecord?.checkOutTime,
                            })}
                        />
                    </View>
                </AppCard>

                <SectionTitle title="오늘 스케줄" action="전체 보기" onPress={() => navigation.navigate('MyShift')} />
                <AppCard variant="plain" style={styles.scheduleCard}>
                    <ScheduleRow label="오늘" shift={todaySchedule} fallback="오늘 확정된 스케줄이 없어요." />
                    <ScheduleRow label="내일" shift={tomorrowSchedule} fallback="내일 스케줄은 아직 비어 있어요." />
                </AppCard>

                <View style={styles.summaryGrid}>
                    <SummaryCard
                        label="이번 달 예상 급여"
                        value={`${monthlySummary.estimatedWage.toLocaleString('ko-KR')}원`}
                        sub={`확인된 근무 ${monthlySummary.attendanceDays}일 기준`}
                    />
                    <SummaryCard
                        label="이번 달 출근"
                        value={`${monthlySummary.attendanceDays}일`}
                        sub={`정정 대기 ${hasPendingCorrection ? 1 : 0}건`}
                    />
                </View>

                <SectionTitle title="빠른 메뉴" />
                <View style={styles.quickGrid}>
                    <QuickAction icon="calendar-outline" label="내 스케줄" onPress={() => navigation.navigate('MyShift')} />
                    <QuickAction icon="wallet-outline" label="급여" onPress={() => navigation.navigate('SalaryList')} />
                    <QuickAction icon="document-text-outline" label="계약서" onPress={() => navigation.navigate('MyContract')} />
                    <QuickAction icon="key-outline" label="매장 합류" onPress={() => navigation.navigate('JoinStoreByCode')} />
                </View>

                <SectionTitle title="확인할 일" />
                <View style={styles.alertList}>
                    <AlertRow
                        icon="create-outline"
                        title="출퇴근 정정이 필요하면 바로 요청하세요"
                        subtitle={isWorking ? '근무 중에도 요청 초안을 남길 수 있어요.' : '기록 이상이 있으면 사장님 확인 후 반영돼요.'}
                        onPress={() => navigation.navigate('AttendanceCorrectionRequest', {
                            attendanceId: todayRecord?.id,
                            date: todayRecord?.checkInTime?.slice(0, 10),
                            storeName: selectedStore?.storeName,
                            currentCheckIn: todayRecord?.checkInTime,
                            currentCheckOut: todayRecord?.checkOutTime,
                        })}
                    />
                    <AlertRow
                        icon="notifications-outline"
                        title={todaySchedule ? '오늘 스케줄이 확정돼 있어요' : '새 스케줄 알림을 확인해 보세요'}
                        subtitle={todaySchedule
                            ? `${shortTime(todaySchedule.startTime)} - ${shortTime(todaySchedule.endTime)}`
                            : '사장님이 확정한 근무 일정만 표시돼요.'}
                        onPress={() => navigation.navigate('NotificationCenter')}
                    />
                </View>
            </ScrollView>
        </ScreenContainer>
    );
};

function determineState(t: TodayAttendance | null): AttendanceState {
    if (!t) {
        return 'IDLE';
    }
    if (t.checkInTime && !t.checkOutTime) {
        return 'WORKING';
    }
    if (t.checkInTime && t.checkOutTime) {
        return 'DONE';
    }
    return 'IDLE';
}

function todayWorkedSeconds(record: TodayAttendance | null): number {
    if (!record) {
        return 0;
    }
    if (typeof record.workingMinutes === 'number') {
        return record.workingMinutes * 60;
    }
    if (typeof record.workingHours === 'number') {
        return record.workingHours * 3600;
    }
    if (record.checkInTime && record.checkOutTime) {
        return Math.max(0, new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / 1000;
    }
    return 0;
}

function formatToday(): string {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

function formatTime(value?: string): string {
    if (!value) {
        return '--:--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value.slice(11, 16) || value.slice(0, 5);
    }
    return date.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'});
}

function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function SectionTitle({title, action, onPress}: {title: string; action?: string; onPress?: () => void}) {
    return (
        <View style={styles.sectionTitleRow}>
            <AppText variant="titleMd" style={styles.darkText}>{title}</AppText>
            {action && onPress ? (
                <Pressable onPress={onPress} hitSlop={8}>
                    <AppText variant="caption" tone="brand" weight="700">{action}</AppText>
                </Pressable>
            ) : null}
        </View>
    );
}

function ScheduleRow({label, shift, fallback}: {label: string; shift: WorkShift | null; fallback: string}) {
    return (
        <View style={styles.scheduleRow}>
            <View style={styles.dateBox}>
                <AppText variant="caption" weight="700" style={styles.dateBoxText}>{label}</AppText>
            </View>
            <View style={styles.flex}>
                <AppText variant="titleMd" numberOfLines={1} style={styles.darkText}>
                    {shift ? `${shortTime(shift.startTime)} - ${shortTime(shift.endTime)}` : fallback}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {shift?.memo ? `${shift.memo} · 사장님 확정` : shift ? '확정된 근무 일정이에요.' : '확정 후 여기에 표시돼요.'}
                </AppText>
            </View>
            {shift ? (
                <View style={styles.confirmedChip}>
                    <AppText variant="caption" weight="700" style={styles.confirmedChipText}>확정</AppText>
                </View>
            ) : (
                <Ionicons name="chevron-forward" size={18} color={MUTED} />
            )}
        </View>
    );
}

function SummaryCard({label, value, sub}: {label: string; value: string; sub: string}) {
    return (
        <AppCard variant="plain" style={styles.summaryCard}>
            <AppText variant="caption" tone="secondary" weight="700">{label}</AppText>
            <AppText variant="headingSm" style={styles.darkText} numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
            <AppText variant="caption" tone="secondary">{sub}</AppText>
        </AppCard>
    );
}

function QuickAction({icon, label, onPress}: {icon: string; label: string; onPress: () => void}) {
    return (
        <Pressable style={styles.quickAction} onPress={onPress} accessibilityRole="button">
            <View style={styles.quickIcon}>
                <Ionicons name={icon} size={20} color={BLUE} />
            </View>
            <AppText variant="caption" weight="700" center style={styles.darkText}>{label}</AppText>
        </Pressable>
    );
}

function AlertRow({
    icon,
    title,
    subtitle,
    onPress,
}: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
}) {
    return (
        <Pressable style={styles.alertRow} onPress={onPress} accessibilityRole="button">
            <View style={styles.alertIcon}>
                <Ionicons name={icon} size={18} color={AMBER_TEXT} />
            </View>
            <View style={styles.flex}>
                <AppText variant="titleMd" numberOfLines={1} style={styles.darkText}>{title}</AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>{subtitle}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: CANVAS,
    },
    content: {
        padding: spacing.lg,
        gap: spacing.md,
        paddingBottom: spacing.xxxl,
    },
    dateBlock: {
        gap: spacing.xs,
    },
    storeSelector: {
        minHeight: 48,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: LINE,
        backgroundColor: SURFACE,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        ...shadow.sm,
    },
    storeSelectorMain: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    storeSelectorRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        maxWidth: '45%',
    },
    storeName: {
        color: INK,
        flex: 1,
    },
    storeChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: -spacing.xs,
    },
    storeChip: {
        minHeight: 34,
        maxWidth: '48%',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: LINE,
        backgroundColor: SURFACE,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeChipSelected: {
        borderColor: BLUE,
        backgroundColor: SKY,
    },
    punchCard: {
        gap: spacing.md,
        borderRadius: radius.lg,
        padding: spacing.lg,
    },
    punchTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    punchDesc: {
        marginTop: spacing.xs,
    },
    statusBadge: {
        borderRadius: radius.pill,
        backgroundColor: GREEN_SOFT,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    statusBadgeDone: {
        backgroundColor: SKY,
    },
    statusBadgeIdle: {
        backgroundColor: AMBER_SOFT,
    },
    statusBadgeText: {
        color: GREEN,
    },
    statusBadgeTextDone: {
        color: BLUE_DARK,
    },
    statusBadgeTextIdle: {
        color: AMBER_TEXT,
    },
    timerPanel: {
        borderRadius: radius.lg,
        backgroundColor: BLUE,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    timerLabel: {
        opacity: 0.9,
        fontWeight: '700',
    },
    timerText: {
        color: '#FFFFFF',
        fontSize: 42,
        lineHeight: 48,
        fontWeight: '800',
        letterSpacing: 0,
    },
    timerMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    punchButton: {
        borderRadius: radius.lg,
        backgroundColor: BLUE,
    },
    approvalButton: {
        marginTop: spacing.sm,
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    secondaryAction: {
        flex: 1,
        borderRadius: radius.lg,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    scheduleCard: {
        padding: spacing.md,
        gap: spacing.md,
        borderRadius: radius.lg,
    },
    scheduleRow: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    dateBox: {
        width: 52,
        height: 52,
        borderRadius: radius.lg,
        backgroundColor: SKY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateBoxText: {
        color: BLUE_DARK,
    },
    confirmedChip: {
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: AMBER_SOFT,
    },
    confirmedChipText: {
        color: AMBER_TEXT,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    summaryCard: {
        flex: 1,
        minHeight: 112,
        borderRadius: radius.lg,
        padding: spacing.md,
        justifyContent: 'space-between',
    },
    quickGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    quickAction: {
        flex: 1,
        minHeight: 82,
        borderRadius: radius.lg,
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: LINE,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    quickIcon: {
        width: 34,
        height: 34,
        borderRadius: radius.lg,
        backgroundColor: SKY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertList: {
        gap: spacing.sm,
    },
    alertRow: {
        minHeight: 64,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: LINE,
        backgroundColor: SURFACE,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    alertIcon: {
        width: 36,
        height: 36,
        borderRadius: radius.lg,
        backgroundColor: AMBER_SOFT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flex: {
        flex: 1,
        minWidth: 0,
    },
    darkText: {
        color: INK,
    },
});

export default EmployeeAttendanceHome;
