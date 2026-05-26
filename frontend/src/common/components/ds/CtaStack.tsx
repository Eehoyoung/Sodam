/**
 * CtaStack — 하단 고정 CTA 묶음.
 *
 * - ScreenContainer 의 footer 로 전달해 화면 하단에 고정한다.
 * - safe-area bottom inset 을 예약해 홈 인디케이터에 가리지 않는다.
 * - 버튼은 위에서 아래로 primary → secondary 순서.
 * - position:absolute 금지 — flex 형제로만 배치 (스펙).
 */
import React, {ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing} from '../../../theme/tokens';

interface CtaStackProps {
    children: ReactNode;
    /** 상단 구분선 표시 (스크롤 콘텐츠와 분리) */
    bordered?: boolean;
    /** 배경 투명 (그라디언트/다크 화면) */
    transparent?: boolean;
}

export const CtaStack: React.FC<CtaStackProps> = ({children, bordered = false, transparent = false}) => {
    const insets = useSafeAreaInsets();
    return (
        <View
            style={[
                styles.wrap,
                bordered && styles.bordered,
                !transparent && styles.solid,
                {paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs},
            ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        gap: spacing.sm,
    },
    solid: {backgroundColor: colors.surfaceCanvas},
    bordered: {borderTopWidth: 1, borderTopColor: colors.divider},
});

export default CtaStack;
