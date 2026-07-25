import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {useFocusEffect, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AmountText,
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    LoadingState,
    QuickMenuGrid,
    ScreenContainer,
} from '../../../common/components/ds';
import type {QuickMenuTileItem} from '../../../common/components/ds/QuickMenuGrid';
import {recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {formatMoney} from '../../../common/format/money';
import {fetchDashboardStats, MonthPayrollStats} from '../../store/services/insightsService';

/**
 * 10 OwnerDashboardDetail — v3 시안.
 * 08 OwnerHome 에 병합돼 있던 "빠르게 하기" 4행 + "인사이트" 카드를 별도 라우트로 분리(§4.1).
 * 정보 밀도는 D-1 원칙(v2 수준 유지)에 따라 기존 4개 항목을 QuickMenuGrid 로 그대로 보존.
 */
const OwnerDashboardDetailScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'OwnerDashboardDetail'>>();
    const c = useThemeColors();
    const storeId = route.params?.storeId;

    const [monthly, setMonthly] = useState<MonthPayrollStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (!storeId) {
            setLoading(false);
            return;
        }
        try {
            setError(false);
            const dashboard = await fetchDashboardStats(storeId);
            setMonthly(dashboard.payroll);
        } catch (e) {
            console.warn('[OwnerDashboardDetail] load failed', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const quickMenus: QuickMenuTileItem[] = [
        {
            key: 'settlement', label: '정산', icon: 'card-outline',
            onPress: () => navigation.navigate('SalaryList'),
            color: {bg: c.warningBg, icon: c.warning},
        },
        {
            key: 'employee', label: '직원', icon: 'people-outline',
            onPress: () => {
                if (storeId !== undefined) {navigation.navigate('StoreDetail', {storeId});}
            },
            color: {bg: c.infoBg, icon: c.info},
        },
        {
            key: 'location', label: '위치', icon: 'location-outline',
            onPress: () => navigation.navigate('StoreRegistration'),
            color: {bg: c.surfaceMuted, icon: c.textSecondary},
        },
        {
            key: 'labor', label: '노무·세무', icon: 'book-outline',
            onPress: () => navigation.navigate('InfoList'),
            color: {bg: c.brandPrimarySoft, icon: c.brandPrimary},
        },
        {
            key: 'recruitment', label: '구직자·채용', icon: 'person-add-outline',
            onPress: () => {
                if (storeId !== undefined) {navigation.navigate('JobSeekerList', {storeId});}
            },
            color: {bg: recruit.primarySoft, icon: recruit.primary},
        },
    ];

    if (error) {
        return (
            <ScreenContainer header={<AppHeader title="운영 대시보드" onBack={() => navigation.goBack()} />}>
                <ErrorState
                    title="운영 정보를 불러오지 못했어요"
                    description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            </ScreenContainer>
        );
    }

    if (loading) {
        return (
            <ScreenContainer header={<AppHeader title="운영 대시보드" onBack={() => navigation.goBack()} />}>
                <LoadingState title="운영 정보를 불러오는 중" description="잠시만 기다려 주세요." />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            padded={false}
            header={<AppHeader title="운영 대시보드" onBack={() => navigation.goBack()} />}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <AppCard variant="spot" style={styles.spotCard}>
                    <AppText variant="titleMd" weight="800">오늘 매출은 다루지 않아요</AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.spotSub}>
                        운영만 집중 — 근태, 급여, 직원 상태만 명확하게 보여줍니다.
                    </AppText>
                </AppCard>

                <AppCard variant="outlined">
                    <AppText variant="titleMd" weight="700">운영 인사이트</AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.insightBody}>
                        이번 달 야간 근무가 지난달 대비 늘었어요. 정산 전 연장·야간 수당을 확인하세요.
                    </AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.amountLabel}>이번 달 누적 급여</AppText>
                    <AmountText size={26} tone="primary">{formatMoney(monthly?.totalGross ?? 0)}</AmountText>
                </AppCard>

                <AppText variant="caption" tone="secondary" weight="700" style={styles.sectionLabel}>
                    빠른 메뉴
                </AppText>
                <QuickMenuGrid items={quickMenus} />
            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    content: {paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg},
    spotCard: {gap: spacing.xs},
    spotSub: {marginTop: 2},
    insightBody: {marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 22},
    amountLabel: {marginBottom: 2},
    sectionLabel: {marginTop: spacing.xs, textTransform: 'uppercase', letterSpacing: 1},
});

export default OwnerDashboardDetailScreen;
