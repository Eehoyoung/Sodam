import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Card from '../../../common/components/data-display/Card';
import Button from '../../../common/components/form/Button';
import api from '../../../common/utils/api';
import {useAuth} from '../../../contexts/AuthContext';

interface AttendanceRecord {
    id: number;
    checkInTime?: string;
    checkOutTime?: string;
    workingMinutes?: number;
    appliedHourlyWage?: number;
    storeName?: string;
}

type DayStatus = 'CHECKED_IN' | 'WORKING' | 'ABSENT' | 'MISSING' | 'OFF';

/**
 * 직원 근무 캘린더 (PRD_EMPLOYEE E-101).
 *
 * 월간 그리드 + 일자 점 표시 + 선택일 상세 카드.
 */
const AttendanceCalendarScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const {user} = useAuth();
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [month, setMonth] = useState(() => new Date().getMonth() + 1);
    const [items, setItems] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                const res = await api.get<any[]>(
                    `/api/attendance/employee/${user.id}/monthly?year=${year}&month=${month}`,
                );
                if (mounted) setItems((res.data as any[]) ?? []);
            } catch (_) {
                if (mounted) setItems([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [user?.id, year, month]);

    const dayMap = useMemo(() => {
        const map = new Map<number, AttendanceRecord>();
        items.forEach(it => {
            if (!it.checkInTime) return;
            const d = new Date(it.checkInTime);
            map.set(d.getDate(), it);
        });
        return map;
    }, [items]);

    const days = useMemo(() => buildMonthGrid(year, month), [year, month]);
    const selectedRecord = selectedDay ? dayMap.get(selectedDay) : null;

    const prevMonth = () => {
        if (month === 1) {
            setYear(y => y - 1);
            setMonth(12);
        } else {
            setMonth(m => m - 1);
        }
        setSelectedDay(null);
    };
    const nextMonth = () => {
        if (month === 12) {
            setYear(y => y + 1);
            setMonth(1);
        } else {
            setMonth(m => m + 1);
        }
        setSelectedDay(null);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
                        <Text style={styles.navArrow}>◀</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>
                        {year}년 {month}월
                    </Text>
                    <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
                        <Text style={styles.navArrow}>▶</Text>
                    </Pressable>
                </View>

                <View style={styles.weekRow}>
                    {['일', '월', '화', '수', '목', '금', '토'].map(w => (
                        <Text key={w} style={styles.weekDay}>
                            {w}
                        </Text>
                    ))}
                </View>

                <View style={styles.grid}>
                    {days.map((d, idx) => (
                        <DayCell
                            key={idx}
                            day={d}
                            record={d ? dayMap.get(d) : undefined}
                            selected={selectedDay === d}
                            onPress={() => d && setSelectedDay(d)}
                        />
                    ))}
                </View>

                <View style={styles.legend}>
                    <LegendDot color={tokens.colors.attendanceCheckedIn} label="출근" />
                    <LegendDot color={tokens.colors.warning} label="근무중" />
                    <LegendDot color={tokens.colors.error} label="결근" />
                    <LegendDot color={tokens.colors.textTertiary} label="휴무" />
                </View>

                {loading && <Text style={styles.empty}>불러오는 중…</Text>}

                {selectedDay && selectedRecord ? (
                    <Card bordered style={styles.detailCard}>
                        <Text style={styles.detailDate}>
                            {month}월 {selectedDay}일
                        </Text>
                        <Text style={styles.detailStore}>{selectedRecord.storeName ?? ''}</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>출근 / 퇴근</Text>
                            <Text style={styles.detailValue}>
                                {shortTime(selectedRecord.checkInTime)} ~ {selectedRecord.checkOutTime ? shortTime(selectedRecord.checkOutTime) : '근무중'}
                            </Text>
                        </View>
                        {selectedRecord.workingMinutes != null && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>근무 시간</Text>
                                <Text style={styles.detailValue}>
                                    {Math.floor(selectedRecord.workingMinutes / 60)}시간{' '}
                                    {selectedRecord.workingMinutes % 60}분
                                </Text>
                            </View>
                        )}
                        {selectedRecord.appliedHourlyWage && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>적용 시급</Text>
                                <Text style={styles.detailValue}>
                                    {selectedRecord.appliedHourlyWage.toLocaleString('ko-KR')}원
                                </Text>
                            </View>
                        )}
                        <View style={styles.detailActions}>
                            <Button
                                title="이상 있어요"
                                variant="outline"
                                size="sm"
                                onPress={() =>
                                    navigation.navigate('AttendanceCorrectionRequest', {
                                        attendanceId: selectedRecord.id,
                                        date: `${year}-${pad(month)}-${pad(selectedDay)}`,
                                        storeName: selectedRecord.storeName,
                                        currentCheckIn: selectedRecord.checkInTime,
                                        currentCheckOut: selectedRecord.checkOutTime,
                                    })
                                }
                            />
                        </View>
                    </Card>
                ) : selectedDay && !loading ? (
                    <Card bordered style={styles.detailCard}>
                        <Text style={styles.empty}>이 날의 출근 기록이 없어요.</Text>
                    </Card>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
};

const DayCell: React.FC<{
    day: number | null;
    record?: AttendanceRecord;
    selected: boolean;
    onPress: () => void;
}> = ({day, record, selected, onPress}) => {
    const status: DayStatus | null = !day
        ? null
        : record?.checkOutTime
            ? 'CHECKED_IN'
            : record?.checkInTime
                ? 'WORKING'
                : null;

    return (
        <Pressable
            onPress={day ? onPress : undefined}
            style={[styles.dayCell, selected && styles.dayCellSelected]}
            disabled={!day}
        >
            <Text style={[styles.dayNumber, !day && styles.dayEmpty]}>{day ?? ''}</Text>
            {status === 'CHECKED_IN' && <View style={[styles.dot, {backgroundColor: tokens.colors.attendanceCheckedIn}]} />}
            {status === 'WORKING' && <View style={[styles.dot, {backgroundColor: tokens.colors.warning}]} />}
        </Pressable>
    );
};

const LegendDot: React.FC<{color: string; label: string}> = ({color, label}) => (
    <View style={styles.legendItem}>
        <View style={[styles.legendDotCircle, {backgroundColor: color}]} />
        <Text style={styles.legendText}>{label}</Text>
    </View>
);

function buildMonthGrid(year: number, month: number): Array<number | null> {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}
function shortTime(iso?: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n: number): string {
    return String(n).padStart(2, '0');
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    scrollContent: {padding: tokens.spacing.lg, paddingBottom: tokens.spacing.huge},
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: tokens.spacing.md,
    },
    navBtn: {
        padding: tokens.spacing.sm,
        minWidth: 44,
        alignItems: 'center',
    },
    navArrow: {color: tokens.colors.brandPrimary, fontSize: 20, fontWeight: '700'},
    headerTitle: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        letterSpacing: -0.3,
    },
    weekRow: {flexDirection: 'row', justifyContent: 'space-around', paddingVertical: tokens.spacing.sm},
    weekDay: {
        flex: 1,
        textAlign: 'center',
        color: tokens.colors.textSecondary,
        fontSize: tokens.typography.sizes.xs,
        fontWeight: tokens.typography.weights.semibold,
    },
    grid: {flexDirection: 'row', flexWrap: 'wrap'},
    dayCell: {
        width: `${100 / 7}%`,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: tokens.radius.md,
    },
    dayCellSelected: {
        borderWidth: 1.5,
        borderColor: tokens.colors.brandPrimary,
    },
    dayNumber: {fontSize: tokens.typography.sizes.sm, color: tokens.colors.textPrimary},
    dayEmpty: {color: 'transparent'},
    dot: {width: 6, height: 6, borderRadius: 3, marginTop: 2},
    legend: {flexDirection: 'row', justifyContent: 'center', gap: tokens.spacing.md, paddingVertical: tokens.spacing.md},
    legendItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
    legendDotCircle: {width: 8, height: 8, borderRadius: 4},
    legendText: {color: tokens.colors.textTertiary, fontSize: tokens.typography.sizes.xs},
    empty: {textAlign: 'center', color: tokens.colors.textTertiary, paddingVertical: tokens.spacing.md},
    detailCard: {marginTop: tokens.spacing.md},
    detailDate: {fontSize: tokens.typography.sizes.lg, fontWeight: '700', color: tokens.colors.textPrimary},
    detailStore: {fontSize: tokens.typography.sizes.sm, color: tokens.colors.textSecondary, marginBottom: tokens.spacing.sm},
    detailRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4},
    detailLabel: {color: tokens.colors.textSecondary, fontSize: tokens.typography.sizes.sm},
    detailValue: {color: tokens.colors.textPrimary, fontSize: tokens.typography.sizes.sm, fontWeight: '500'},
    detailActions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: tokens.spacing.md, gap: tokens.spacing.sm},
});

export default AttendanceCalendarScreen;
