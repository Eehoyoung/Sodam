import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {
    fetchLaborHealth,
    fetchLaborHealthDetail,
    LaborHealthResponse,
    LaborRiskType,
} from '../services/riskService';
import {logger} from '../../../utils/logger';

type Route = RouteProp<HomeStackParamList, 'LaborHealthDetail'>;

/** LaborRiskDashboardScreen과 같은 유형 라벨을 쓴다(사용자에게 다른 화면이라도 같은 이름으로 보여야 함). */
const TYPE_LABEL: Record<LaborRiskType, string> = {
    WEEKLY_15H_BOUNDARY: '주 15시간 경계',
    WEEKLY_52H_NEAR: '주 52시간 임박',
    CONTRACT_UNSIGNED: '근로계약서 미서명',
    MIN_WAGE_RISK: '최저임금 리스크',
    SEVERANCE_UPCOMING: '퇴직금 발생 임박',
    CONTRACT_OVER_52H: '계약 주 52시간 초과',
    HEADCOUNT_THRESHOLD: '상시근로자 5인 경계',
    SCHEDULE_52H_FORECAST: '다음 주 52시간 초과 예상',
    SCHEDULE_15H_SHORTFALL: '다음 주 주휴 기준 미달 예상',
    BREAK_MISSING_FORECAST: '휴게시간 배치 필요',
    MINOR_NIGHT_FORECAST: '연소자 야간근로 예상',
    MINOR_HOURS_FORECAST: '연소자 근로시간 초과 예상',
};

type TierAccess = 'FULL' | 'BASIC' | 'NONE';

const is402 = (err: unknown): boolean =>
    !!err && typeof err === 'object' && (err as {response?: {status?: number}}).response?.status === 402;

/**
 * 260816 WP-B — 노무 건강도 상세 분석(플랜 게이팅 실사용처, D-7 결정).
 *
 * LaborRiskDashboardScreen(게이팅 없는 목록)과는 별개 화면 — 여기는 실제로 플랜에 따라
 * 다른 정보량을 보여준다. PRO(FULL)면 설명까지, STARTER(BASIC)면 건수·유형만, FREE는
 * 전역 페이월(PaywallHost)이 자동으로 뜬다(api 인터셉터가 402 PLAN_REQUIRED를 가로챔).
 *
 * UI는 점수를 "안전 등급"처럼 강조하지 않는다(HC-1) — "확인이 필요한 항목 N건" 중심 유지.
 */
const LaborHealthDetailScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const {storeId} = route.params;
    const c = useThemeColors();

    const [data, setData] = useState<LaborHealthResponse | null>(null);
    const [tier, setTier] = useState<TierAccess>('NONE');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const detail = await fetchLaborHealthDetail(storeId);
            setData(detail);
            setTier('FULL');
        } catch (detailError) {
            if (!is402(detailError)) {
                logger.debug('[LaborHealthDetail] detail load failed', detailError);
                setError(true);
                setLoading(false);
                return;
            }
            try {
                const summary = await fetchLaborHealth(storeId);
                setData(summary);
                setTier('BASIC');
            } catch (summaryError) {
                // FREE 등 BASIC도 미충족 — 전역 PaywallHost가 이미 페이월을 띄웠다(api 인터셉터).
                // 여기서는 화면 자체가 비어 보이지 않게 잠금 안내만 보여준다.
                logger.debug('[LaborHealthDetail] summary load failed', summaryError);
                setData(null);
                setTier('NONE');
            }
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const header = <AppHeader title="노무 리스크 상세 분석" onBack={() => navigation.goBack()} />;

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="분석 중" description="매장 노무 리스크를 종합하고 있어요" />
            </ScreenContainer>
        );
    }
    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState
                    title="불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            </ScreenContainer>
        );
    }
    if (tier === 'NONE' || !data) {
        return (
            <ScreenContainer header={header}>
                <EmptyState
                    glyph={<Ionicons name="lock-closed-outline" size={26} color={c.textInverse} />}
                    title="스타터 플랜부터 이용할 수 있어요"
                    description="노무 리스크 건수·유형은 스타터, 항목별 설명·해소 가이드는 프로에서 볼 수 있어요."
                    primary={{label: '플랜 보기', onPress: () => navigation.navigate('Subscribe')}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <AppCard variant="flat" style={styles.scoreCard}>
                <AppText variant="caption" tone="secondary">참고 점수(0~100)</AppText>
                <AppText variant="headingSm" tone="primary" style={styles.scoreValue}>
                    {data.needsAttentionCount > 0
                        ? `확인이 필요한 항목 ${data.needsAttentionCount}건`
                        : '지금 확인이 필요한 항목이 없어요'}
                </AppText>
                <View style={styles.badgeRow}>
                    <AppBadge label={`위험 ${data.dangerCount}건`} tone="error" />
                    <AppBadge label={`주의 ${data.warnCount}건`} tone="warning" />
                    <AppBadge label={`참고 점수 ${data.score}`} tone="neutral" />
                </View>
            </AppCard>

            {tier === 'BASIC' ? (
                <AppCard variant="flat" style={[styles.upsell, {backgroundColor: c.brandPrimarySoft}]}>
                    <AppText variant="bodyMd" weight="700">프로에서 항목별 설명과 해소 방법까지 볼 수 있어요</AppText>
                    <AppButton
                        label="프로 플랜 보기"
                        variant="secondary"
                        onPress={() => navigation.navigate('Subscribe')}
                        style={styles.upsellCta}
                    />
                </AppCard>
            ) : null}

            <View style={styles.list}>
                {data.items.map((item, index) => {
                    const danger = item.severity === 'DANGER';
                    return (
                        <AppCard variant="flat" key={`${item.type}-${item.employeeId ?? 'store'}-${index}`}>
                            <View style={styles.titleRow}>
                                <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.title}>
                                    {item.employeeName
                                        ? `${TYPE_LABEL[item.type] ?? '노무 리스크'} · ${item.employeeName}`
                                        : (TYPE_LABEL[item.type] ?? '노무 리스크')}
                                </AppText>
                                <AppBadge label={danger ? '위험' : '주의'} tone={danger ? 'error' : 'warning'} />
                            </View>
                            {item.message ? (
                                <AppText variant="caption" tone="secondary" style={styles.message}>
                                    {item.message}
                                </AppText>
                            ) : null}
                        </AppCard>
                    );
                })}
            </View>

            <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                {data.disclaimer}
            </AppText>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    scoreCard: {marginBottom: spacing.lg, gap: spacing.xs},
    scoreValue: {marginTop: spacing.xs},
    badgeRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap'},
    upsell: {marginBottom: spacing.lg, gap: spacing.sm},
    upsellCta: {alignSelf: 'flex-start'},
    list: {gap: spacing.sm},
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    title: {flex: 1, minWidth: 0},
    message: {marginTop: spacing.xs},
    disclaimer: {marginTop: spacing.lg, marginBottom: spacing.md},
});

export default LaborHealthDetailScreen;
