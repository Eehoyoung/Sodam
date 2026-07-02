import {AppToast, AppButton, AppHeader, AppText, CtaStack, ScreenContainer, SegmentedControl} from '../../../common/components/ds';
import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {useResponsive} from '../../../common/hooks/useResponsive';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {SubscriptionPlanCard, PlanCardView} from '../components/SubscriptionPlanCard';
import {isTossLive} from '../../../common/config/env';
import subscriptionApi, {
    BillingCycle,
    PlanCatalogItem,
    PlanType,
    SubscriptionResponse,
} from '../services/subscriptionApi';

// 결제 주기 세그먼트: 인덱스 ↔ BillingCycle 매핑 (월/반년/연)
const CYCLE_OPTIONS = ['월납', '반년납', '연납'] as const;
const CYCLE_BY_INDEX: readonly BillingCycle[] = ['MONTHLY', 'HALF_YEARLY', 'YEARLY'];

type Highlight = {text: string; included: boolean};

// 다크 모드 대응을 위해 accent 색은 테마에서 받아 매번 생성한다.
const buildPlanVisuals = (c: ThemeColors): Record<PlanType, {emoji: string; accent: string; recommended?: boolean; highlights: Highlight[]}> => ({
    FREE: {
        emoji: '🌱',
        accent: c.textSecondary,
        highlights: [
            {text: '출퇴근 무제한 (직원 2명)', included: true},
            {text: '급여 미리보기 (숫자 확인)', included: true},
            {text: '근로계약서 양식', included: true},
            {text: '광고 없음', included: true},
            {text: '급여 명세서 PDF 발급', included: false},
            {text: '4대보험 신고서', included: false},
        ],
    },
    STARTER: {
        emoji: '✨',
        accent: c.brandPrimary,
        highlights: [
            {text: '급여 자동 계산 + 명세서 PDF 발급', included: true},
            {text: '퇴직금 계산 · 노동법 경고(기본)', included: true},
            {text: '인건비 비율 분석', included: true},
            {text: '4대보험 조회·알림 (맛보기)', included: true},
            {text: '4대보험 신고서 자동작성', included: false},
            {text: '전자 근로계약서', included: false},
        ],
    },
    PRO: {
        emoji: '👑',
        accent: c.brandSecondary,
        recommended: true,
        highlights: [
            {text: '직원 무제한 + 풀 노동법 경고', included: true},
            {text: '연차 관리', included: true},
            {text: '4대보험 신고서 자동작성 (직접 제출)', included: true},
            {text: '전자 근로계약서·문서 보관', included: true},
            {text: '맞춤 대시보드 · 멀티매장 1개 포함', included: true},
        ],
    },
    PREMIUM: {
        emoji: '💎',
        accent: c.success,
        highlights: [
            {text: 'PRO 플랜 전부 포함', included: true},
            {text: '멀티매장 무제한 · 전담 CS', included: true},
            {text: '세무사·노무사 우선 연결 (실비 별도)', included: true},
            {text: '근로감독 증거 패키지', included: true},
        ],
    },
});

/**
 * 31 Subscribe — 확정 시안.
 * 플랜 선택. ⚠️ 결제 로직(subscribeFree/TossBillingAuth)은 변경 없이 표현만 교체.
 */
const SubscribeScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const r = useResponsive();
    const c = useThemeColors();
    const planVisuals = useMemo(() => buildPlanVisuals(c), [c]);
    // compact(<360): 플랜 카드 4장이 세로로 길게 흐르므로 list gap·subtitle 여백·이모지 크기를 한 단계 축소해 1.5장 fold-above 보장.
    const listGap = r.pick({compact: spacing.sm, default: spacing.md});
    const subtitleMargin = r.pick({compact: spacing.md, default: spacing.lg});
    const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
    const [current, setCurrent] = useState<SubscriptionResponse | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
    const [cycleIndex, setCycleIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const billingCycle: BillingCycle = CYCLE_BY_INDEX[cycleIndex] ?? 'MONTHLY';
    const isPaidSelected = selectedPlan !== null && selectedPlan !== 'FREE';
    const isActive = current?.status === 'ACTIVE';
    const isPaused = current?.status === 'PAUSED';

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [planList, mine] = await Promise.all([
                    subscriptionApi.getPlans().catch(() => buildFallbackPlans()),
                    subscriptionApi.getMyCurrent().catch(() => null),
                ]);
                if (!mounted) {
                    return;
                }
                setPlans(planList.length > 0 ? planList : buildFallbackPlans());
                setCurrent(mine);
                if (mine?.plan) {
                    setSelectedPlan(mine.plan);
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
    }, []);

    const handleSubscribe = async () => {
        if (!selectedPlan) {
            AppToast.show('플랜을 선택해 주세요.');
            return;
        }
        setProcessing(true);
        try {
            if (selectedPlan === 'FREE') {
                await subscriptionApi.subscribeFree();
                AppToast.success('무료 플랜으로 시작해요.');
                navigation.navigate('Home');
            } else if (isTossLive()) {
                // 운영 클라이언트 키가 주입된 경우에만 빌링 인증 창으로 이동.
                // 인증 성공 → subscribePaid(plan, authKey, billingCycle) 는 TossBillingAuth 화면이 호출한다.
                navigation.navigate('TossBillingAuth', {plan: selectedPlan, billingCycle});
            } else {
                // 샌드박스/빈 키 → 결제 창을 띄우지 않고 안내만 (키 주입 전 안전망).
                AppToast.show('유료 결제는 준비 중이에요. 곧 만나요!');
            }
        } catch (e: any) {
            // 유료 전환 실패 → 결제 실패 안내 화면 (갭분석 A4). 무료/일반 오류는 알럿.
            if (selectedPlan && selectedPlan !== 'FREE') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 크로스 네비게이터: PaymentFailed 는 루트 스택 라우트
                (navigation as any).navigate('PaymentFailed');
            } else {
                AppToast.error(e?.response?.data?.message ?? '구독 처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handlePause = async () => {
        setProcessing(true);
        try {
            const updated = await subscriptionApi.pause();
            setCurrent(updated);
            AppToast.success('구독을 일시정지했어요. 언제든 다시 시작할 수 있어요.');
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '일시정지에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setProcessing(false);
        }
    };

    const handleResume = async () => {
        setProcessing(true);
        try {
            const updated = await subscriptionApi.resume();
            setCurrent(updated);
            AppToast.success('구독을 다시 시작했어요.');
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '재개에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setProcessing(false);
        }
    };

    const renderPlan = (plan: PlanCatalogItem) => {
        const v = planVisuals[plan.name];
        const isSelected = selectedPlan === plan.name;
        const isCurrent = current?.plan === plan.name && current?.status === 'ACTIVE';

        const view: PlanCardView = {
            name: plan.name,
            displayName: plan.displayName,
            priceLabel: formatPrice(plan),
            emoji: v.emoji,
            recommended: v.recommended,
            highlights: v.highlights,
        };

        return (
            <SubscriptionPlanCard
                key={plan.name}
                view={view}
                selected={isSelected}
                isCurrent={isCurrent}
                onPress={() => setSelectedPlan(plan.name)}
            />
        );
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="구독" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack bordered>
                    <AppButton
                        label={selectedPlan === 'FREE' ? '무료로 시작하기' : '결제 진행하기'}
                        loading={processing}
                        disabled={!selectedPlan}
                        onPress={handleSubscribe}
                    />
                    <AppText variant="caption" tone="tertiary" center>구독 시 이용약관·개인정보 처리방침에 동의하게 됩니다.</AppText>
                </CtaStack>
            }>
            <AppText variant="headingLg" style={styles.title}>매장에 딱 맞는 플랜을 골라요</AppText>
            <AppText variant="bodyLg" tone="secondary" style={[styles.subtitle, {marginBottom: subtitleMargin}]}>
                언제든 해지·변경할 수 있어요. 대부분의 사장님은 프로를 선택해요.
            </AppText>

            {!loading && isPaidSelected ? (
                <View style={styles.cycleBlock}>
                    <AppText variant="titleMd" style={styles.cycleTitle}>결제 주기</AppText>
                    <SegmentedControl
                        options={[...CYCLE_OPTIONS]}
                        value={cycleIndex}
                        onChange={setCycleIndex}
                    />
                    <AppText variant="caption" tone="tertiary" style={styles.cycleHint}>
                        반년납 1개월 무료 / 연납 2개월 무료
                    </AppText>
                </View>
            ) : null}

            {loading ? (
                <AppText variant="bodyMd" tone="tertiary" center style={styles.loadingText}>플랜 정보를 불러오는 중…</AppText>
            ) : (
                <View style={[styles.list, {gap: listGap}]}>{plans.map(renderPlan)}</View>
            )}

            {!loading && (isActive || isPaused) ? (
                <View style={styles.manageBlock}>
                    <AppButton
                        label={isPaused ? '구독 재개하기' : '구독 일시정지'}
                        variant={isPaused ? 'secondary' : 'outline'}
                        loading={processing}
                        onPress={isPaused ? handleResume : handlePause}
                    />
                </View>
            ) : null}
        </ScreenContainer>
    );
};

function buildFallbackPlans(): PlanCatalogItem[] {
    return [
        {name: 'FREE', displayName: '무료', monthlyPriceKrw: 0, description: '출퇴근 무제한 + 급여 미리보기 (직원 2명)'},
        {name: 'STARTER', displayName: '스타터', monthlyPriceKrw: 9900, description: '급여 자동 계산 + 명세서 PDF 발급 (직원 5명)'},
        {name: 'PRO', displayName: '프로', monthlyPriceKrw: 19900, description: '직원 무제한 + 4대보험 신고서 + 전자 근로계약서'},
        {name: 'PREMIUM', displayName: '프리미엄', monthlyPriceKrw: 39900, description: '프로 전부 + 멀티매장 무제한 + 전담 CS'},
    ];
}

function formatPrice(p: PlanCatalogItem): string {
    if (p.monthlyPriceKrw <= 0) {
        return '무료';
    }
    return `월 ${p.monthlyPriceKrw.toLocaleString('ko-KR')}원`;
}

const styles = StyleSheet.create({
    title: {marginTop: spacing.sm},
    subtitle: {marginTop: spacing.sm, marginBottom: spacing.lg},
    loadingText: {marginVertical: spacing.xl},
    list: {gap: spacing.md},
    cycleBlock: {marginBottom: spacing.xl, gap: spacing.sm},
    cycleTitle: {fontWeight: '700'},
    cycleHint: {marginTop: spacing.xs},
    manageBlock: {marginTop: spacing.xxl},
});

export default SubscribeScreen;
