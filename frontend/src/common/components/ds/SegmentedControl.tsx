/**
 * SegmentedControl — 탭형 세그먼트 (확정 시안 .seg).
 * 선택 항목은 흰 배경 + 오렌지 텍스트, 비선택은 보조 텍스트.
 * 접근성: 각 항목 accessibilityState.selected.
 */
import React from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {radius, shadow, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

interface SegmentedControlProps {
    options: string[];
    /** 선택된 인덱스 */
    value: number;
    onChange: (index: number) => void;
    style?: StyleProp<ViewStyle>;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({options, value, onChange, style}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.track, {backgroundColor: c.surfaceMuted}, style]} accessibilityRole="tablist">
            {options.map((opt, i) => {
                const on = i === value;
                return (
                    <Pressable
                        key={opt + i}
                        onPress={() => onChange(i)}
                        accessibilityRole="tab"
                        accessibilityState={{selected: on}}
                        style={[styles.seg, on && {backgroundColor: c.background, ...shadow.sm}]}>
                        <Text numberOfLines={1} style={[styles.text, {color: c.textSecondary}, on && {color: c.brandPrimary}]}>
                            {opt}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        borderRadius: radius.xl,
        padding: 4,
        gap: 2,
    },
    seg: {
        flex: 1,
        minHeight: 36,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xs,
    },
    text: {fontSize: 12, fontWeight: '800'},
});

export default SegmentedControl;
