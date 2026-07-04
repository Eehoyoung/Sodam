import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
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
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {radius, spacing} from '../../../theme/tokens';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useAuth} from '../../../contexts/AuthContext';
import storeService from '../../store/services/storeService';
import attendanceService, {
    AttendanceWorkLogResponse,
    AttendanceWorkLogRow,
} from '../services/attendanceService';

interface MyStore {
    id: number;
    storeName: string;
    appliedHourlyWage: number;
}

interface WorkLogRow {
    key: string;
    attendanceId?: number;
    dateKey: string;
    dateLabel: string;
    checkIn: string;
    checkOut: string;
    workedMinutes: number;
    workedLabel: string;
    dailyWage: number;
    bonusAmount: number;
    memo: string;
    status: 'CONFIRMED' | 'WORKING' | 'BONUS_ONLY';
    source: AttendanceWorkLogRow | null;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const EmployeeWorkLogScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'EmployeeWorkLog'>>();
    const {user} = useAuth();
    const c = useThemeColors();

    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [stores, setStores] = useState<MyStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(route.params?.storeId ?? null);
    const [workLog, setWorkLog] = useState<AttendanceWorkLogResponse | null>(null);
    const [loadingStores, setLoadingStores] = useState(true);
    const [loadingRows, setLoadingRows] = useState(true);
    const [error, setError] = useState(false);

    const selectedStore = useMemo(
        () => stores.find(store => store.id === selectedStoreId) ?? stores[0] ?? null,
        [selectedStoreId, stores],
    );

    const loadStores = useCallback(async () => {
        if (!user?.id) {
            setStores([]);
            setSelectedStoreId(null);
            setLoadingStores(false);
            return;
        }
        setLoadingStores(true);
        try {
            const storeList = await storeService.getEmployeeStores(user.id);
            const mapped = storeList.map(store => ({
                id: store.id,
                storeName: store.storeName,
                appliedHourlyWage: store.storeStandardHourWage ?? 0,
            }));
            const preferredId = route.params?.storeId;
            setStores(mapped);
            setSelectedStoreId(prev => {
                if (preferredId && mapped.some(store => store.id === preferredId)) {
                    return preferredId;
                }
                if (prev && mapped.some(store => store.id === prev)) {
                    return prev;
                }
                return mapped[0]?.id ?? null;
            });
        } catch {
            setStores([]);
            setSelectedStoreId(null);
        } finally {
            setLoadingStores(false);
        }
    }, [route.params?.storeId, user?.id]);

    const loadRows = useCallback(async () => {
        if (!user?.id || !selectedStore) {
            setWorkLog(null);
            setLoadingRows(false);
            return;
        }
        setLoadingRows(true);
        setError(false);
        try {
            setWorkLog(await attendanceService.getMonthlyWorkLog(user.id, selectedStore.id, year, month));
        } catch {
            setWorkLog(null);
            setError(true);
        } finally {
            setLoadingRows(false);
        }
    }, [month, selectedStore, user?.id, year]);

    useFocusEffect(
        useCallback(() => {
            loadStores();
        }, [loadStores]),
    );

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const rows = useMemo(() => buildRows(workLog?.rows ?? []), [workLog?.rows]);
    const summary = useMemo(() => {
        const apiSummary = workLog?.summary;
        return {
            attendanceDays: apiSummary?.attendanceDays ?? 0,
            workedMinutes: apiSummary?.totalWorkedMinutes ?? 0,
            wage: apiSummary?.totalDailyWage ?? 0,
            bonus: apiSummary?.totalBonusAmount ?? 0,
            grossTotal: apiSummary?.totalGrossWage ?? 0,
        };
    }, [workLog?.summary]);

    const moveMonth = (amount: number) => {
        const next = new Date(year, month - 1 + amount, 1);
        setYear(next.getFullYear());
        setMonth(next.getMonth() + 1);
    };

    const isLoading = loadingStores || loadingRows;

    return (
        <ScreenContainer
            scroll
            padded={false}
            header={<AppHeader title="근무일지" onBack={() => navigation.goBack()} />}>
            <View style={styles.body}>
                <View style={[styles.monthBar, {backgroundColor: c.surface, borderColor: c.border}]}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="이전 달"
                        onPress={() => moveMonth(-1)}
                        hitSlop={10}
                        style={[styles.monthButton, {backgroundColor: c.surfaceMuted}]}>
                        <Ionicons name="chevron-back" size={22} color={c.brandPrimary} />
                    </Pressable>
                    <View style={styles.monthTitleWrap}>
                        <AppText variant="headingMd" weight="800" center>{year}년 {month}월</AppText>
                        <AppText variant="caption" tone="secondary" center numberOfLines={1}>
                            {selectedStore?.storeName ?? '매장 없음'}
                        </AppText>
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="다음 달"
                        onPress={() => moveMonth(1)}
                        hitSlop={10}
                        style={[styles.monthButton, {backgroundColor: c.surfaceMuted}]}>
                        <Ionicons name="chevron-forward" size={22} color={c.brandPrimary} />
                    </Pressable>
                </View>

                {stores.length > 1 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.storeChips}>
                        {stores.map(store => {
                            const selected = store.id === selectedStore?.id;
                            return (
                                <Pressable
                                    key={store.id}
                                    onPress={() => setSelectedStoreId(store.id)}
                                    style={[
                                        styles.storeChip,
                                        {borderColor: c.border, backgroundColor: c.surface},
                                        selected ? {borderColor: c.brandPrimary, backgroundColor: c.brandPrimarySoft} : null,
                                    ]}>
                                    <AppText
                                        variant="caption"
                                        tone={selected ? 'brand' : 'secondary'}
                                        weight={selected ? '800' : '600'}
                                        numberOfLines={1}>
                                        {store.storeName}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                ) : null}

                {!selectedStore && !isLoading ? (
                    <EmptyState
                        title="근무일지를 볼 매장이 없어요"
                        description="합류된 매장이 생기면 월별 근무 기록을 확인할 수 있어요."
                        primary={{label: '매장 합류하기', onPress: () => navigation.navigate('JoinStoreByCode')}}
                    />
                ) : isLoading ? (
                    <LoadingState title="근무일지를 불러오는 중" description="월별 출퇴근과 보너스 내역을 확인하고 있어요." />
                ) : error ? (
                    <ErrorState
                        title="근무일지를 불러오지 못했어요"
                        description="잠시 후 다시 시도해 주세요."
                        primary={{label: '다시 불러오기', onPress: loadRows}}
                    />
                ) : (
                    <>
                        <View style={styles.summaryGrid}>
                            <Metric label="출근일수" value={`${summary.attendanceDays}일`} tone="brand" />
                            <Metric label="총근무시간" value={formatMinutes(summary.workedMinutes)} tone="info" />
                            <Metric label="일급여(세전)" value={formatWon(summary.wage)} />
                            <Metric label="보너스+기타" value={formatWon(summary.bonus)} tone="warning" />
                        </View>

                        <AppCard variant="plain" style={styles.totalCard}>
                            <View style={styles.totalRow}>
                                <View>
                                    <AppText variant="caption" tone="secondary">월 세전 합계</AppText>
                                    <AppText variant="headingMd" weight="800">{formatWon(summary.grossTotal)}</AppText>
                                </View>
                                <View style={[styles.statusChip, {backgroundColor: c.successBg}]}>
                                    <AppText variant="caption" weight="800" style={{color: c.success}}>
                                        {rows.length}건
                                    </AppText>
                                </View>
                            </View>
                        </AppCard>

                        {rows.length === 0 ? (
                            <EmptyState
                                title="이 달 근무 기록이 없어요"
                                description="출퇴근 기록이 생기면 일자별로 정리돼요."
                            />
                        ) : (
                            <AppCard variant="plain" style={styles.tableCard}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View>
                                        <WorkLogHeader />
                                        {rows.map(row => (
                                            <WorkLogTableRow
                                                key={row.key}
                                                row={row}
                                                onCorrection={() => {
                                                    navigation.navigate('AttendanceCorrectionRequest', {
                                                        attendanceId: row.attendanceId,
                                                        date: row.dateKey,
                                                        storeName: selectedStore?.storeName,
                                                        currentCheckIn: row.source?.checkInTime ?? undefined,
                                                        currentCheckOut: row.source?.checkOutTime ?? undefined,
                                                    });
                                                }}
                                            />
                                        ))}
                                        <View style={[styles.tableRow, styles.totalTableRow, {borderColor: c.border}]}>
                                            <Cell width={92} strong>월 합계</Cell>
                                            <Cell width={84}>-</Cell>
                                            <Cell width={84}>-</Cell>
                                            <Cell width={104} strong>{formatMinutes(summary.workedMinutes)}</Cell>
                                            <Cell width={120} align="right" strong>{formatWon(summary.wage)}</Cell>
                                            <Cell width={108} align="right" strong>{formatWon(summary.bonus)}</Cell>
                                            <Cell width={142}>세전 {formatWon(summary.grossTotal)}</Cell>
                                            <Cell width={86}>-</Cell>
                                            <Cell width={82}>-</Cell>
                                        </View>
                                    </View>
                                </ScrollView>
                            </AppCard>
                        )}
                    </>
                )}
            </View>
        </ScreenContainer>
    );
};

function Metric({label, value, tone}: {label: string; value: string; tone?: 'brand' | 'info' | 'warning'}) {
    const c = useThemeColors();
    const bg = tone === 'brand'
        ? c.brandPrimarySoft
        : tone === 'info'
            ? c.infoBg
            : tone === 'warning'
                ? c.warningBg
                : c.surface;
    const color = tone === 'brand'
        ? c.brandPrimary
        : tone === 'info'
            ? c.info
            : tone === 'warning'
                ? c.warning
                : c.textPrimary;
    return (
        <View style={[styles.metric, {backgroundColor: bg, borderColor: c.border}]}>
            <AppText variant="caption" tone="secondary" numberOfLines={1}>{label}</AppText>
            <AppText variant="titleMd" weight="800" style={{color}} numberOfLines={1} adjustsFontSizeToFit>
                {value}
            </AppText>
        </View>
    );
}

function WorkLogHeader() {
    return (
        <View style={[styles.tableRow, styles.headerRow]}>
            <Cell width={92} header>일자</Cell>
            <Cell width={84} header>출근시간</Cell>
            <Cell width={84} header>퇴근시간</Cell>
            <Cell width={104} header>총근무시간</Cell>
            <Cell width={120} header align="right">일급여(세전)</Cell>
            <Cell width={108} header align="right">보너스</Cell>
            <Cell width={142} header>기타</Cell>
            <Cell width={86} header>상태</Cell>
            <Cell width={82} header>정정</Cell>
        </View>
    );
}

function WorkLogTableRow({row, onCorrection}: {row: WorkLogRow; onCorrection: () => void}) {
    const c = useThemeColors();
    return (
        <View style={[styles.tableRow, {borderColor: c.divider}]}>
            <Cell width={92} strong>{row.dateLabel}</Cell>
            <Cell width={84}>{row.checkIn}</Cell>
            <Cell width={84}>{row.checkOut}</Cell>
            <Cell width={104}>{row.workedLabel}</Cell>
            <Cell width={120} align="right">{row.dailyWage ? formatWon(row.dailyWage) : '-'}</Cell>
            <Cell width={108} align="right">{row.bonusAmount ? formatWon(row.bonusAmount) : '-'}</Cell>
            <Cell width={142}>{row.memo}</Cell>
            <View style={[styles.cell, {width: 86}]}>
                <View style={[
                    styles.rowStatus,
                    {backgroundColor: statusBg(row.status, c)},
                ]}>
                    <AppText variant="caption" weight="800" style={{color: statusColor(row.status, c), fontSize: 11}}>
                        {statusLabel(row.status)}
                    </AppText>
                </View>
            </View>
            <View style={[styles.cell, {width: 82}]}>
                {row.attendanceId ? (
                    <Pressable onPress={onCorrection} hitSlop={8} style={[styles.correctionBtn, {borderColor: c.border}]}>
                        <AppText variant="caption" tone="brand" weight="800">요청</AppText>
                    </Pressable>
                ) : (
                    <AppText variant="caption" tone="tertiary">-</AppText>
                )}
            </View>
        </View>
    );
}

function Cell({
    width,
    children,
    header = false,
    strong = false,
    align = 'left',
}: {
    width: number;
    children: React.ReactNode;
    header?: boolean;
    strong?: boolean;
    align?: 'left' | 'right';
}) {
    return (
        <View style={[styles.cell, {width}]}>
            <AppText
                variant="caption"
                tone={header ? 'secondary' : 'primary'}
                weight={header || strong ? '800' : '600'}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{textAlign: align}}>
                {children}
            </AppText>
        </View>
    );
}

function buildRows(items: AttendanceWorkLogRow[]): WorkLogRow[] {
    return items.map((item, index) => {
        const dateKey = normalizeDateKey(item.date) ?? item.date;
        const workedMinutes = item.workedMinutes ?? 0;
        const status = item.status === 'WORKING'
            ? 'WORKING'
            : item.status === 'BONUS_ONLY'
                ? 'BONUS_ONLY'
                : 'CONFIRMED';
        return {
            key: `${status}-${item.attendanceId ?? dateKey}-${index}`,
            attendanceId: item.attendanceId ?? undefined,
            dateKey,
            dateLabel: formatDateLabel(dateKey),
            checkIn: item.checkInTime ? formatTime(item.checkInTime) : '-',
            checkOut: item.checkOutTime ? formatTime(item.checkOutTime) : '-',
            workedMinutes,
            workedLabel: status === 'WORKING' ? '진행중' : workedMinutes ? formatMinutes(workedMinutes) : '-',
            dailyWage: item.dailyWage ?? 0,
            bonusAmount: item.bonusAmount ?? 0,
            memo: item.memo ?? item.bonusReason ?? '-',
            status,
            source: item,
        } satisfies WorkLogRow;
    });
}

function normalizeDateKey(value?: string): string | null {
    if (!value) {
        return null;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(dateKey: string): string {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return dateKey;
    }
    return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${DAY_LABELS[date.getDay()]}`;
}

function formatTime(value?: string): string {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value.slice(11, 16) || value.slice(0, 5);
    }
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatMinutes(minutes: number): string {
    const rounded = Math.max(0, Math.round(minutes));
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

function formatWon(value: number): string {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

function statusLabel(status: WorkLogRow['status']): string {
    if (status === 'WORKING') {
        return '근무중';
    }
    if (status === 'BONUS_ONLY') {
        return '기타';
    }
    return '확정';
}

function statusBg(status: WorkLogRow['status'], c: ReturnType<typeof useThemeColors>): string {
    if (status === 'WORKING') {
        return c.warningBg;
    }
    if (status === 'BONUS_ONLY') {
        return c.surfaceMuted;
    }
    return c.successBg;
}

function statusColor(status: WorkLogRow['status'], c: ReturnType<typeof useThemeColors>): string {
    if (status === 'WORKING') {
        return c.warning;
    }
    if (status === 'BONUS_ONLY') {
        return c.textSecondary;
    }
    return c.success;
}

const styles = StyleSheet.create({
    body: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxxl,
        gap: spacing.md,
    },
    monthBar: {
        minHeight: 78,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    monthButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTitleWrap: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
    storeChips: {
        gap: spacing.sm,
        paddingVertical: spacing.xs,
    },
    storeChip: {
        maxWidth: 180,
        minHeight: 36,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    metric: {
        width: '48.7%',
        minHeight: 78,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        justifyContent: 'space-between',
    },
    totalCard: {
        padding: spacing.lg,
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    statusChip: {
        minHeight: 32,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tableCard: {
        padding: 0,
        overflow: 'hidden',
    },
    tableRow: {
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerRow: {
        minHeight: 44,
    },
    totalTableRow: {
        borderTopWidth: 1,
        borderBottomWidth: 0,
    },
    cell: {
        minHeight: 50,
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
    },
    rowStatus: {
        alignSelf: 'flex-start',
        minHeight: 26,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    correctionBtn: {
        alignSelf: 'flex-start',
        minHeight: 30,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default EmployeeWorkLogScreen;
