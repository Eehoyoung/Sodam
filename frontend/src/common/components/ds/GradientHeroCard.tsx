/**
 * GradientHeroCard — 그라디언트 히어로 카드 (v3 "링 & 패스" 강조 패턴).
 *
 * `AttendanceCreditSummaryCard`(recruitment §5, Phase A)에서 처음 쓰인 코랄/그린 그라디언트
 * 히어로를 재사용 가능한 프리미티브로 추출한 것 — 화면마다 LinearGradient + padding + radius를
 * 중복 구현하지 않는다(recruitment-monetization-gamification-plan.md §6.1 패턴 재사용 매트릭스).
 *
 * 기본 색은 `gradient.brandStrong`(코랄, "진한 히어로 배경") — 채용 상세류 화면(공고 상세·구직자
 * 상세)은 2026-07-20 확정에 따라 recruit 그린을 참조하지 않고 코랄/틸/앰버만 쓰므로, 별도
 * colors prop 없이 쓰면 화면 전반의 코랄 톤과 자동으로 맞는다. 그린이 필요하면
 * colors={recruit.gradient}로 override.
 */
import React, {ReactNode} from 'react';
import {StyleProp, StyleSheet, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {gradient as gradientTokens, radius, shadow, spacing} from '../../../theme/tokens';

interface GradientHeroCardProps {
    children: ReactNode;
    /** 기본 gradient.brandStrong(코랄). 다른 도메인은 override(예: recruit.gradient). */
    colors?: [string, string];
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export const GradientHeroCard: React.FC<GradientHeroCardProps> = ({children, colors, style, testID}) => (
    <LinearGradient
        testID={testID}
        colors={colors ?? gradientTokens.brandStrong}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.hero, style]}>
        {children}
    </LinearGradient>
);

const styles = StyleSheet.create({
    hero: {
        borderRadius: radius.xxl,
        padding: spacing.xl,
        overflow: 'hidden',
        ...shadow.md,
    },
});

export default GradientHeroCard;
