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
    fetchStoreShifts,
    shortTime,
    thisWeekRange,
    WorkShift,
} from '../services/shiftService';

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

function minutesOf(time: string): number {
    const [h, m] = shortTime(time).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) {
        return 0;
    }
    return h * 60 + m;
}

function shiftHours(shift: WorkShift): number {
    return Math.max(0, minutesOf(shift.endTime) - minutesOf(shift.startTime)) / 60;
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
        if (endTime <= startTime) {
            return '종료 시간은 시작 시간보다 늦어야 해요.';
        }
        return null;
    };

    const addShift = async () => {
        const message = validate();
        if (message) {
            setError(message);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await createShift(storeId, {
                employeeId: selectedEmployeeId as number,
                shiftDate,
                startTime,
                endTime,
                memo: memo.trim() || undefined,
            });
            setMemo('');
            AppToast.success('근무가 추가됐어요.');
            await load();
        } catch {
            setError('근무 추가에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSaving(false);
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
                    <Ionicons name="add-circle-outline" size={22} color={c.brandPrimary} />
                    <AppText variant="titleMd">근무 추가</AppText>
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
                        <AppText variant="caption" tone="secondary" style={styles.label}>직원</AppText>
                        <View style={styles.employeeChips}>
                            {employees.map(emp => {
                                const selected = emp.id === selectedEmployeeId;
                                return (
                                    <Pressable
                                        key={emp.id}
                                        accessibilityRole="button"
                                        accessibilityState={{selected}}
                                        onPress={() => setSelectedEmployeeId(emp.id)}
                                        style={[
                                            styles.employeeChip,
                                            {borderColor: selected ? c.brandPrimary : c.border, backgroundColor: selected ? c.brandPrimarySoft : c.background},
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

                        {error ? <AppText variant="caption" tone="error">{error}</AppText> : null}

                        <AppButton
                            label="근무 추가"
                            loading={saving}
                            disabled={saving}
                            leftIcon={<Ionicons name="add-outline" size={20} color={c.textInverse} />}
                            onPress={addShift}
                        />
                    </>
                )}
            </AppCard>

            <View style={styles.sectionTitleRow}>
                <AppText variant="titleMd">주간 목록</AppText>
                <AppText variant="caption" tone="secondary">{sortedShifts.length}건</AppText>
            </View>

            {sortedShifts.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="calendar-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="이번 주 스케줄이 비어 있어요"
                    description="근무를 추가하거나 지난주 스케줄을 복사해 시작해 보세요."
                />
            ) : (
                <View style={styles.scheduleList}>
                    {Object.entries(shiftsByDate).map(([date, dateShifts]) => (
                        <View key={date} style={styles.dayGroup}>
                            <AppText variant="caption" tone="secondary" style={styles.dayLabel}>
                                {formatDate(date)}
                            </AppText>
                            {dateShifts.map(item => (
                                <AppCard key={item.id} variant="flat" style={styles.shiftCard}>
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
                                                {item.memo ? ` · ${item.memo}` : ''}
                                            </AppText>
                                        </View>
                                    </View>
                                </AppCard>
                            ))}
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
