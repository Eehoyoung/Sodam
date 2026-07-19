import {AmountText, AppToast, AppBadge, AppButton, AppCard, AppHeader, AppText, CtaStack, EmptyState, ErrorState, LoadingState, ScreenContainer, SegmentedControl} from '../../../common/components/ds';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useStoreLiveSync} from '../../../common/realtime/useStoreLiveSync';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {formatMoney} from '../../../common/format/money';
import {spacing} from '../../../theme/tokens';

import payrollService, {PayrollSummary} from '../services/payrollService';

// 네비게이션 타입 — 같은 HomeStack 내 실제 등록된 라우트만 명시
type SalaryStackParamList = {
    SalaryList: undefined;
    SalaryDetail: { payrollId: number };
    PayrollRun: { storeId?: number } | undefined;
};

type SalaryListScreenNavigationProp = NativeStackNavigationProp<SalaryStackParamList, 'SalaryList'>;

// BE PayrollStatus(enum) 한글 라벨 — payrollService.PayrollStatusValue 와 정합
const STATUS_LABEL: Record<string, string> = {
    DRAFT: '준비 중',
    CONFIRMED: '확정',
    PAID: '지급 완료',
    CANCELLED: '취소됨',
};

// PayrollSummary 는 이미 payrollId/totalPay/status/employeeName/nested period 로 정규화돼 있다
// (payrollService.listByStore 가 BE PayrollDto[](id/netWage/평평한 startDate·endDate) 를 변환해서 반환).
type SalaryRow = PayrollSummary;

const SalaryListScreen = () => {
    const navigation = useNavigation<SalaryListScreenNavigationProp>();
    const c = useThemeColors();
    const [rows, setRows] = useState<SalaryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [stores, setStores] = useState<{ id: number; name: string }[]>([]);

    // 매장 목록 — 실제 매장 선택 API 연동 전까지 보유 매장 placeholder.
    // (정산 목록은 매장 단위 /api/payroll/store/{id} 로만 조회 가능하므로 매장 선택이 필요)
    const fetchStores = useCallback(async () => {
        // TODO(P1): /api/stores/master/current 연동 시 실제 매장으로 대체
        const data = [
            {id: 1, name: '카페 소담'},
            {id: 2, name: '레스토랑 소담'},
        ];
        setStores(data);
        setSelectedStoreId(prev => prev ?? data[0]?.id ?? null);
    }, []);

    const fetchPayrolls = useCallback(async (storeId: number | null) => {
        if (!storeId) {
            setRows([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            setError(false);
            // listByStore 가 이미 BE PayrollDto[] → PayrollSummary[] 정규화까지 마쳐서 반환한다
            const list = await payrollService.listByStore(storeId);
            setRows(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error('급여 목록을 가져오는 중 오류가 생겼어요:', e);
            setError(true);
            AppToast.error('급여 목록을 불러오는 데 실패했어요. 다시 시도해 주세요.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    useEffect(() => {
        setLoading(true);
        fetchPayrolls(selectedStoreId);
    }, [selectedStoreId, fetchPayrolls]);

    // 급여 생성(PayrollRun) 등 타 화면에서 돌아왔을 때 목록을 최신화한다.
    useFocusEffect(
        useCallback(() => {
            fetchPayrolls(selectedStoreId);
        }, [selectedStoreId, fetchPayrolls]),
    );

    // 화면을 보고 있는 동안 급여 생성/확정/지급이 일어나면 즉시 반영 (사장-직원 동시 조회 동기화)
    useStoreLiveSync(selectedStoreId ? [selectedStoreId] : [], e => {
        if (e.type === 'PAYROLL_CHANGED') {
            fetchPayrolls(selectedStoreId);
        }
    });

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPayrolls(selectedStoreId);
    };

    const openDetail = (payrollId: number) => {
        if (!payrollId || payrollId <= 0) {
            AppToast.error('급여 ID가 유효하지 않아요.');
            return;
        }
        navigation.navigate({name: 'SalaryDetail', params: {payrollId}});
    };

    // 선택 매장 인덱스 ↔ SegmentedControl 인덱스 매핑 (매장 선택 배선 보존)
    const storeNames = useMemo(() => stores.map(s => s.name), [stores]);
    const storeIndex = useMemo(
        () => Math.max(0, stores.findIndex(s => s.id === selectedStoreId)),
        [stores, selectedStoreId],
    );

    // 이번 매장 총 지급 예정 — 화면 진입 시 "숫자가 히어로"
    const totalPay = useMemo(
        () => rows.reduce((s, r) => s + (r.totalPay ?? 0), 0),
        [rows],
    );

    const renderItem = ({item}: { item: SalaryRow }) => (
        <AppCard variant="plain" style={styles.card} onPress={() => openDetail(item.payrollId)}>
            <View style={styles.cardTop}>
                <AppText variant="titleMd" numberOfLines={1} style={styles.empName}>
                    {item.employeeName ?? `근로자 ${item.employeeId}`}
                </AppText>
                {item.status ? (
                    <AppBadge
                        label={STATUS_LABEL[item.status] ?? item.status}
                        tone={item.status === 'PAID' ? 'success' : item.status === 'CANCELLED' ? 'error' : 'warning'}
                    />
                ) : null}
            </View>
            <View style={styles.cardBottom}>
                <View style={styles.metaCol}>
                    {item.period ? (
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                            {item.period.startDate} ~ {item.period.endDate}
                        </AppText>
                    ) : null}
                    {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                    {item.totalHours != null ? (
                        <AppText variant="caption" tone="tertiary">총 근무 {item.totalHours}h</AppText>
                    ) : null}
                </View>
                {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                {item.totalPay != null ? (
                    <AmountText size={24} tone="primary" style={styles.amount}>
                        {formatMoney(item.totalPay)}
                    </AmountText>
                ) : null}
            </View>
        </AppCard>
    );

    const listHeader =
        rows.length > 0 ? (
            <View style={styles.heroBlock}>
                <AppText variant="caption" tone="secondary" weight="700">이번 정산 총액</AppText>
                <AmountText size={40} tone="brand" style={styles.heroAmount}>
                    {formatMoney(totalPay)}
                </AmountText>
                <AppText variant="caption" tone="tertiary">{rows.length}명 · 직원별 명세는 아래에서 확인해요</AppText>
            </View>
        ) : null;

    return (
        <ScreenContainer
            padded={false}
            header={<AppHeader title="급여" />}
            footer={
                <CtaStack bordered>
                    <AppButton label="급여 정산하기" onPress={() => navigation.navigate('PayrollRun', undefined)} />
                </CtaStack>
            }>
            <View style={[styles.container, {backgroundColor: c.surfaceCanvas}]}>
                {storeNames.length > 0 ? (
                    <View style={styles.storePicker}>
                        <SegmentedControl
                            options={storeNames}
                            value={storeIndex}
                            onChange={i => setSelectedStoreId(stores[i]?.id ?? null)}
                        />
                    </View>
                ) : null}

                {loading ? (
                    <LoadingState title="불러오는 중" description="급여 내역을 불러오고 있어요" />
                ) : error ? (
                    <ErrorState
                        title="불러오지 못했어요"
                        description="급여 내역을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
                        primary={{label: '다시 시도', onPress: () => { setLoading(true); fetchPayrolls(selectedStoreId); }}}
                    />
                ) : (
                    <FlatList
                        data={rows}
                        keyExtractor={(item) => String(item.payrollId)}
                        renderItem={renderItem}
                        ListHeaderComponent={listHeader}
                        contentContainerStyle={rows.length === 0 ? styles.flexCenter : styles.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <EmptyState
                                glyph="₩"
                                title="아직 급여 내역이 없어요"
                                description="첫 정산을 실행하면 여기에 쌓여요."
                                primary={{label: '급여 정산하기', onPress: () => navigation.navigate('PayrollRun', undefined)}}
                            />
                        }
                    />
                )}
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    storePicker: {paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xs},
    list: {paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md},
    flexCenter: {flexGrow: 1, justifyContent: 'center'},
    heroBlock: {paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs},
    heroAmount: {marginVertical: spacing.xs},
    card: {gap: spacing.md},
    cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    empName: {flexShrink: 1},
    cardBottom: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacing.md},
    metaCol: {flexShrink: 1, gap: 2},
    amount: {flexShrink: 0, maxWidth: '55%'},
});

export default SalaryListScreen;
