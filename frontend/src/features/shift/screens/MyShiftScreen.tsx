/**
 * 직원 내 근무 일정 화면 (B10 리디자인).
 *
 * - 월 달력으로 확정된 내 근무 점 표시
 * - 날짜 탭 → 해당 날 근무 상세
 * - 주 이동 없음 (캘린더 월 이동으로 대체)
 * - 확정된(confirmed_at IS NOT NULL) 시프트만 표시
 */
import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import AppCalendar from '../../../common/components/AppCalendar';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {COLORS} from '../../../common/components/logo/Colors';
import {
    currentYearMonth,
    fetchMyShifts,
    monthRange,
    shortTime,
    shiftDurationHours,
    todayIso,
    WorkShift,
} from '../services/shiftService';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateFull(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) {return iso;}
    const wd = WEEKDAY[new Date(y, m - 1, d).getDay()];
    return `${m}월 ${d}일 (${wd})`;
}

export default function MyShiftScreen() {
    const navigation = useNavigation();
    const c = useThemeColors();

    const [month, setMonth] = useState(currentYearMonth);
    const [selectedDate, setSelectedDate] = useState<string | null>(todayIso);
    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadMonth = useCallback(async (ym: string) => {
        setLoading(true);
        setError(false);
        try {
            const {from, to} = monthRange(ym);
            const list = await fetchMyShifts(from, to);
            setShifts(list);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadMonth(month);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [loadMonth]),
    );

    const handleMonthChange = (ym: string) => {
        setMonth(ym);
        loadMonth(ym);
    };

    // 캘린더 마크: 날짜별 근무 점
    const calendarMarks = useMemo(() => {
        const marks: Record<string, {dots: string[]}> = {};
        shifts.forEach(s => {
            if (!marks[s.shiftDate]) {marks[s.shiftDate] = {dots: []};}
            if (marks[s.shiftDate].dots.length < 3) {
                marks[s.shiftDate].dots.push(COLORS.SODAM_ORANGE);
            }
        });
        return marks;
    }, [shifts]);

    // 선택 날 근무
    const dayShifts = useMemo(() => {
        if (!selectedDate) {return [];}
        return shifts
            .filter(s => s.shiftDate === selectedDate)
            .sort((a, b) => shortTime(a.startTime).localeCompare(shortTime(b.startTime)));
    }, [shifts, selectedDate]);

    // 이번 달 총 근무 시간
    const monthTotalHours = useMemo(
        () => shifts.reduce((sum, s) => sum + shiftDurationHours(s.startTime, s.endTime), 0),
        [shifts],
    );

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="내 근무 일정" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="근무 일정을 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: () => loadMonth(month)}}
                />
            ) : (
                <View style={styles.container}>
                    {/* 이번 달 요약 */}
                    <View style={[styles.summaryBar, {backgroundColor: c.surfaceMuted}]}>
                        <View style={styles.summaryItem}>
                            <AppText variant="caption" tone="secondary">이번 달 근무</AppText>
                            <AppText variant="titleMd" weight="700">{shifts.length}건</AppText>
                        </View>
                        <View style={[styles.divider, {backgroundColor: c.border}]} />
                        <View style={styles.summaryItem}>
                            <AppText variant="caption" tone="secondary">총 근무 시간</AppText>
                            <AppText variant="titleMd" weight="700">
                                {monthTotalHours.toFixed(1)}h
                            </AppText>
                        </View>
                    </View>

                    {/* 월 캘린더 */}
                    <AppCalendar
                        month={month}
                        onMonthChange={handleMonthChange}
                        markedDates={calendarMarks}
                        selectedDate={selectedDate}
                        onDayPress={setSelectedDate}
                    />

                    {/* 선택 날 근무 */}
                    {selectedDate && (
                        <View style={styles.daySection}>
                            <View style={styles.daySectionHeader}>
                                <Ionicons name="calendar-outline" size={16} color={c.brandPrimary} />
                                <AppText variant="titleMd" weight="700">
                                    {formatDateFull(selectedDate)}
                                </AppText>
                            </View>

                            {dayShifts.length === 0 ? (
                                <View style={[styles.emptyDay, {borderColor: c.border}]}>
                                    <AppText variant="caption" tone="tertiary" center>
                                        이 날 등록된 근무가 없어요
                                    </AppText>
                                </View>
                            ) : (
                                dayShifts.map(it => {
                                    const overnight = it.crossesMidnight ?? (
                                        shortTime(it.endTime) <= shortTime(it.startTime)
                                    );
                                    const hours = shiftDurationHours(it.startTime, it.endTime);
                                    return (
                                        <AppCard key={it.id} variant="flat" style={styles.shiftCard}>
                                            <View style={styles.shiftRow}>
                                                <View
                                                    style={[
                                                        styles.iconWrap,
                                                        {backgroundColor: c.brandPrimarySoft},
                                                    ]}>
                                                    <Ionicons
                                                        name="time-outline"
                                                        size={20}
                                                        color={c.brandPrimary}
                                                    />
                                                </View>
                                                <View style={styles.flex}>
                                                    <AppText variant="titleMd">
                                                        {shortTime(it.startTime)} ~{' '}
                                                        {shortTime(it.endTime)}
                                                        {overnight ? ' (익일)' : ''}
                                                    </AppText>
                                                    <AppText variant="caption" tone="secondary">
                                                        {hours.toFixed(1)}시간 근무
                                                        {it.memo ? ` · ${it.memo}` : ''}
                                                    </AppText>
                                                </View>
                                            </View>
                                        </AppCard>
                                    );
                                })
                            )}
                        </View>
                    )}

                    {/* 이번 달 전체 목록 (날짜별) */}
                    {shifts.length > 0 && (
                        <View style={styles.monthList}>
                            <AppText variant="caption" tone="secondary" style={styles.sectionTitle}>
                                {month.slice(0, 4)}년 {month.slice(5, 7)}월 전체 근무
                            </AppText>
                            {shifts.map(it => (
                                <AppCard key={it.id} variant="flat" style={styles.listCard}>
                                    <View style={styles.shiftRow}>
                                        <View
                                            style={[
                                                styles.iconWrap,
                                                {backgroundColor: c.surfaceMuted},
                                            ]}>
                                            <Ionicons
                                                name="calendar-outline"
                                                size={18}
                                                color={c.textSecondary}
                                            />
                                        </View>
                                        <View style={styles.flex}>
                                            <AppText variant="titleMd">
                                                {formatDateFull(it.shiftDate)}
                                            </AppText>
                                            <AppText variant="caption" tone="secondary">
                                                {shortTime(it.startTime)} ~ {shortTime(it.endTime)}
                                                {it.memo ? ` · ${it.memo}` : ''}
                                            </AppText>
                                        </View>
                                    </View>
                                </AppCard>
                            ))}
                        </View>
                    )}

                    {shifts.length === 0 && (
                        <EmptyState
                            glyph={<Ionicons name="calendar-outline" size={40} color={c.textTertiary} />}
                            markColor={c.surfaceMuted}
                            title="이번 달 근무 일정이 없어요"
                            description="사장님이 근무를 확정하면 여기서 확인할 수 있어요."
                        />
                    )}
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {gap: spacing.lg},
    summaryBar: {
        flexDirection: 'row',
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    summaryItem: {flex: 1, alignItems: 'center', gap: 2},
    divider: {width: 1, marginVertical: spacing.xs},
    daySection: {gap: spacing.sm},
    daySectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    emptyDay: {
        borderWidth: 1,
        borderRadius: 12,
        borderStyle: 'dashed',
        paddingVertical: spacing.xl,
    },
    shiftCard: {paddingVertical: spacing.md},
    shiftRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flex: {flex: 1},
    monthList: {gap: spacing.sm},
    sectionTitle: {marginBottom: -spacing.xs},
    listCard: {paddingVertical: spacing.sm},
});
