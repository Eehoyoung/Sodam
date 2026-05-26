/**
 * AppListItem — 반복 리스트 행 (List row, 최소 56h).
 *
 * 좌측: 제목(1줄 말줄임) + 보조설명(최대 2줄)
 * 우측: 배지 / chevron / 커스텀 노드
 * (08 §1 List row 56h+, §5 반복 리스트 카드 간격 8)
 */
import React, {ReactNode} from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {colors, radius, spacing} from '../../../theme/tokens';

interface AppListItemProps {
    title: string;
    subtitle?: string;
    /** 우측 노드 (AppBadge 등). 문자열 '›' 도 가능 */
    right?: ReactNode;
    onPress?: () => void;
    left?: ReactNode;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export const AppListItem: React.FC<AppListItemProps> = ({
    title,
    subtitle,
    right,
    onPress,
    left,
    style,
    testID,
}) => {
    const Wrapper: any = onPress ? Pressable : View;
    return (
        <Wrapper
            testID={testID}
            onPress={onPress}
            accessibilityRole={onPress ? 'button' : undefined}
            accessibilityLabel={onPress ? `${title}${subtitle ? `, ${subtitle}` : ''}` : undefined}
            style={({pressed}: {pressed?: boolean}) => [
                styles.item,
                onPress && pressed ? styles.pressed : null,
                style,
            ]}>
            {left ? <View style={styles.left}>{left}</View> : null}
            <View style={styles.body}>
                <Text numberOfLines={1} style={styles.title}>
                    {title}
                </Text>
                {subtitle ? (
                    <Text numberOfLines={2} style={styles.subtitle}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            {typeof right === 'string' ? (
                <Text style={styles.chevron}>{right}</Text>
            ) : right ? (
                <View style={styles.right}>{right}</View>
            ) : null}
        </Wrapper>
    );
};

const styles = StyleSheet.create({
    item: {
        minHeight: 58,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 2,
    },
    pressed: {opacity: 0.95, transform: [{scale: 0.995}]},
    left: {flexShrink: 0},
    body: {flex: 1, minWidth: 0},
    title: {fontSize: 15, fontWeight: '700', color: colors.textPrimary},
    subtitle: {marginTop: 3, fontSize: 12, lineHeight: 17, color: colors.textSecondary},
    right: {flexShrink: 0},
    chevron: {fontSize: 22, color: colors.textTertiary, fontWeight: '400'},
});

export default AppListItem;
