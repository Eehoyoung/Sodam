import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {RouteProp, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {radius, spacing} from '../../../theme/tokens';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import storeService, {StoreEmployeeDto} from '../../store/services/storeService';
import {
    confirmStoreWeekShifts,
    createShift,
    deleteShift,
    fetchStoreShifts,
    isOvernight,
    shiftDurationHours,
    shortTime,
    thisWeekRange,
    updateShift,
    WorkShift,
} from '../services/shiftService';
import WeeklyShiftBoard from '../components/WeeklyShiftBoard';

type StoreScheduleRouteProp = RouteProp<HomeStackParamList, 'StoreSchedule'>;
type StoreScheduleNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'StoreSchedule'>;

interface Props {
    route: StoreScheduleRouteProp;
    navigation: StoreScheduleNavigationProp;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function parseIsoDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDays(iso: string, days: number): string {
    const date = parseIsoDate(iso);
    date.setDate(date.getDate() + days);
    return toIsoDate(date);
}

function formatDate(iso: string): string {
    const date = parseIsoDate(iso);
    return `${date.getMonth() + 1}/${date.getDate()} (${WEEKDAYS[date.getDay()]})`;
}

function shiftHours(shift: WorkShift): number {
    // 야간(종료<=시작) 근무는 익일로 보고 랩어라운드 계산. (서비스 헬퍼 재사용)
    return shiftDurationHours(shift.startTime, shift.endTime);
}

export default function StoreScheduleScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();
    const [weekRange] = useState(() => thisWeekRange());

    const [employees, setEmployees] = useState<StoreEmployeeDto[]>([]);
    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [shiftDate, setShiftDate] = useState(weekRange.from);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [memo, setMemo] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [copying, setCopying] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

    // 보드(드래그)용 월~일 7일 ISO 배열.
    const weekDates = useMemo(() => {
        return Array.from({length: 7}, (_, i) => addDays(weekRange.from, i));
    }, [weekRange.from]);

    const employeeNameById = useMemo(() => {
        return employees.reduce<Record<number, string>>((acc, emp) => {
            acc[emp.id] = emp.name;
            return acc;
        }, {});
    }, [employees]);

    const sortedShifts = useMemo(() => {
        return [...shifts].sort((a, b) =>
            `${a.shiftDate}${shortTime(a.startTime)}`.localeCompare(`${b.shiftDate}${shortTime(b.startTime)}`),
        );
    }, [shifts]);

    const summary = useMemo(() => {
        const employeeIds = new Set(shifts.map(item => item.employeeId));
        const totalHours = shifts.reduce((sum, item) => sum + shiftHours(item), 0);
        return {
            shiftCount: shifts.length,
            employeeCount: employeeIds.size,
            totalHours,
        };
    }, [shifts]);

    const shiftsByDate = useMemo(() => {
        return sortedShifts.reduce<Record<string, WorkShift[]>>((acc, item) => {
            acc[item.shiftDate] = acc[item.shiftDate] ? [...acc[item.shiftDate], item] : [item];
            return acc;
        }, {});
    }, [sortedShifts]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [employeeList, shiftList] = await Promise.all([
                storeService.getStoreEmployees(storeId),
                fetchStoreShifts(storeId, weekRange.from, weekRange.to),
            ]);
            setEmployees(employeeList);
            setShifts(shiftList);
            setSelectedEmployeeId(prev => prev ?? employeeList[0]?.id ?? null);
        } catch (err: any) {
            setLoadError(err?.message || '스케줄 정보를 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [storeId, weekRange.from, weekRange.to]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const validate = () => {
        if (!selectedEmployeeId) {
            return '직원을 선택해 주세요.';
        }
        if (!DATE_RE.test(shiftDate)) {
            return '날짜는 YYYY-MM-DD 형식으로 입력해 주세요.';
        }
        if (shiftDate < weekRange.from || shiftDate > weekRange.to) {
            return '이번 주 범위 안의 날짜를 입력해 주세요.';
        }
        if (!TIME_RE.test(startTime)) {
            return '시작 시간은 HH:MM 형식으로 입력해 주세요.';
        }
        if (!TIME_RE.test(endTime)) {
            return '종료 시간은 HH:MM 형식으로 입력해 주세요.';
        }
        if (endTime === startTime) {
            return '시작 시간과 종료 시간이 같을 수 없어요.';
        }
        // 종료 < 시작이면 야간 근무(익일 종료)로 허용 — 막지 않는다.
        return null;
    };

    const resetForm = () => {
        setEditingShiftId(null);
        setShiftDate(weekRange.from);
        setStartTime('09:00');
        setEndTime('18:00');
        setMemo('');
        setError(null);
    };

    const startEdit = (shift: WorkShift) => {
        setEditingShiftId(shift.id);
        setSelectedEmployeeId(shift.employeeId);
        setShiftDate(shift.shiftDate);
        setStartTime(shortTime(shift.startTime));
        setEndTime(shortTime(shift.endTime));
        setMemo(shift.memo ?? '');
        setError(null);
    };

    const submitShift = async () => {
        const message = validate();
        if (message) {
            setError(message);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (editingShiftId) {
                await updateShift(storeId, editingShiftId, {
                    shiftDate,
                    startTime,
                    endTime,
                    memo: memo.trim() || undefined,
                });
                AppToast.success('근무를 수정했어요. 다시 확정·알림을 보내주세요.');
            } else {
                await createShift(storeId, {
                    employeeId: selectedEmployeeId as number,
                    shiftDate,
                    startTime,
                    endTime,
                    memo: memo.trim() || undefined,
                });
                AppToast.success('근무가 추가됐어요.');
            }
            resetForm();
            await load();
        } catch {
            setError(editingShiftId
                ? '근무 수정에 실패했어요. 잠시 후 다시 시도해 주세요.'
                : '근무 추가에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    const removeShift = async () => {
        if (!editingShiftId) {
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await deleteShift(storeId, editingShiftId);
            AppToast.success('근무를 삭제했어요.');
            resetForm();
            await load();
        } catch {
            setError('근무 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    // 드래그앤드롭: 보드에서 다른 요일로 끌면 날짜만 바꿔 저장(시각·메모 유지).
    const moveShift = async (shift: WorkShift, newDate: string) => {
        if (newDate === shift.shiftDate) {
            return;
        }
        // 낙관적 갱신 — 끌어놓은 즉시 새 요일에 반영, 실패 시 롤백.
        const prev = shifts;
        setShifts(curr => curr.map(s => (s.id === shift.id ? {...s, shiftDate: newDate} : s)));
        try {
            await updateShift(storeId, shift.id, {
                shiftDate: newDate,
                startTime: shortTime(shift.startTime),
                endTime: shortTime(shift.endTime),
                memo: shift.memo ?? undefined,
            });
            AppToast.success('근무 요일을 옮겼어요. 다시 확정·알림을 보내주세요.');
            await load();
        } catch {
            setShifts(prev);
            AppToast.error('요일 이동에 실패했어요.');
        }
    };

    const copyLastWeek = async () => {
        setCopying(true);
        setError(null);
        try {
            const previousFrom = addDays(weekRange.from, -7);
            const previousTo = addDays(weekRange.to, -7);
            const lastWeekShifts = await fetchStoreShifts(storeId, previousFrom, previousTo);
            if (lastWeekShifts.length === 0) {
                AppToast.show('지난주에 복사할 근무가 없어요.');
                return;
            }
            // 중복 복사 방지 — 이미 이번 주에 같은 근무(직원+날짜+시작시간)가 있으면 건너뛴다.
            // (지난주 복사를 두 번 눌러도 동일 근무가 중복 생성되지 않게.)
            const existingKeys = new Set(
                shifts.map(s => `${s.employeeId}|${s.shiftDate}|${shortTime(s.startTime)}`),
            );
            const toCreate = lastWeekShifts.filter(item => {
                const key = `${item.employeeId}|${addDays(item.shiftDate, 7)}|${shortTime(item.startTime)}`;
                return !existingKeys.has(key);
            });
            if (toCreate.length === 0) {
                AppToast.show('이미 이번 주에 복사돼 있어요.');
                return;
            }
            await Promise.all(toCreate.map(item => createShift(storeId, {
                employeeId: item.employeeId,
                shiftDate: addDays(item.shiftDate, 7),
                startTime: shortTime(item.startTime),
                endTime: shortTime(item.endTime),
                memo: item.memo ?? undefined,
            })));
            AppToast.success(`지난주 스케줄 ${toCreate.length}건을 복사했어요.`);
            await load();
        } catch {
            AppToast.error('지난주 복사에 실패했어요.');
        } finally {
            setCopying(false);
        }
    };

    const confirmAndNotify = async () => {
        setConfirming(true);
        try {
            const result = await confirmStoreWeekShifts(storeId, {
                from: weekRange.from,
                to: weekRange.to,
            });
            AppToast.success(
                `스케줄 ${result.confirmedCount}건을 확정하고 ${result.notifiedCount}명에게 알림을 보냈어요.`,
            );
        } catch (err: any) {
            if (err?.response?.status === 404 || err?.response?.status === 405) {
                AppToast.error('확정 알림 API가 아직 연결되지 않았어요.');
            } else {
                AppToast.error('스케줄 확정에 실패했어요.');
            }
        } finally {
            setConfirming(false);
        }
    };

    const renderHeader = (
        <AppHeader title="스케줄" onBack={() => navigation.goBack()} />
    );

    if (loading) {
        return (
            <ScreenContainer header={renderHeader}>
                <LoadingState title="스케줄 불러오는 중" description="직원과 이번 주 근무를 확인하고 있어요." />
            </ScreenContainer>
        );
    }

    if (loadError) {
        return (
            <ScreenContainer header={renderHeader}>
                <ErrorState
                    title="불러오지 못했어요"
                    description={loadError}
                    primary={{label: '다시 시도', onPress: load}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={renderHeader}>
            <View style={styles.titleBlock}>
                <AppText variant="headingSm">이번 주 스케줄</AppText>
                <AppText variant="bodyMd" tone="secondary">
                    {weekRange.from} ~ {weekRange.to}
                </AppText>
            </View>

            <View style={styles.summaryRow}>
                <SummaryItem label="근무" value={`${summary.shiftCount}건`} />
                <SummaryItem label="직원" value={`${summary.employeeCount}명`} />
                <SummaryItem label="총 시간" value={`${summary.totalHours.toFixed(1)}h`} />
            </View>

            <View style={styles.actionRow}>
                <AppButton
                    label="지난주 복사"
                    variant="secondary"
                    size="md"
                    fullWidth={false}
                    loading={copying}
                    disabled={copying}
                    leftIcon={<Ionicons name="copy-outline" size={18} color={c.brandSecondary} />}
                    style={styles.actionButton}
                    onPress={copyLastWeek}
                />
                <AppButton
                    label="확정하고 알림"
                    size="md"
                    fullWidth={false}
                    loading={confirming}
                    disabled={confirming || shifts.length === 0}
                    leftIcon={<Ionicons name="notifications-outline" size={18} color={c.textInverse} />}
                    style={styles.actionButton}
                    onPress={confirmAndNotify}
                />
            </View>

            <AppCard variant="plain" style={styles.formCard}>
                <View style={styles.cardTitleRow}>
                    <Ionicons
                        name={editingShiftId ? 'create-outline' : 'add-circle-outline'}
                        size={22}
                        color={c.brandPrimary}
                    />
                    <AppText variant="titleMd">{editingShiftId ? '근무 수정' : '근무 추가'}</AppText>
                </View>

                {employees.length === 0 ? (
                    <EmptyState
                        glyph={<Ionicons name="people-outline" size={36} color={c.textTertiary} />}
                        markColor={c.surfaceMuted}
                        title="등록된 직원이 없어요"
                        description="직원을 먼저 초대하면 스케줄을 작성할 수 있어요."
                    />
                ) : (
                    <>
                        <AppText variant="caption" tone="secondary" style={styles.label}>
                            직원{editingShiftId ? ' (수정 시 변경 불가 — 직원을 바꾸려면 삭제 후 재등록)' : ''}
                        </AppText>
                        <View style={styles.employeeChips}>
                            {employees.map(emp => {
                                const selected = emp.id === selectedEmployeeId;
                                const locked = editingShiftId !== null && !selected;
                                return (
                                    <Pressable
                                        key={emp.id}
                                        accessibilityRole="button"
                                        accessibilityState={{selected, disabled: locked}}
                                        disabled={editingShiftId !== null}
                                        onPress={() => setSelectedEmployeeId(emp.id)}
                                        style={[
                                            styles.employeeChip,
                                            {borderColor: selected ? c.brandPrimary : c.border, backgroundColor: selected ? c.brandPrimarySoft : c.background},
                                            locked && styles.employeeChipLocked,
                                        ]}>
                                        <AppText variant="caption" tone={selected ? 'brand' : 'secondary'} numberOfLines={1}>
                                            {emp.name}
                                        </AppText>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <AppInput
                            label="날짜"
                            value={shiftDate}
                            onChangeText={setShiftDate}
                            placeholder="YYYY-MM-DD"
                            keyboardType="numbers-and-punctuation"
                        />

                        <View style={styles.timeRow}>
                            <AppInput
                                label="시작"
                                value={startTime}
                                onChangeText={setStartTime}
                                placeholder="HH:MM"
                                keyboardType="numbers-and-punctuation"
                                containerStyle={styles.flex}
                            />
                            <AppInput
                                label="종료"
                                value={endTime}
                                onChangeText={setEndTime}
                                placeholder="HH:MM"
                                keyboardType="numbers-and-punctuation"
                                containerStyle={styles.flex}
                            />
                        </View>

                        <AppInput
                            label="메모"
                            value={memo}
                            onChangeText={setMemo}
                            placeholder="마감, 교육, 요청사항 등"
                            multiline
                            multilineMinHeight={76}
                        />

                        {TIME_RE.test(startTime) && TIME_RE.test(endTime) && isOvernight(startTime, endTime) && startTime !== endTime ? (
                            <View style={styles.overnightHint}>
                                <Ionicons name="moon-outline" size={14} color={c.info} />
                                <AppText variant="caption" tone="secondary">
                                    야간 근무로 등록돼요 — 종료 {endTime}는 다음 날이에요.
                                </AppText>
                            </View>
                        ) : null}

                        {error ? <AppText variant="caption" tone="error">{error}</AppText> : null}

                        <AppButton
                            label={editingShiftId ? '수정 저장' : '근무 추가'}
                            loading={saving}
                            disabled={saving}
                            leftIcon={
                                <Ionicons
                                    name={editingShiftId ? 'checkmark-outline' : 'add-outline'}
                                    size={20}
                                    color={c.textInverse}
                                />
                            }
                            onPress={submitShift}
                        />
                        {editingShiftId ? (
                            <View style={styles.editActionRow}>
                                <AppButton
                                    label="취소"
                                    variant="secondary"
                                    fullWidth={false}
                                    disabled={saving}
                                    style={styles.flex}
                                    onPress={resetForm}
                                />
                                <AppButton
                                    label="삭제"
                                    variant="destructive"
                                    fullWidth={false}
                                    disabled={saving}
                                    style={styles.flex}
                                    leftIcon={<Ionicons name="trash-outline" size={18} color={c.textInverse} />}
                                    onPress={removeShift}
                                />
                            </View>
                        ) : null}
                    </>
                )}
            </AppCard>

            <View style={styles.sectionTitleRow}>
                <AppText variant="titleMd">주간 {viewMode === 'board' ? '보드' : '목록'}</AppText>
                <View style={styles.viewToggle}>
                    {(['list', 'board'] as const).map(mode => {
                        const active = viewMode === mode;
                        return (
                            <Pressable
                                key={mode}
                                accessibilityRole="button"
                                accessibilityState={{selected: active}}
                                onPress={() => setViewMode(mode)}
                                style={[
                                    styles.viewToggleBtn,
                                    {backgroundColor: active ? c.brandPrimary : c.background, borderColor: active ? c.brandPrimary : c.border},
                                ]}>
                                <Ionicons
                                    name={mode === 'list' ? 'list-outline' : 'grid-outline'}
                                    size={14}
                                    color={active ? c.textInverse : c.textTertiary}
                                />
                                <AppText variant="caption" tone={active ? 'inverse' : 'tertiary'}>
                                    {mode === 'list' ? '목록' : '보드'}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {sortedShifts.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="calendar-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="이번 주 스케줄이 비어 있어요"
                    description="근무를 추가하거나 지난주 스케줄을 복사해 시작해 보세요."
                />
            ) : viewMode === 'board' ? (
                <View>
                    <View style={styles.boardHint}>
                        <Ionicons name="hand-left-outline" size={14} color={c.textTertiary} />
                        <AppText variant="caption" tone="tertiary">
                            근무를 길게 눌러 다른 요일로 끌면 일정이 옮겨져요. 탭하면 수정.
                        </AppText>
                    </View>
                    <WeeklyShiftBoard
                        weekDates={weekDates}
                        shifts={shifts}
                        employeeNameById={employeeNameById}
                        onMoveShift={moveShift}
                        onPressShift={startEdit}
                        disabled={saving}
                    />
                </View>
            ) : (
                <View style={styles.scheduleList}>
                    {Object.entries(shiftsByDate).map(([date, dateShifts]) => (
                        <View key={date} style={styles.dayGroup}>
                            <AppText variant="caption" tone="secondary" style={styles.dayLabel}>
                                {formatDate(date)}
                            </AppText>
                            {dateShifts.map(item => {
                                const overnight = item.crossesMidnight ?? isOvernight(item.startTime, item.endTime);
                                const editing = item.id === editingShiftId;
                                return (
                                    <Pressable key={item.id} onPress={() => startEdit(item)} accessibilityRole="button">
                                        <AppCard
                                            variant="flat"
                                            style={[styles.shiftCard, editing && [styles.shiftCardEditing, {borderColor: c.brandPrimary}]]}>
                                            <View style={styles.shiftRow}>
                                                <View style={[styles.shiftIcon, {backgroundColor: c.surfaceSky}]}>
                                                    <Ionicons name="time-outline" size={18} color={c.info} />
                                                </View>
                                                <View style={styles.flex}>
                                                    <AppText variant="titleMd" numberOfLines={1}>
                                                        {employeeNameById[item.employeeId] ?? '직원'}
                                                    </AppText>
                                                    <AppText variant="caption" tone="secondary">
                                                        {shortTime(item.startTime)} ~ {shortTime(item.endTime)}
                                                        {overnight ? ' (익일)' : ''}
                                                        {item.memo ? ` · ${item.memo}` : ''}
                                                    </AppText>
                                                </View>
                                                <Ionicons name="create-outline" size={18} color={c.textTertiary} />
                                            </View>
                                        </AppCard>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
}

function SummaryItem({label, value}: {label: string; value: string}) {
    return (
        <AppCard variant="warm" style={styles.summaryItem}>
            <AppText variant="caption" tone="secondary" center>{label}</AppText>
            <AppText variant="headingSm" center numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
        </AppCard>
    );
}

const styles = StyleSheet.create({
    titleBlock: {
        gap: spacing.xs,
        marginBottom: spacing.lg,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    summaryItem: {
        flex: 1,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.sm,
        gap: spacing.xs,
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    actionButton: {
        flex: 1,
    },
    formCard: {
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    label: {
        marginTop: spacing.xs,
    },
    employeeChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    employeeChip: {
        minHeight: 36,
        maxWidth: '48%',
        borderRadius: radius.pill,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    flex: {
        flex: 1,
        minWidth: 0,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    viewToggle: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    viewToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    boardHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    overnightHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    editActionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    employeeChipLocked: {
        opacity: 0.4,
    },
    scheduleList: {
        gap: spacing.lg,
    },
    dayGroup: {
        gap: spacing.sm,
    },
    dayLabel: {
        marginLeft: spacing.xs,
    },
    shiftCard: {
        paddingVertical: spacing.md,
    },
    shiftCardEditing: {
        borderWidth: 1,
    },
    shiftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    shiftIcon: {
        width: 36,
        height: 36,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
