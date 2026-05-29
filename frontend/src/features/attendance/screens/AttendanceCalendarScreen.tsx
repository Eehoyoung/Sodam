import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {spacing, tokens} from '../../../theme/tokens';
import {AppButton, AppCard, AppHeader, AppText, ScreenContainer} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
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

type DayStatus = 'CHECKED_IN' | 'WORKING';

/**
 * 23 AttendanceCalendar — 확정 시안.
 * 월간 그리드(선택일 브랜드 채움) + 점 표시 + 선택일 상세 카드. 조회/이동 로직 보존.
 */
const AttendanceCalendarScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const {user} = useAuth();
    const c = useThemeColors();
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [month, setMonth] = useState(() => new Date().getMonth() + 1);
    const [items, setItems] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!user?.id) {
                return;
            }
            setLoading(true);
            try {
                const res = await api.get<any[]>(
                    `/api/attendance/employee/${user.id}/monthly?year=${year}&month=${month}`,
                );
                if (mounted) {
                    setItems((res.data as any[]) ?? []);
                }
            } catch (_) {
                if (mounted) {
                    setItems([]);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            mounted = false;
        };
    }, [user?.id, year, month]);

    const dayMap = useMemo(() => {
        const map = new Map<number, AttendanceRecord>();
        items.forEach(it => {
            if (!it.checkInTime) {
                return;
            }
            map.set(new Date(it.checkInTime).getDate(), it);
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
        <ScreenContainer scroll header={<AppHeader title="근무 기록" rightText={`${month}월`} onBack={() => navigation.goBack()} />}>
            <View style={styles.headerRow}>
                <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
                    <Text style={[styles.navArrow, {color: c.brandPrimary}]}>◀</Text>
                </Pressable>
                <AppText variant="headingSm">{year}년 {month}월</AppText>
                <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
                    <Text style={[styles.navArrow, {color: c.brandPrimary}]}>▶</Text>
                </Pressable>
            </View>

            <View style={styles.weekRow}>
                {['일', '월', '화', '수', '목', '금', '토'].map(w => (
                    <Text key={w} style={[styles.weekDay, {color: c.textSecondary}]}>{w}</Text>
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
                <LegendDot color={c.attendanceCheckedIn} label="출근" />
                <LegendDot color={c.warning} label="근무중" />
                <LegendDot color={c.textTertiary} label="휴무" />
            </View>

            {loading ? <AppText variant="caption" tone="tertiary" center style={styles.empty}>불러오는 중…</AppText> : null}

            {selectedDay && selectedRecord ? (
                <AppCard variant="flat" style={styles.detailCard}>
                    <AppText variant="titleMd">{month}월 {selectedDay}일</AppText>
                    {selectedRecord.storeName ? (
                        <AppText variant="caption" tone="secondary" style={styles.detailStore}>{selectedRecord.storeName}</AppText>
                    ) : null}
                    <DetailRow
                        label="출근 / 퇴근"
                        value={`${shortTime(selectedRecord.checkInTime)} ~ ${selectedRecord.checkOutTime ? shortTime(selectedRecord.checkOutTime) : '근무중'}`}
                    />
                    {selectedRecord.workingMinutes != null ? (
                        <DetailRow
                            label="근무 시간"
                            value={`${Math.floor(selectedRecord.workingMinutes / 60)}시간 ${selectedRecord.workingMinutes % 60}분`}
                        />
                    ) : null}
                    {selectedRecord.appliedHourlyWage ? (
                        <DetailRow label="적용 시급" value={`${selectedRecord.appliedHourlyWage.toLocaleString('ko-KR')}원`} />
                    ) : null}
                    <AppButton
                        label="정정 요청"
                        variant="outline"
                        size="sm"
                        fullWidth={false}
                        style={styles.detailCta}
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
                </AppCard>
            ) : selectedDay && !loading ? (
                <AppCard variant="flat" style={styles.detailCard}>
                    <AppText variant="caption" tone="tertiary" center>이 날의 출근 기록이 없어요.</AppText>
                </AppCard>
            ) : null}
        </ScreenContainer>
    );
};

const DayCell: React.FC<{
    day: number | null;
    record?: AttendanceRecord;
    selected: boolean;
    onPress: () => void;
}> = ({day, record, selected, onPress}) => {
    const c = useThemeColors();
    const status: DayStatus | null = !day
        ? null
        : record?.checkOutTime
            ? 'CHECKED_IN'
            : record?.checkInTime
                ? 'WORKING'
                : null;

    return (
        <Pressable onPress={day ? onPress : undefined} style={[styles.dayCell, selected && {backgroundColor: c.brandPrimary}]} disabled={!day}>
            <Text style={[styles.dayNumber, {color: selected ? c.textInverse : c.textPrimary, fontWeight: selected ? '800' : '600'}, !day && styles.dayEmpty]}>{day ?? ''}</Text>
            {!selected && status === 'CHECKED_IN' ? <View style={[styles.dot, {backgroundColor: c.attendanceCheckedIn}]} /> : null}
            {!selected && status === 'WORKING' ? <View style={[styles.dot, {backgroundColor: c.warning}]} /> : null}
        </Pressable>
    );
};

const LegendDot: React.FC<{color: string; label: string}> = ({color, label}) => {
    const c = useThemeColors();
    return (
        <View style={styles.legendItem}>
            <View style={[styles.legendDotCircle, {backgroundColor: color}]} />
            <Text style={[styles.legendText, {color: c.textTertiary}]}>{label}</Text>
        </View>
    );
};

const DetailRow: React.FC<{label: string; value: string}> = ({label, value}) => (
    <View style={styles.detailRow}>
        <AppText variant="caption" tone="secondary">{label}</AppText>
        <AppText variant="caption" weight="600">{value}</AppText>
    </View>
);

function buildMonthGrid(year: number, month: number): Array<number | null> {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDay; i++) {
        cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push(d);
    }
    while (cells.length % 7 !== 0) {
        cells.push(null);
    }
    return cells;
}
function shortTime(iso?: string): string {
    if (!iso) {
        return '-';
    }
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n: number): string {
    return String(n).padStart(2, '0');
}

const styles = StyleSheet.create({
    headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm},
    navBtn: {padding: spacing.sm, minWidth: 44, alignItems: 'center'},
    navArrow: {fontSize: 20, fontWeight: '700'},
    weekRow: {flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm},
    weekDay: {flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600'},
    grid: {flexDirection: 'row', flexWrap: 'wrap'},
    dayCell: {width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.md},
    dayNumber: {fontSize: 13},
    dayEmpty: {color: 'transparent'},
    dot: {width: 6, height: 6, borderRadius: 3, marginTop: 2},
    legend: {flexDirection: 'row', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.md},
    legendItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
    legendDotCircle: {width: 8, height: 8, borderRadius: 4},
    legendText: {fontSize: 12},
    empty: {paddingVertical: spacing.md},
    detailCard: {marginTop: spacing.md},
    detailStore: {marginTop: 2, marginBottom: spacing.sm},
    detailRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4},
    detailCta: {marginTop: spacing.md, alignSelf: 'flex-end'},
});

export default AttendanceCalendarScreen;
