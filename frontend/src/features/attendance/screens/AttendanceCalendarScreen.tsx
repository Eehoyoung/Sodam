/* eslint-disable react-native/no-color-literals -- 빈 날짜 셀 스페이서(transparent) 고정 */
import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {spacing, tokens} from '../../../theme/tokens';
import {AppButton, AppCard, AppHeader, AppText, ScreenContainer, SegmentedControl} from '../../../common/components/ds';
import {PersonalRecordEditSheet} from '../components/AttendanceSheets';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import attendanceService, {MonthlyAttendanceItem} from '../services/attendanceService';
import {useAuth} from '../../../contexts/AuthContext';
import {compactTimeFromApi} from '../../../common/utils/dateTimeInput';

type AttendanceRecord = MonthlyAttendanceItem;

type DayStatus = 'CHECKED_IN' | 'WORKING';

/**
 * 23 AttendanceCalendar — 확정 시안(v3 §4.1, "23 AttendanceCalendar · 멀티매장").
 * 월간 그리드(선택일 브랜드 채움) + 점 표시 + 선택일 상세 카드 + 매장별 세그먼트 필터. 조회/이동 로직 보존.
 * 매장 필터는 서버 재요청 없이 클라이언트 사이드에서 응답의 storeId로만 걸러낸다
 * (MonthlyAttendanceItem.storeId — 계획서 §7 확인 완료, BE 응답에 이미 포함돼 있어 추가 조회 불필요).
 */
const AttendanceCalendarScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {user} = useAuth();
    const c = useThemeColors();
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [month, setMonth] = useState(() => new Date().getMonth() + 1);
    const [items, setItems] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
    // storeFilter === null → 전체(필터 없음). 매장이 1개뿐이면 세그먼트 자체를 숨긴다.
    const [storeFilter, setStoreFilter] = useState<number | null>(null);
    // 80 PersonalRecordEditSheet — 실제 서버 기록(급여 기산에 쓰이는 checkIn/Out)을 이 시트가
    // 직접 저장하면 승인 절차 없이 근태가 바뀌어 위험하므로, 저장 시 값을 들고 있던 실제 정정 요청
    // 화면(AttendanceCorrectionRequest, 사유 입력 필수)으로 넘겨 기존 승인 플로우를 그대로 타게 한다.
    // 즉 이 시트는 "빠른 수정 입력" UI로만 쓰이고, 실제 쓰기는 여전히 기존 정정 요청 API 가 담당한다.
    const [editSheetVisible, setEditSheetVisible] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!user?.id) {
                return;
            }
            setLoading(true);
            try {
                const list = await attendanceService.getMonthlyAttendance(user.id, year, month);
                if (mounted) {
                    setItems(list);
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

    // 매장 세그먼트 옵션 — 응답에 등장한 storeId 를 첫 등장 순서로 수집(중복 제거).
    const storeOptions = useMemo(() => {
        const map = new Map<number, string>();
        items.forEach(it => {
            if (it.storeId !== undefined && !map.has(it.storeId)) {
                map.set(it.storeId, it.storeName ?? `매장 ${it.storeId}`);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({id, name}));
    }, [items]);

    // 월 이동 시 이전 달에만 있던 매장 필터가 새 달에 남아있지 않도록 초기화.
    useEffect(() => {
        setStoreFilter(null);
    }, [year, month]);

    const filteredItems = useMemo(
        () => (storeFilter === null ? items : items.filter(it => it.storeId === storeFilter)),
        [items, storeFilter],
    );

    const dayMap = useMemo(() => {
        const map = new Map<number, AttendanceRecord>();
        filteredItems.forEach(it => {
            if (!it.checkInTime) {
                return;
            }
            map.set(new Date(it.checkInTime).getDate(), it);
        });
        return map;
    }, [filteredItems]);

    const days = useMemo(() => buildMonthGrid(year, month), [year, month]);
    const selectedRecord = selectedDay ? dayMap.get(selectedDay) : null;

    // 아티팩트 23 money-card(이번 달 요약) — 이미 불러온 filteredItems 로만 계산(추가 API 호출 없음).
    const monthSummary = useMemo(() => {
        const dayCount = new Set(
            filteredItems.filter(it => !!it.checkInTime).map(it => it.checkInTime!.slice(0, 10)),
        ).size;
        const totalMinutes = filteredItems.reduce((sum, it) => {
            if (typeof it.workingMinutes === 'number') {return sum + it.workingMinutes;}
            if (typeof it.workingHours === 'number') {return sum + it.workingHours * 60;}
            return sum;
        }, 0);
        return {dayCount, hours: totalMinutes / 60};
    }, [filteredItems]);

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
                    <Ionicons name="chevron-back" size={22} color={c.brandPrimary} />
                </Pressable>
                <AppText variant="headingMd">{year}년 {month}월</AppText>
                <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={22} color={c.brandPrimary} />
                </Pressable>
            </View>

            {/* 아티팩트 23 money-card — 이번 달(선택 매장 기준) 근무일수·시간 요약 */}
            <AppCard variant="outlined" style={styles.summaryCard}>
                <AppText variant="caption" tone="secondary">
                    이번 달{storeOptions.length > 1 ? ` (${storeOptions.length}개 매장)` : ''}
                </AppText>
                <AppText variant="headingSm" weight="800" style={styles.summaryValue}>
                    {monthSummary.dayCount}일 · {monthSummary.hours.toFixed(1)}h
                </AppText>
            </AppCard>

            {storeOptions.length > 1 ? (
                <SegmentedControl
                    options={['전체', ...storeOptions.map(s => s.name)]}
                    value={storeFilter === null ? 0 : storeOptions.findIndex(s => s.id === storeFilter) + 1}
                    onChange={i => setStoreFilter(i === 0 ? null : storeOptions[i - 1].id)}
                    style={styles.storeSegment}
                />
            ) : null}

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
                    {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                    {selectedRecord.workingMinutes != null ? (
                        <DetailRow
                            label="근무 시간"
                            value={`${Math.floor(selectedRecord.workingMinutes / 60)}시간 ${selectedRecord.workingMinutes % 60}분`}
                        />
                    ) : null}
                    {selectedRecord.appliedHourlyWage ? (
                        <DetailRow label="적용 시급" value={`${selectedRecord.appliedHourlyWage.toLocaleString('ko-KR')}원`} />
                    ) : null}
                    <View style={styles.detailCtaRow}>
                        <AppButton
                            label="빠른 수정"
                            variant="ghost"
                            style={styles.detailCtaHalf}
                            onPress={() => setEditSheetVisible(true)}
                        />
                        <AppButton
                            label="정정 요청하기"
                            variant="outline"
                            style={styles.detailCtaHalf}
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
                </AppCard>
            ) : selectedDay && !loading ? (
                <AppCard variant="flat" style={styles.detailCard}>
                    <AppText variant="caption" tone="tertiary" center>이 날의 출근 기록이 없어요.</AppText>
                </AppCard>
            ) : null}

            {selectedRecord && selectedDay ? (
                <PersonalRecordEditSheet
                    visible={editSheetVisible}
                    onClose={() => setEditSheetVisible(false)}
                    initial={{
                        date: `${year}-${pad(month)}-${pad(selectedDay)}`,
                        checkIn: compactTimeFromApi(selectedRecord.checkInTime),
                        checkOut: compactTimeFromApi(selectedRecord.checkOutTime),
                        wage: selectedRecord.appliedHourlyWage ? String(selectedRecord.appliedHourlyWage) : '',
                    }}
                    // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
                    expectedPay={selectedRecord.workingMinutes != null && selectedRecord.appliedHourlyWage
                        ? Math.round((selectedRecord.workingMinutes / 60) * selectedRecord.appliedHourlyWage)
                        : undefined}
                    onSave={v => {
                        setEditSheetVisible(false);
                        // 실제 저장은 여기서 하지 않는다 — 기존 정정 요청 화면(사유 입력 필수, 사장 승인
                        // 워크플로)으로 값을 넘겨 그 화면의 실제 제출 로직을 그대로 태운다.
                        navigation.navigate('AttendanceCorrectionRequest', {
                            attendanceId: selectedRecord.id,
                            date: v.date,
                            storeName: selectedRecord.storeName,
                            currentCheckIn: v.checkIn,
                            currentCheckOut: v.checkOut,
                        });
                    }}
                />
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
    headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md},
    navBtn: {padding: spacing.sm, minWidth: 44, alignItems: 'center'},
    summaryCard: {marginBottom: spacing.md},
    summaryValue: {marginTop: spacing.xs},
    storeSegment: {marginBottom: spacing.sm},
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
    detailCard: {marginTop: spacing.xl},
    detailStore: {marginTop: 2, marginBottom: spacing.sm},
    detailRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6},
    detailCtaRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg},
    detailCtaHalf: {flex: 1},
});

export default AttendanceCalendarScreen;
