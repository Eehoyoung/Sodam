/**
 * StepScaffold — v3 토스식 "한 번에 하나만 묻는" 풀스크린 스텝.
 *
 * 얇은 상단바(뒤로가기 + 소담 로고, onBack 있을 때만) + 진행바(progress 0..1)
 * + 큰 질문 타이틀(28/800) + 한 입력/콘텐츠 + 하단 풀폭 CTA.
 * 가입·정산·설정 같은 긴 폼을 단계로 분해할 때 사용.
 *
 * 이 화면들은 보통 네이티브 스택 헤더를 끄고(headerShown:false) 쓴다 — 큰 타이틀이
 * 이미 화면 목적을 말해주므로 작은 헤더 타이틀은 중복 chrome이 된다. 대신 onBack 을
 * 넘기면 상단바가 나타나 뒤로가기 동선과 브랜드 로고를 잃지 않게 한다.
 *
 * props: { progress(0..1), title, children, footer, onBack? }
 *   - footer: 하단 고정 CTA 슬롯 (보통 <CtaStack><AppButton/></CtaStack> 또는 AppButton).
 *   - onBack: 있으면 상단에 뒤로가기+로고 바를 그린다(없으면 상단바 자체를 생략).
 */
import React, {ReactNode} from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
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
import {Brandmark} from './Brandmark';

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
    /** 뒤로가기 동작. 넘기면 상단에 뒤로가기+로고 바가 나타난다(없으면 상단바 생략). */
    onBack?: () => void;
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
    onBack,
    scroll = true,
    contentStyle,
    testID,
}) => {
    const c = useThemeColors();
    const clamped = Math.max(0, Math.min(1, progress));

    const head = (
        <>
            {onBack ? (
                <View style={styles.topBar}>
                    <Pressable
                        onPress={onBack}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="뒤로"
                        style={styles.backBtn}>
                        <Text style={[styles.backIcon, {color: c.textPrimary}]}>‹</Text>
                    </Pressable>
                    <Brandmark size={24} />
                    <View style={styles.topBarSpacer} />
                </View>
            ) : null}
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
            {/* Android 는 adjustResize 가 키보드 처리 → KeyboardAvoidingView(behavior=undefined)는
              * 무의미하고 ScrollView 와 겹쳐 마운트 setState 무한루프 유발. iOS 에서만 적용. */}
            {Platform.OS === 'ios' ? (
                <KeyboardAvoidingView style={styles.flex} behavior="padding">
                    {body}
                    {footer}
                </KeyboardAvoidingView>
            ) : (
                <>
                    {body}
                    {footer}
                </>
            )}
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
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    backBtn: {width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center'},
    backIcon: {fontSize: 26, lineHeight: 28, marginTop: -2},
    topBarSpacer: {width: 32},
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
