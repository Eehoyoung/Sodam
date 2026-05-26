/**
 * SegmentedControl — 탭형 세그먼트 (확정 시안 .seg).
 * 선택 항목은 흰 배경 + 오렌지 텍스트, 비선택은 보조 텍스트.
 * 접근성: 각 항목 accessibilityState.selected.
 */
import React from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {colors, radius, shadow, spacing} from '../../../theme/tokens';

interface SegmentedControlProps {
    options: string[];
    /** 선택된 인덱스 */
    value: number;
    onChange: (index: number) => void;
    style?: StyleProp<ViewStyle>;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({options, value, onChange, style}) => {
    return (
        <View style={[styles.track, style]} accessibilityRole="tablist">
            {options.map((opt, i) => {
                const on = i === value;
                return (
                    <Pressable
                        key={opt + i}
                        onPress={() => onChange(i)}
                        accessibilityRole="tab"
                        accessibilityState={{selected: on}}
                        style={[styles.seg, on ? styles.segOn : null]}>
                        <Text numberOfLines={1} style={[styles.text, on ? styles.textOn : null]}>
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
        backgroundColor: '#EEE7DF',
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
    segOn: {backgroundColor: colors.background, ...shadow.sm},
    text: {fontSize: 12, fontWeight: '800', color: colors.textSecondary},
    textOn: {color: colors.brandPrimary},
});

export default SegmentedControl;
