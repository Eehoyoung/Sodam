/**
 * FilterChipRow — 줄바꿈 가능한 필터 칩 로우.
 *
 * SegmentedControl은 flex:1 고정폭이라 옵션이 많아지면 글자가 뭉개진다(가로 스크롤 미지원).
 * 옵션 수가 가변적이거나 5개를 넘을 수 있는 필터에는 이 컴포넌트를 쓴다.
 * PurchaseConfirmScreen의 분류 칩(7종)에서 검증된 패턴을 DS로 승격한 것.
 */
import React from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';
import {AppText} from './AppText';

interface FilterChipRowProps {
    options: string[];
    /** 선택된 인덱스 */
    value: number;
    onChange: (index: number) => void;
    style?: StyleProp<ViewStyle>;
}

export const FilterChipRow: React.FC<FilterChipRowProps> = ({options, value, onChange, style}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.row, style]} accessibilityRole="tablist">
            {options.map((opt, i) => {
                const on = i === value;
                return (
                    <Pressable
                        key={opt + i}
                        onPress={() => onChange(i)}
                        accessibilityRole="tab"
                        accessibilityState={{selected: on}}
                        style={[
                            styles.chip,
                            {
                                borderColor: on ? c.brandPrimary : c.border,
                                backgroundColor: on ? c.brandPrimarySoft : c.background,
                            },
                        ]}>
                        <AppText variant="caption" weight="700" tone={on ? 'brand' : 'secondary'} numberOfLines={1}>
                            {opt}
                        </AppText>
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
});

export default FilterChipRow;
