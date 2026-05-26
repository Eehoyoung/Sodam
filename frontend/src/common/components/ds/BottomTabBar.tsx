/**
 * BottomTabBar — 하단 5탭 (확정 시안 .tabs).
 *
 * (08-micro-design-final-spec.md §3) 5개 고정 · 현재 탭 오렌지 · 비활성 tertiary.
 * 역할별 라벨:
 *   owner/manager: 홈·매장·근태·급여·내정보
 *   employee:      홈·출퇴근·급여·정보·내정보
 *   personal:      홈·기록·급여·정보·내정보
 *
 * 프레젠테이셔널 — 실제 네비게이터 연결은 navigation 레이어에서 onPress 로 위임.
 * safe-area bottom inset 을 자체 예약한다.
 */
import React, {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, radius, shadow, spacing} from '../../../theme/tokens';

export type TabRole = 'owner' | 'manager' | 'employee' | 'personal';

export const TAB_LABELS: Record<TabRole, string[]> = {
    owner: ['홈', '매장', '근태', '급여', '내정보'],
    manager: ['홈', '매장', '근태', '급여', '내정보'],
    employee: ['홈', '출퇴근', '급여', '정보', '내정보'],
    personal: ['홈', '기록', '급여', '정보', '내정보'],
};

interface BottomTabBarProps {
    role?: TabRole;
    /** 현재 활성 탭 인덱스 */
    active: number;
    onTabPress: (index: number) => void;
    /** 라벨 직접 지정 (role 무시) */
    labels?: string[];
    icons?: ReactNode[];
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
    role = 'owner',
    active,
    onTabPress,
    labels,
    icons,
}) => {
    const insets = useSafeAreaInsets();
    const items = labels ?? TAB_LABELS[role];

    return (
        <View style={[styles.wrap, {paddingBottom: Math.max(insets.bottom, spacing.sm)}]}>
            <View style={styles.bar}>
                {items.map((label, i) => {
                    const on = i === active;
                    return (
                        <Pressable
                            key={label + i}
                            onPress={() => onTabPress(i)}
                            accessibilityRole="tab"
                            accessibilityState={{selected: on}}
                            accessibilityLabel={label}
                            style={styles.tab}>
                            {icons?.[i] ? <View style={styles.icon}>{icons[i]}</View> : null}
                            <Text numberOfLines={1} style={[styles.label, on ? styles.labelOn : null]}>
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        backgroundColor: 'transparent',
    },
    bar: {
        height: 62,
        borderRadius: radius.xxl,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadow.lg,
    },
    tab: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2},
    icon: {height: 20, alignItems: 'center', justifyContent: 'center'},
    label: {fontSize: 10, fontWeight: '800', color: colors.textTertiary},
    labelOn: {color: colors.brandPrimary},
});

export default BottomTabBar;
