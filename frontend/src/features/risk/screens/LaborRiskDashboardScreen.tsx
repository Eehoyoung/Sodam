import React, {useCallback, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
    AppBadge,
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    LoadingState,
    ScreenContainer,
    SuccessState,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {fetchLaborRisks, LaborRiskItem, LaborRiskType} from '../services/riskService';

type Route = RouteProp<HomeStackParamList, 'LaborRisk'>;

const TYPE_META: Record<LaborRiskType, {icon: string; title: string}> = {
    WEEKLY_15H_BOUNDARY: {icon: 'time-outline', title: '주 15시간 경계'},
    WEEKLY_52H_NEAR: {icon: 'alert-circle-outline', title: '주 52시간 임박'},
    CONTRACT_UNSIGNED: {icon: 'document-text-outline', title: '근로계약서 미서명'},
    MIN_WAGE_RISK: {icon: 'cash-outline', title: '최저임금 리스크'},
    SEVERANCE_UPCOMING: {icon: 'wallet-outline', title: '퇴직금 발생 임박'},
    CONTRACT_OVER_52H: {icon: 'warning-outline', title: '계약 주 52시간 초과'},
};

/**
 * B11 LaborRiskDashboardScreen — v3 시안(sodam-v3-10-business.html) 1:1.
 *
 * 상단 요약 배지(위험 N건/주의 N건, badge--coral·badge--amber) + list-item 리스트(상단 행:
 * "유형 · 직원명" + 심각도 배지, 메타 한 줄: 리스크 메시지). 아이콘 아바타·chevron 제거로 시안 단순화.
 * 항목 탭 시 해결 화면(계약서 발송/직원 상세)으로 딥링크한다.
 */
const LaborRiskDashboardScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const {storeId} = route.params;

    const [items, setItems] = useState<LaborRiskItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const list = await fetchLaborRisks(storeId);
            // DANGER 우선 정렬
            setItems([...list].sort((a, b) => {
                if (a.severity === b.severity) { return 0; }
                return a.severity === 'DANGER' ? -1 : 1;
            }));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const dangerCount = items.filter(i => i.severity === 'DANGER').length;
    const warnCount = items.filter(i => i.severity === 'WARN').length;

    const openItem = (item: LaborRiskItem) => {
        if (item.type === 'CONTRACT_UNSIGNED') {
            navigation.navigate('SendContract', {
                storeId,
                employeeId: item.employeeId,
                employeeName: item.employeeName,
            });
            return;
        }
        navigation.navigate('EmployeeDetail', {storeId, employeeId: item.employeeId});
    };

    const renderItem = (item: LaborRiskItem, index: number) => {
        const meta = TYPE_META[item.type] ?? {icon: 'alert-circle-outline', title: '노무 리스크'};
        const danger = item.severity === 'DANGER';
        return (
            <TouchableOpacity
                key={`${item.type}-${item.employeeId}-${index}`}
                activeOpacity={0.75}
                onPress={() => openItem(item)}>
                <AppCard variant="flat">
                    <View style={styles.titleRow}>
                        <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.title}>
                            {meta.title} · {item.employeeName}
                        </AppText>
                        <AppBadge label={danger ? '위험' : '주의'} tone={danger ? 'error' : 'warning'} />
                    </View>
                    <AppText variant="caption" tone="secondary" style={styles.message}>
                        {item.message}
                    </AppText>
                </AppCard>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="노무 리스크" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState title="리스크 점검 중" description="직원별 노무 리스크를 확인하고 있어요" />
            ) : error ? (
                <ErrorState
                    title="리스크를 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : items.length === 0 ? (
                <SuccessState
                    title="발견된 리스크가 없어요 👍"
                    description="직원들의 근무·계약 상태가 모두 안전 범위에 있어요."
                />
            ) : (
                <>
                    <View style={styles.summaryRow}>
                        <AppBadge label={`위험 ${dangerCount}건`} tone="error" />
                        <AppBadge label={`주의 ${warnCount}건`} tone="warning" />
                    </View>

                    <View style={styles.list}>{items.map(renderItem)}</View>
                </>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    summaryRow: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg},
    list: {gap: spacing.sm},
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    title: {flex: 1, minWidth: 0},
    message: {marginTop: spacing.xs},
});

export default LaborRiskDashboardScreen;
