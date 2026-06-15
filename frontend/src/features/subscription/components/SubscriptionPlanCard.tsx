/**
 * SubscriptionPlanCard — 구독 플랜 카드 (프레젠테이셔널).
 *
 * 4티어 수익화 모델의 시각 위계를 담는다.
 *   FREE 🌱 · STARTER ✨ · PRO 👑(추천/앵커) · PREMIUM 💎
 * PRO 는 추천 배지 + 브랜드 ring/elevation 으로 시선을 잡는 앵커.
 * 포함 항목은 success ✓, 잠금 항목은 muted "–" 로 렌더한다.
 *
 * 순수 컴포넌트: props 로만 동작하며 API·네비게이션·데이터 패칭 없음.
 * accent/색은 항상 useThemeColors() 에서 받아 다크 모드 안전.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppBadge, AppCard, AppText} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useResponsive} from '../../../common/hooks/useResponsive';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';

export type PlanName = 'FREE' | 'STARTER' | 'PRO' | 'PREMIUM';

export type PlanHighlight = {text: string; included: boolean};

export type PlanCardView = {
    name: PlanName;
    displayName: string;
    /** 이미 포맷된 가격, 예: "무료" | "월 9,900원" */
    priceLabel: string;
    emoji: string;
    recommended?: boolean;
    highlights: PlanHighlight[];
};

export interface SubscriptionPlanCardProps {
    view: PlanCardView;
    selected: boolean;
    /** 현재 이용 중 → "이용 중" 배지 */
    isCurrent: boolean;
    onPress: () => void;
}

/** 티어별 accent 색 — 다크 모드 대응 위해 테마에서 매번 해석한다. */
// 플랜별 라인 아이콘 (이모지 금지 — DS v3)
const iconFor = (name: PlanName): string => {
    switch (name) {
        case 'FREE': return 'leaf-outline';
        case 'STARTER': return 'sparkles-outline';
        case 'PRO': return 'ribbon-outline';
        case 'PREMIUM': return 'diamond-outline';
        default: return 'pricetag-outline';
    }
};

const accentFor = (name: PlanName, c: ThemeColors): string => {
    switch (name) {
        case 'FREE':
            return c.textSecondary;
        case 'STARTER':
            return c.brandPrimary;
        case 'PRO':
            return c.brandSecondary;
        case 'PREMIUM':
            return c.success;
        default:
            return c.textPrimary;
    }
};

export const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
    view,
    selected,
    isCurrent,
    onPress,
}) => {
    const c = useThemeColors();
    const r = useResponsive();
    const accent = accentFor(view.name, c);
    const isAnchor = !!view.recommended;
    // compact(<360): 이모지·여백을 한 단계 줄여 카드 4장이 덜 흐르게.
    const emojiSize = r.pick({compact: 24, default: 28});
    const rowGap = r.pick({compact: spacing.xs - 1, default: spacing.xs});

    const a11yLabel = `${view.displayName} 플랜 ${view.priceLabel}${
        isAnchor ? ', 추천' : ''
    }${isCurrent ? ', 이용 중' : ''}`;

    return (
        <AppCard
            variant={isAnchor ? 'elevated' : 'flat'}
            onPress={onPress}
            selected={selected}
            accessibilityLabel={a11yLabel}
            style={[
                styles.card,
                // 앵커(PRO)는 선택 전에도 옅은 브랜드 ring 으로 강조 — 선택 시 AppCard 가 굵은 ring 처리.
                isAnchor && !selected ? {borderWidth: 1.5, borderColor: c.brandPrimaryMuted} : null,
            ]}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Ionicons name={iconFor(view.name)} size={emojiSize} color={accent} style={styles.emoji} />
                    <View style={styles.flexShrink}>
                        <AppText variant="headingSm" style={{color: accent}}>
                            {view.displayName}
                        </AppText>
                        <AppText variant="caption" tone="secondary" style={styles.price}>
                            {view.priceLabel}
                        </AppText>
                    </View>
                </View>
                <View style={styles.badges}>
                    {isAnchor ? <AppBadge label="추천" tone="warning" /> : null}
                    {isCurrent ? <AppBadge label="이용 중" tone="success" /> : null}
                </View>
            </View>

            <View style={[styles.divider, {backgroundColor: c.divider}]} />

            <View style={[styles.highlights, {gap: rowGap}]}>
                {view.highlights.map((h, idx) => (
                    <View key={idx} style={styles.row}>
                        <AppText
                            style={[styles.icon, {color: h.included ? c.success : c.textTertiary}]}>
                            {h.included ? '✓' : '–'}
                        </AppText>
                        <AppText
                            variant="caption"
                            tone={h.included ? 'primary' : 'tertiary'}
                            style={styles.flex}>
                            {h.text}
                        </AppText>
                    </View>
                ))}
            </View>
        </AppCard>
    );
};

const styles = StyleSheet.create({
    card: {},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
    titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1},
    flexShrink: {flexShrink: 1},
    emoji: {fontSize: 28},
    price: {marginTop: 2},
    badges: {alignItems: 'flex-end', gap: spacing.xs},
    divider: {height: 1, marginVertical: spacing.md},
    highlights: {gap: spacing.xs},
    row: {flexDirection: 'row', alignItems: 'flex-start'},
    icon: {width: 22, fontSize: 16, fontWeight: '700'},
    flex: {flex: 1},
});

export default SubscriptionPlanCard;
