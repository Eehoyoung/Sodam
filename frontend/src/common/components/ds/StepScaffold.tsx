/**
 * StepScaffold — v3 토스식 "한 번에 하나만 묻는" 풀스크린 스텝.
 *
 * 상단 진행바(progress 0..1) + 큰 질문 타이틀(28/800) + 한 입력/콘텐츠 + 하단 풀폭 CTA.
 * 가입·정산·설정 같은 긴 폼을 단계로 분해할 때 사용.
 *
 * props: { progress(0..1), title, children, footer }
 *   - footer: 하단 고정 CTA 슬롯 (보통 <CtaStack><AppButton/></CtaStack> 또는 AppButton).
 */
import React, {ReactNode} from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

interface StepScaffoldProps {
    /** 진행률 0..1 (예: 3단계 중 2단계 → 2/3) */
    progress: number;
    /** 큰 질문 타이틀 (28/800) */
    title: string;
    /** 타이틀 아래 보조 설명 한 줄 (선택) */
    subtitle?: string;
    children: ReactNode;
    /** 하단 고정 CTA 슬롯 */
    footer?: ReactNode;
    /** 본문 스크롤 (기본 true) */
    scroll?: boolean;
    contentStyle?: StyleProp<ViewStyle>;
    testID?: string;
}

export const StepScaffold: React.FC<StepScaffoldProps> = ({
    progress,
    title,
    subtitle,
    children,
    footer,
    scroll = true,
    contentStyle,
    testID,
}) => {
    const c = useThemeColors();
    const clamped = Math.max(0, Math.min(1, progress));

    const head = (
        <>
            <View style={[styles.track, {backgroundColor: c.surfaceMuted}]}>
                <View
                    style={[
                        styles.fill,
                        {width: `${clamped * 100}%`, backgroundColor: c.brandPrimary},
                    ]}
                />
            </View>
            <Text style={[styles.title, {color: c.textPrimary}]}>{title}</Text>
            {subtitle ? (
                <Text style={[styles.subtitle, {color: c.textSecondary}]}>{subtitle}</Text>
            ) : null}
        </>
    );

    const body = scroll ? (
        <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {head}
            <View style={styles.content}>{children}</View>
        </ScrollView>
    ) : (
        <View style={[styles.flex, styles.staticPad, contentStyle]}>
            {head}
            <View style={styles.content}>{children}</View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.flex, {backgroundColor: c.surfaceCanvas}]} testID={testID}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {body}
                {footer}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    flex: {flex: 1},
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
    },
    staticPad: {paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl},
    track: {height: 6, borderRadius: radius.pill, overflow: 'hidden'},
    fill: {height: 6, borderRadius: radius.pill},
    title: {
        marginTop: spacing.xxl,
        fontSize: 28,
        lineHeight: 36,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    subtitle: {marginTop: spacing.sm, fontSize: 16, lineHeight: 24},
    content: {marginTop: spacing.xxl},
});

export default StepScaffold;
