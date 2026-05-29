import {AppToast, ConfirmSheet} from '../../../common/components/ds';
import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {tokens, spacing} from '../../../theme/tokens';
import {useResponsive} from '../../../common/hooks/useResponsive';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    CtaStack,
    ScreenContainer,
} from '../../../common/components/ds';
import subscriptionApi, {
    PlanCatalogItem,
    PlanType,
    SubscriptionResponse,
} from '../services/subscriptionApi';

type Highlight = {text: string; included: boolean};

// 다크 모드 대응을 위해 accent 색은 테마에서 받아 매번 생성한다.
const buildPlanVisuals = (c: ThemeColors): Record<PlanType, {emoji: string; accent: string; recommended?: boolean; highlights: Highlight[]}> => ({
    FREE: {
        emoji: '🌱',
        accent: c.textSecondary,
        highlights: [
            {text: '기본 근태 기록 + 급여 자동 계산', included: true},
            {text: 'FAQ + 이메일 고객 지원', included: true},
            {text: '광고 노출', included: true},
            {text: '급여 명세서 발급', included: false},
            {text: '세무 환급 연계', included: false},
        ],
    },
    BUSINESS: {
        emoji: '✨',
        accent: c.brandPrimary,
        recommended: true,
        highlights: [
            {text: 'NFC + GPS 근태 + 급여 자동 산출', included: true},
            {text: '급여 명세서 발급 + 직원 알림', included: true},
            {text: '맞춤 대시보드', included: true},
            {text: '채널톡 1:1 응대', included: true},
            {text: '세무 환급 별도 신청', included: false},
        ],
    },
    PREMIUM: {
        emoji: '👑',
        accent: c.brandSecondary,
        highlights: [
            {text: '비즈니스 플랜 전부 포함', included: true},
            {text: '세무사 1:1 상담 + 신고 대행', included: true},
            {text: '다매장 통합 대시보드', included: true},
            {text: '연 1회 무료 추가 세무 상담', included: true},
        ],
    },
    COMMISSION: {
        emoji: '💸',
        accent: c.success,
        highlights: [
            {text: '종합소득세 환급 신청 대행', included: true},
            {text: '필요 서류 자동 발급', included: true},
            {text: '세무사 상담 포함', included: true},
            {text: '월정액 없음 · 환급금의 10~20% 수수료', included: true},
        ],
    },
});

/**
 * 31 Subscribe — 확정 시안.
 * 플랜 선택. ⚠️ 결제 로직(subscribeFree/TossBillingAuth/COMMISSION)은 변경 없이 표현만 교체.
 */
const SubscribeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const r = useResponsive();
    const c = useThemeColors();
    const planVisuals = useMemo(() => buildPlanVisuals(c), [c]);
    // compact(<360): 플랜 카드 4장이 세로로 길게 흐르므로 list gap·subtitle 여백·이모지 크기를 한 단계 축소해 1.5장 fold-above 보장.
    const listGap = r.pick({compact: spacing.sm, default: spacing.md});
    const subtitleMargin = r.pick({compact: spacing.md, default: spacing.lg});
    const planEmojiSize = r.pick({compact: 24, default: 28});
    const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
    const [current, setCurrent] = useState<SubscriptionResponse | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

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
            } else if (selectedPlan === 'COMMISSION') {
                ConfirmSheet.confirm({
                    title: '환급 신청을 시작할까요?',
                    description: '환급형은 종합소득세 환급 금액의 10~20% 수수료로 운영돼요. 신청서 작성으로 이동해요.',
                    primary: {label: '신청 시작', onPress: () => navigation.navigate('TaxRefundIntake')},
                    secondary: {label: '나중에'},
                });
            } else {
                navigation.navigate('TossBillingAuth', {plan: selectedPlan});
            }
        } catch (e: any) {
            // 유료 전환 실패 → 결제 실패 안내 화면 (갭분석 A4). 무료/일반 오류는 알럿.
            if (selectedPlan && selectedPlan !== 'FREE') {
                navigation.navigate('PaymentFailed');
            } else {
                AppToast.error(e?.response?.data?.message ?? '구독 처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
            }
        } finally {
            setProcessing(false);
        }
    };

    const renderPlan = (plan: PlanCatalogItem) => {
        const v = planVisuals[plan.name];
        const isSelected = selectedPlan === plan.name;
        const isCurrent = current?.plan === plan.name && current.status === 'ACTIVE';

        return (
            <AppCard key={plan.name} variant="flat" onPress={() => setSelectedPlan(plan.name)} selected={isSelected} style={styles.planCard}>
                <View style={styles.planHeader}>
                    <View style={styles.planTitleRow}>
                        <AppText style={[styles.planEmoji, {fontSize: planEmojiSize}]}>{v.emoji}</AppText>
                        <View>
                            <AppText variant="headingSm" style={{color: v.accent}}>{plan.displayName}</AppText>
                            <AppText variant="caption" tone="secondary" style={styles.planPrice}>{formatPrice(plan)}</AppText>
                        </View>
                    </View>
                    <View style={styles.planBadges}>
                        {v.recommended ? <AppBadge label="추천" tone="warning" /> : null}
                        {isCurrent ? <AppBadge label="이용 중" tone="success" /> : null}
                    </View>
                </View>

                <AppText variant="caption" tone="secondary" style={styles.planDescription}>{plan.description}</AppText>

                <View style={[styles.divider, {backgroundColor: c.divider}]} />

                {v.highlights.map((h, idx) => (
                    <View key={idx} style={styles.highlightRow}>
                        <AppText style={[styles.checkIcon, {color: h.included ? c.success : c.textTertiary}]}>{h.included ? '✓' : '–'}</AppText>
                        <AppText variant="caption" tone={h.included ? 'primary' : 'tertiary'} style={styles.flex}>{h.text}</AppText>
                    </View>
                ))}
            </AppCard>
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
            <AppText variant="headingMd" style={styles.title}>소담과 함께 시작해요</AppText>
            <AppText variant="bodyMd" tone="secondary" style={[styles.subtitle, {marginBottom: subtitleMargin}]}>
                매장 규모에 맞는 플랜을 선택해 주세요. 언제든 해지·변경할 수 있어요.
            </AppText>

            {loading ? (
                <AppText variant="bodyMd" tone="tertiary" center style={styles.loadingText}>플랜 정보를 불러오는 중…</AppText>
            ) : (
                <View style={[styles.list, {gap: listGap}]}>{plans.map(renderPlan)}</View>
            )}
        </ScreenContainer>
    );
};

function buildFallbackPlans(): PlanCatalogItem[] {
    return [
        {name: 'FREE', displayName: '기본', monthlyPriceKrw: 0, description: '기본 근태/급여 + 광고 노출'},
        {name: 'BUSINESS', displayName: '비즈니스', monthlyPriceKrw: 15000, description: '근태+급여+명세서+대시보드+CS'},
        {name: 'PREMIUM', displayName: '프리미엄', monthlyPriceKrw: 50000, description: '비즈니스 전부 + 세무사 1:1'},
        {name: 'COMMISSION', displayName: '환급형', monthlyPriceKrw: 0, description: '종소세 환급 수수료 10~20%'},
    ];
}

function formatPrice(p: PlanCatalogItem): string {
    if (p.name === 'COMMISSION') {
        return '환급금의 10~20%';
    }
    if (p.monthlyPriceKrw <= 0) {
        return '무료';
    }
    return `월 ${p.monthlyPriceKrw.toLocaleString('ko-KR')}원`;
}

const styles = StyleSheet.create({
    title: {marginTop: spacing.sm},
    subtitle: {marginTop: spacing.xs, marginBottom: spacing.lg},
    loadingText: {marginVertical: spacing.xl},
    list: {gap: spacing.md},
    planCard: {},
    planHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
    planTitleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    planEmoji: {fontSize: 28},
    planPrice: {marginTop: 2},
    planBadges: {flexDirection: 'row', gap: spacing.xs},
    planDescription: {marginTop: spacing.md},
    divider: {height: 1, marginVertical: spacing.md},
    highlightRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs},
    checkIcon: {width: 22, fontSize: 16, fontWeight: '700'},
    flex: {flex: 1},
});

export default SubscribeScreen;
