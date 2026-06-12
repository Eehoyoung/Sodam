import {AppToast, AppBadge, AppCard, AppHeader, AppText, EmptyState, ErrorState, LoadingState, ScreenContainer} from '../../../common/components/ds';
import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {formatMoney} from '../../../common/utils/format';
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

interface SalaryRow extends PayrollSummary {
    payrollId: number;
    status?: string;
    employeeName?: string;
}

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
            const list = await payrollService.listByStore(storeId);
            const mapped: SalaryRow[] = (Array.isArray(list) ? list : []).map(p => ({
                ...p,
                payrollId: p.payrollId ?? 0,
                status: (p as PayrollSummary & {status?: string}).status,
                employeeName: (p as PayrollSummary & {employeeName?: string}).employeeName,
            }));
            setRows(mapped);
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

    const renderStorePicker = () => (
        <View style={styles.storePicker}>
            {stores.map(s => {
                const on = selectedStoreId === s.id;
                return (
                    <TouchableOpacity
                        key={s.id}
                        onPress={() => setSelectedStoreId(s.id)}
                        style={[styles.storeChip, {backgroundColor: on ? c.brandPrimary : c.surfaceMuted}]}>
                        <AppText variant="caption" weight="800" tone={on ? 'inverse' : 'secondary'}>{s.name}</AppText>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const renderItem = ({item}: { item: SalaryRow }) => (
        <AppCard variant="elevated" style={styles.card} onPress={() => openDetail(item.payrollId)}>
            <View style={styles.cardHeader}>
                <AppText variant="titleMd" numberOfLines={1} style={styles.empName}>{item.employeeName ?? `근로자 ${item.employeeId}`}</AppText>
                {item.status ? (
                    <AppBadge
                        label={STATUS_LABEL[item.status] ?? item.status}
                        tone={item.status === 'PAID' ? 'success' : item.status === 'CANCELLED' ? 'error' : 'warning'}
                    />
                ) : null}
            </View>
            {item.period ? (
                <AppText variant="caption" tone="secondary">{item.period.startDate} ~ {item.period.endDate}</AppText>
            ) : null}
            <View style={styles.amounts}>
                {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                {item.totalHours != null ? (
                    <AppText variant="caption" tone="tertiary">총 근무 {item.totalHours}h</AppText>
                ) : null}
                {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                {item.totalPay != null ? (
                    <AppText variant="titleMd" numberOfLines={1} adjustsFontSizeToFit style={{color: c.brandPrimary}}>{formatMoney(item.totalPay)}</AppText>
                ) : null}
            </View>
        </AppCard>
    );

    return (
        <ScreenContainer
            padded={false}
            header={<AppHeader title="급여" actions={[{label: '정산', onPress: () => navigation.navigate('PayrollRun', undefined)}]} />}>
            <View style={[styles.container, {backgroundColor: c.surfaceCanvas}]}>
                {renderStorePicker()}

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
                        contentContainerStyle={rows.length === 0 ? styles.flexCenter : styles.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
    storePicker: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm},
    storeChip: {paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999},
    list: {paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm},
    flexCenter: {flexGrow: 1, justifyContent: 'center'},
    card: {gap: spacing.xs},
    cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm},
    empName: {flexShrink: 1},
    amounts: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs},
});

export default SalaryListScreen;
