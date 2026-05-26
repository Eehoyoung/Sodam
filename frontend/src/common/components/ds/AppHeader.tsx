/**
 * AppHeader — 모바일 앱형 헤더 (height 56).
 *
 * (08-micro-design-final-spec.md §2)
 *   left: back/menu/logo 중 하나 · center: title(1줄 말줄임) · right: 최대 2개 액션
 *   title 은 화면 목적을 명사로 ("급여", "매장 운영"). 동사 남발 금지.
 *   액션 아이콘은 시각 36 / 터치 44 (hitSlop).
 *   다크 헤더(dark)는 투명 배경 + 흰 텍스트.
 */
import React, {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, layout, spacing} from '../../../theme/tokens';

export interface HeaderAction {
    label?: string;
    icon?: ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
}

interface AppHeaderProps {
    title?: string;
    onBack?: () => void;
    /** 우측 액션 최대 2개 */
    actions?: HeaderAction[];
    /** 다크 배경용 (흰 텍스트) */
    dark?: boolean;
    /** 진행 단계 표시 등 우측 단순 텍스트 (예: '1/3') */
    rightText?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({title, onBack, actions = [], dark = false, rightText}) => {
    const fg = dark ? colors.textInverse : colors.textPrimary;
    const trimmed = actions.slice(0, 2);

    return (
        <View style={[styles.header, dark ? styles.darkHeader : styles.lightHeader]}>
            <View style={styles.side}>
                {onBack ? (
                    <Pressable
                        onPress={onBack}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="뒤로"
                        style={styles.backBtn}>
                        <Text style={[styles.backIcon, {color: fg}]}>‹</Text>
                    </Pressable>
                ) : null}
            </View>

            <Text numberOfLines={1} style={[styles.title, {color: fg}]}>
                {title}
            </Text>

            <View style={[styles.side, styles.right]}>
                {rightText ? (
                    <Text style={[styles.rightText, {color: dark ? colors.textInverse : colors.textSecondary}]}>
                        {rightText}
                    </Text>
                ) : null}
                {trimmed.map((a, i) => (
                    <Pressable
                        key={i}
                        onPress={a.onPress}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={a.accessibilityLabel ?? a.label}
                        style={styles.action}>
                        {a.icon ?? <Text style={styles.actionLabel}>{a.label}</Text>}
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: layout.headerHeight,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    lightHeader: {
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    darkHeader: {backgroundColor: 'transparent'},
    side: {minWidth: 40, flexDirection: 'row', alignItems: 'center'},
    right: {justifyContent: 'flex-end', flexShrink: 0, gap: spacing.xs},
    backBtn: {width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center'},
    backIcon: {fontSize: 30, fontWeight: '400', lineHeight: 32, marginTop: -2},
    title: {flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center'},
    action: {
        minWidth: 36,
        height: 36,
        borderRadius: 13,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionLabel: {fontSize: 12, fontWeight: '800', color: colors.brandPrimary},
    rightText: {fontSize: 13, fontWeight: '800'},
});

export default AppHeader;
