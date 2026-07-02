/**
 * ScreenContainer — 모든 화면의 단일 레이아웃 컨트롤러.
 *
 * 책임 (06-responsive-accessibility-qa.md):
 *   - SafeArea 통제 (상/하 inset)
 *   - KeyboardAvoiding (입력 화면에서 CTA 가림 방지)
 *   - Scroll 통제 + 마지막 항목이 하단 CTA/탭 뒤로 숨지 않게 bottom padding 예약
 *   - 하단 고정 CTA 는 position:absolute 금지 → footer 를 flex 형제로 배치
 *
 * 다크 화면(Splash/Login 등 그라디언트 배경)은 background 를 투명으로 두고
 * 부모에서 LinearGradient 로 감싸거나 backgroundColor 를 직접 지정한다.
 */
import React, {ReactNode} from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

interface ScreenContainerProps {
    children: ReactNode;
    /** 본문을 ScrollView 로 감싼다 (기본 false) */
    scroll?: boolean;
    /** 좌우/상단 패딩 적용 (기본 true) */
    padded?: boolean;
    /** 화면 배경색 (기본: 현재 테마의 surfaceCanvas). 다크/그라디언트 화면은 'transparent' */
    backgroundColor?: string;
    /** 하단 고정 영역 (CtaStack 등). flex 형제로 렌더 — absolute 아님 */
    footer?: ReactNode;
    /** 헤더 (AppHeader). scroll 영역 밖, 상단 고정 */
    header?: ReactNode;
    /** 키보드 회피 (기본: scroll 이면 true) */
    keyboardAvoiding?: boolean;
    /** SafeArea 적용 가장자리 (기본 ['top','bottom']) */
    edges?: Edge[];
    /** 상태바 글자색 (다크 배경이면 'light') */
    statusBarStyle?: 'light-content' | 'dark-content';
    contentStyle?: StyleProp<ViewStyle>;
    /** footer 가 없을 때 본문 하단 추가 여백 (탭바 높이 등) */
    bottomInset?: number;
    testID?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
    children,
    scroll = false,
    padded = true,
    backgroundColor,
    footer,
    header,
    keyboardAvoiding,
    edges = ['top', 'bottom'],
    statusBarStyle = 'dark-content',
    contentStyle,
    bottomInset = 0,
    testID,
}) => {
    const themed = useThemeColors();
    const bg = backgroundColor ?? themed.surfaceCanvas;
    const shouldAvoidKeyboard = keyboardAvoiding ?? scroll;

    // v3 토스식: 압도적 여백 — 좌우 24 / 상 28 기본
    const innerPadding: ViewStyle = padded
        ? {paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl + spacing.xs}
        : {};

    const body = scroll ? (
        <ScrollView
            style={styles.flex}
            contentContainerStyle={[
                styles.scrollContent,
                innerPadding,
                {paddingBottom: spacing.xl + bottomInset},
                contentStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
        </ScrollView>
    ) : (
        <View style={[styles.flex, innerPadding, {paddingBottom: bottomInset}, contentStyle]}>
            {children}
        </View>
    );

    const content = (
        <View style={styles.flex}>
            {header}
            {body}
            {footer}
        </View>
    );

    return (
        <SafeAreaView style={[styles.flex, {backgroundColor: bg}]} edges={edges} testID={testID}>
            <StatusBar barStyle={statusBarStyle} translucent backgroundColor="transparent" />
            {/*
              * Android 는 manifest windowSoftInputMode=adjustResize 로 키보드를 자동 처리하므로
              * KeyboardAvoidingView(behavior=undefined) 는 무의미하고, ScrollView 와 겹칠 때
              * 마운트 시 setState 무한루프("Maximum update depth")를 유발한다(ProfileBasics 등).
              * → iOS 에서만 KeyboardAvoidingView(padding) 적용.
              */}
            {shouldAvoidKeyboard && Platform.OS === 'ios' ? (
                <KeyboardAvoidingView style={styles.flex} behavior="padding">
                    {content}
                </KeyboardAvoidingView>
            ) : (
                content
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    flex: {flex: 1},
    scrollContent: {flexGrow: 1},
});

export default ScreenContainer;
