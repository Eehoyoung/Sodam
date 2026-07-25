import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AmountText, AppButton, AppCard, AppText, Brandmark, ScreenContainer} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

interface Props {
    /** 'gate' = 유료기능 진입 차단, 'expired' = 구독 만료 */
    mode?: 'gate' | 'expired';
    /** 차단된 기능 이름 (gate 모드 카피에 사용) */
    featureName?: string;
    onPrimary: () => void;
    onSecondary?: () => void;
}

/**
 * A5 구독 만료 / 결제 누락 차단 안내 (갭분석 P0).
 * ⚠️ 표현/라우팅만 — 결제 트리거·금액 로직 불변 (프로젝트 운영 기준 승인필수).
 * plan-card는 코랄 테두리+코랄소프트 배경으로 아티팩트 O9와 정렬
 * (docs/260720/artifacts/sodam-v3-13-ops.html 대조 반영).
 */
const SubscriptionGateScreen: React.FC<Props> = ({mode = 'gate', featureName = '명세서 발급', onPrimary, onSecondary}) => {
    const expired = mode === 'expired';
    const c = useThemeColors();
    return (
        <ScreenContainer>
            <View style={styles.center}>
                <Brandmark size={56} label={expired ? '!' : '✦'} backgroundColor={expired ? c.warning : c.brandPrimary} />
                <AppText variant="headingMd" center style={styles.title}>
                    {expired ? '구독이 만료됐어요' : '비즈니스 플랜에서 쓸 수 있어요'}
                </AppText>
                <AppText variant="bodyMd" tone="secondary" center style={styles.desc}>
                    {expired
                        ? '결제 수단을 확인하면 기능을 다시 쓸 수 있어요.'
                        : `${featureName}은 비즈니스 플랜 기능이에요. 지금 시작하면 바로 직원에게 명세서를 보낼 수 있어요.`}
                </AppText>

                {/* 아티팩트 O9 plan-card: 코랄 테두리 + 코랄소프트 배경(--coral-soft = brandPrimarySoft) */}
                <AppCard
                    variant="flat"
                    style={[styles.card, {backgroundColor: c.brandPrimarySoft, borderWidth: 1.5, borderColor: c.brandPrimary}]}>
                    <AppText variant="titleMd" tone="primary" weight="700">비즈니스 플랜</AppText>
                    <AmountText size={20} tone="brand" style={styles.cardPrice}>월 15,000원</AmountText>
                    <AppText variant="caption" tone="tertiary" style={styles.cardSub}>급여명세 발급 · 직원 알림 · 정산 준비 자동화</AppText>
                </AppCard>

                <View style={styles.ctas}>
                    <AppButton label={expired ? '결제 수단 관리' : '플랜 보기'} onPress={onPrimary} />
                    {onSecondary ? <AppButton label="나중에" variant="ghost" onPress={onSecondary} /> : null}
                </View>
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    center: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl},
    title: {marginTop: spacing.md},
    desc: {marginTop: spacing.sm, maxWidth: 320},
    card: {alignItems: 'center', alignSelf: 'stretch', marginTop: spacing.lg},
    cardPrice: {marginTop: spacing.xs},
    cardSub: {marginTop: spacing.xs, textAlign: 'center'},
    ctas: {alignSelf: 'stretch', marginTop: spacing.lg, gap: spacing.sm},
});

export default SubscriptionGateScreen;
