/**
 * 상태 화면 — EmptyState / ErrorState / LoadingState / PermissionState.
 *
 * (06-responsive-accessibility-qa.md 상태 화면 · 08 §13~15)
 * 공통: 중앙 정렬 mark + 제목 + 설명 + 다음 행동 CTA.
 * 색만으로 의미 전달 금지 — 항상 제목/설명/행동 포함.
 */
import React, {ReactNode} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '../../../theme/tokens';
import {AppButton} from './AppButton';

interface StateCta {
    label: string;
    onPress: () => void;
}

interface BaseStateProps {
    title: string;
    description?: string;
    primary?: StateCta;
    secondary?: StateCta;
    /** mark 안에 들어갈 글자/아이콘 (기본 도메인별) */
    glyph?: ReactNode;
    markColor?: string;
}

const StateLayout: React.FC<BaseStateProps & {defaultGlyph: string; defaultMark: string}> = ({
    title,
    description,
    primary,
    secondary,
    glyph,
    markColor,
    defaultGlyph,
    defaultMark,
}) => (
    <View style={styles.center}>
        <View style={styles.inner}>
            <View style={[styles.mark, {backgroundColor: markColor ?? defaultMark}]}>
                {typeof glyph === 'string' || glyph === undefined ? (
                    <Text style={styles.markText}>{(glyph as string) ?? defaultGlyph}</Text>
                ) : (
                    glyph
                )}
            </View>
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.copy}>{description}</Text> : null}
            {primary ? (
                <AppButton label={primary.label} onPress={primary.onPress} style={styles.cta} />
            ) : null}
            {secondary ? (
                <AppButton
                    label={secondary.label}
                    onPress={secondary.onPress}
                    variant="secondary"
                    style={styles.ctaSub}
                />
            ) : null}
        </View>
    </View>
);

export const EmptyState: React.FC<BaseStateProps> = props => (
    <StateLayout {...props} defaultGlyph="+" defaultMark={colors.brandPrimary} />
);

export const ErrorState: React.FC<BaseStateProps> = props => (
    <StateLayout {...props} defaultGlyph="!" defaultMark={colors.error} />
);

export const PermissionState: React.FC<BaseStateProps> = props => (
    <StateLayout {...props} defaultGlyph="!" defaultMark={colors.warning} />
);

/** 성공 화면 (출근/정정/휴가/가입/발급 완료 등) — 초록 체크 마크 */
export const SuccessState: React.FC<BaseStateProps> = props => (
    <StateLayout {...props} defaultGlyph="✓" defaultMark={colors.success} />
);

interface LoadingStateProps {
    title?: string;
    description?: string;
    /** spinner 대신 점진 막대 등 커스텀 */
    children?: ReactNode;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    title = '불러오는 중',
    description = '매장 상태를 불러오고 있어요',
    children,
}) => (
    <View style={styles.center}>
        <View style={styles.inner}>
            <View style={[styles.mark, {backgroundColor: colors.brandPrimary}]}>
                <ActivityIndicator color={colors.textInverse} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.copy}>{description}</Text> : null}
            {children}
        </View>
    </View>
);

const styles = StyleSheet.create({
    center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
    inner: {width: '100%', maxWidth: 320, alignItems: 'center'},
    mark: {
        width: 56,
        height: 56,
        borderRadius: radius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    markText: {color: colors.textInverse, fontSize: 22, fontWeight: '900'},
    title: {
        fontSize: 22,
        lineHeight: 30,
        fontWeight: '800',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    copy: {
        marginTop: spacing.sm,
        fontSize: 14,
        lineHeight: 21,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    cta: {marginTop: spacing.lg, alignSelf: 'stretch'},
    ctaSub: {marginTop: spacing.sm, alignSelf: 'stretch'},
});

export default {EmptyState, ErrorState, PermissionState, LoadingState, SuccessState};
