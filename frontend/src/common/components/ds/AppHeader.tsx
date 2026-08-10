/**
 * AppHeader — 모바일 앱형 헤더 (height 56).
 *
 * (08-micro-design-final-spec.md §2)
 *   left: back/menu/logo 중 하나 · center: title(1줄 말줄임) · right: 최대 2개 액션
 *   title 은 화면 목적을 명사로 ("급여", "매장 운영"). 동사 남발 금지.
 *   액션 아이콘은 시각 36 / 터치 44 (hitSlop).
 *   다크 헤더(dark)는 투명 배경 + 흰 텍스트.
 *
 * subtitle (v3 "컨텍스트 헤더", sodam-v3-09-schedule.html S1/S11): 특정 직원·매장 컨텍스트를
 * 보여줄 때 title 을 작은 라벨로, subtitle 을 굵은 큰 텍스트로 좌측 정렬 2줄 표시. 생략 시
 * 기존 가운데 정렬 1줄 title 그대로(하위 호환).
 */
import React, {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, layout, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

export interface HeaderAction {
    label?: string;
    icon?: ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
}

interface AppHeaderProps {
    title?: string;
    /**
     * v3 시안 "컨텍스트 헤더"(예: 특정 직원 근무 시프트/근무일지) — 있으면 title 을 작은
     * 라벨로, subtitle 을 굵은 큰 텍스트로 좌측 정렬 2줄로 그린다(기본 가운데 1줄 title 대체).
     */
    subtitle?: string;
    onBack?: () => void;
    /** 우측 액션 최대 2개 */
    actions?: HeaderAction[];
    /** 다크 배경용 (흰 텍스트) */
    dark?: boolean;
    /** 진행 단계 표시 등 우측 단순 텍스트 (예: '1/3') */
    rightText?: string;
    /** rightText가 행동을 나타낼 때 사용하는 접근 가능한 터치 핸들러. */
    onRightText?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({title, subtitle, onBack, actions = [], dark = false, rightText, onRightText}) => {
    const c = useThemeColors();
    const fg = dark ? c.textInverse : c.textPrimary;
    const trimmed = actions.slice(0, 2);

    return (
        <View
            style={[
                styles.header,
                dark
                    ? styles.headerDark
                    : [styles.headerLight, {backgroundColor: c.background, borderBottomColor: c.divider}],
            ]}>
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

            {subtitle ? (
                <View style={styles.stack}>
                    <Text numberOfLines={1} style={[styles.stackLabel, {color: c.textSecondary}]}>
                        {title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.stackValue, {color: fg}]}>
                        {subtitle}
                    </Text>
                </View>
            ) : (
                <Text numberOfLines={1} style={[styles.title, {color: fg}]}>
                    {title}
                </Text>
            )}

            <View style={[styles.side, styles.right]}>
                {rightText ? (
                    onRightText ? (
                        <Pressable
                            onPress={onRightText}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={rightText}
                            style={styles.rightTextButton}>
                            <Text style={[styles.rightText, {color: dark ? c.textInverse : c.textSecondary}]}>
                                {rightText}
                            </Text>
                        </Pressable>
                    ) : (
                        <Text style={[styles.rightText, {color: dark ? c.textInverse : c.textSecondary}]}>
                            {rightText}
                        </Text>
                    )
                ) : null}
                {trimmed.map((a, i) => (
                    <Pressable
                        key={i}
                        onPress={a.onPress}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={a.accessibilityLabel ?? a.label}
                        style={[styles.action, {backgroundColor: c.background, borderColor: c.border}]}>
                        {a.icon ?? <Text style={[styles.actionLabel, {color: c.brandPrimary}]}>{a.label}</Text>}
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerDark: {backgroundColor: colors.transparent},
    headerLight: {borderBottomWidth: 1},
    header: {
        height: layout.headerHeight,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    side: {minWidth: 40, flexDirection: 'row', alignItems: 'center'},
    right: {justifyContent: 'flex-end', flexShrink: 0, gap: spacing.xs},
    backBtn: {width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center'},
    backIcon: {fontSize: 30, fontWeight: '400', lineHeight: 32, marginTop: -2},
    title: {flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center'},
    stack: {flex: 1},
    stackLabel: {fontSize: 12, fontWeight: '600'},
    stackValue: {fontSize: 16, fontWeight: '800', marginTop: 2},
    action: {
        minWidth: 36,
        height: 36,
        borderRadius: 13,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    actionLabel: {fontSize: 12, fontWeight: '800'},
    rightTextButton: {minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center'},
    rightText: {fontSize: 13, fontWeight: '800'},
});

export default AppHeader;
