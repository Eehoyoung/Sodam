import React, {useCallback, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {radius, spacing} from '../../../theme/tokens';
import {fetchLaborRisks, LaborRiskItem, LaborRiskType} from '../services/riskService';

type Route = RouteProp<HomeStackParamList, 'LaborRisk'>;

const TYPE_META: Record<LaborRiskType, {icon: string; title: string}> = {
    WEEKLY_15H_BOUNDARY: {icon: 'time-outline', title: '주 15시간 경계'},
    WEEKLY_52H_NEAR: {icon: 'alert-circle-outline', title: '주 52시간 임박'},
    CONTRACT_UNSIGNED: {icon: 'document-text-outline', title: '근로계약서 미서명'},
    MIN_WAGE_RISK: {icon: 'cash-outline', title: '최저임금 리스크'},
    SEVERANCE_UPCOMING: {icon: 'wallet-outline', title: '퇴직금 발생 임박'},
};

/**
 * 노무 리스크 대시보드 — 매장 직원별 노무 리스크(주휴 경계·52시간·미서명 계약 등)를
 * 심각도와 함께 보여주고, 항목 탭 시 해결 화면(계약서 발송/직원 상세)으로 딥링크한다.
 */
const LaborRiskDashboardScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
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
        const iconBg = danger ? c.errorBg : c.warningBg;
        const iconColor = danger ? c.error : c.warning;
        return (
            <TouchableOpacity
                key={`${item.type}-${item.employeeId}-${index}`}
                activeOpacity={0.75}
                onPress={() => openItem(item)}>
                <AppCard variant="flat">
                    <View style={styles.rowTop}>
                        <View style={[styles.iconWrap, {backgroundColor: iconBg}]}>
                            <Ionicons name={meta.icon} size={20} color={iconColor} />
                        </View>
                        <View style={styles.rowBody}>
                            <View style={styles.titleRow}>
                                <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.title}>
                                    {meta.title}
                                </AppText>
                                <AppBadge label={danger ? '위험' : '주의'} tone={danger ? 'error' : 'warning'} />
                            </View>
                            <AppText variant="caption" tone="secondary">
                                {item.employeeName}
                                {item.value ? ` · ${item.value}` : ''}
                            </AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                    </View>
                    <AppText variant="bodyMd" tone="secondary" style={styles.message}>
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
                        <View style={[styles.summaryChip, {backgroundColor: c.errorBg}]}>
                            <Ionicons name="alert-circle" size={14} color={c.error} />
                            <AppText variant="caption" weight="700" style={{color: c.error}}>
                                위험 {dangerCount}건
                            </AppText>
                        </View>
                        <View style={[styles.summaryChip, {backgroundColor: c.warningBg}]}>
                            <Ionicons name="warning" size={14} color={c.warning} />
                            <AppText variant="caption" weight="700" style={{color: c.warning}}>
                                주의 {warnCount}건
                            </AppText>
                        </View>
                    </View>

                    <View style={styles.list}>{items.map(renderItem)}</View>
                </>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    summaryRow: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg},
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: spacing.md,
        paddingVertical: 7,
        borderRadius: radius.pill,
    },
    list: {gap: spacing.sm},
    rowTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    rowBody: {flex: 1, minWidth: 0, gap: 2},
    titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    title: {flexShrink: 1},
    message: {marginTop: spacing.sm},
});

export default LaborRiskDashboardScreen;
