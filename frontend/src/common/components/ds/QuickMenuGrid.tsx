/**
 * QuickMenuGrid / QuickMenuTile — 3열 아이콘 타일 그리드 (v3 "링 & 패스", docs/260720 WP-02).
 * EmployeeAttendanceHome에 인라인으로 있던 quickGrid/quickItem 스타일을 공용 컴포넌트로 승격.
 * 사장 대시보드 등 다른 화면에서도 동일 컴포넌트를 재사용한다.
 */
import React from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppText} from './AppText';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

export interface QuickMenuTileItem {
    key: string;
    label: string;
    /** Ionicons 아이콘명 */
    icon: string;
    onPress: () => void;
    color: {bg: string; icon: string};
    badge?: string;
    isNew?: boolean;
}

interface QuickMenuGridProps {
    items: QuickMenuTileItem[];
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export const QuickMenuGrid: React.FC<QuickMenuGridProps> = ({items, style, testID}) => {
    const c = useThemeColors();
    return (
        <View testID={testID} style={[styles.grid, style]}>
            {items.map(item => (
                <Pressable
                    key={item.key}
                    testID={`qm-tile-${item.key}`}
                    onPress={item.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={({pressed}) => [
                        styles.tile,
                        {backgroundColor: c.surface, borderColor: c.border},
                        pressed ? styles.pressed : null,
                    ]}>
                    {item.badge ? (
                        <View style={[styles.badge, {backgroundColor: c.error}]}>
                            <AppText variant="caption" tone="inverse" weight="700" style={styles.badgeText}>
                                {item.badge}
                            </AppText>
                        </View>
                    ) : null}
                    {item.isNew ? (
                        <View style={[styles.newTag, {backgroundColor: c.info}]}>
                            <AppText variant="caption" tone="inverse" weight="800" style={styles.newTagText}>N</AppText>
                        </View>
                    ) : null}
                    <View style={[styles.iconWrap, {backgroundColor: item.color.bg}]}>
                        <Ionicons name={item.icon} size={20} color={item.color.icon} />
                    </View>
                    <AppText variant="caption" weight="600" tone="secondary" center numberOfLines={1}>
                        {item.label}
                    </AppText>
                </Pressable>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    tile: {
        flexBasis: '31%',
        flexGrow: 1,
        minHeight: 82,
        borderRadius: radius.xl,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        position: 'relative',
    },
    pressed: {opacity: 0.85},
    // v3 시안은 원형 아이콘 배지 — radius.lg(둥근 사각)가 아니라 지름의 절반으로 완전한 원을 만든다.
    iconWrap: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    badge: {
        position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8,
        paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', zIndex: 1,
    },
    badgeText: {fontSize: 9, lineHeight: 11},
    newTag: {
        position: 'absolute', top: 6, left: 6, width: 16, height: 16, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center', zIndex: 1,
    },
    newTagText: {fontSize: 9, lineHeight: 11},
});

export default QuickMenuGrid;
