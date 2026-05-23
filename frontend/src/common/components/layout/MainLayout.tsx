import React, {ReactNode, useMemo, useRef} from 'react';
import {Dimensions, NativeSyntheticEvent, NativeScrollEvent, ScrollView, StyleSheet, View} from 'react-native';
import Header from './Header'; // 같은 디렉토리에 있으므로 경로 수정
import Footer from './Footer'; // 같은 디렉토리에 있으므로 경로 수정
import {useResponsiveStyles} from '../../../utils/responsive';
import {ENABLE_ANIMATIONS, stageAtLeast, ANIMATION_RECOVERY_STAGE} from '../../../navigation/config';

// Conditionally import Animated components only when needed
let Animated: any;
let useAnimatedScrollHandler: any;
let useAnimatedStyle: any;
let useSharedValue: any;
let interpolate: any;
let Extrapolate: any;

try {
  if (ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE)) {
    const reanimated = require('react-native-reanimated');
    Animated = reanimated.default;
    useAnimatedScrollHandler = reanimated.useAnimatedScrollHandler;
    useAnimatedStyle = reanimated.useAnimatedStyle;
    useSharedValue = reanimated.useSharedValue;
    interpolate = reanimated.interpolate;
    Extrapolate = reanimated.Extrapolate;
  }
} catch (error) {
  console.warn('[RECOVERY] MainLayout: Reanimated import failed, using fallback', error);
}

interface MainLayoutProps {
    children: ReactNode;
    title?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({children, title}) => {
    const {responsiveStyles} = useResponsiveStyles();
    const shouldUseAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    // Only use animated values when animations are enabled
    const scrollY = shouldUseAnimations ? useSharedValue(0) : null;
    const scrollViewRef = useRef<any>(null);

    // Calculate window height outside of worklet to avoid JSI violation
    const windowHeight = useMemo(() => Dimensions.get('window').height, []);

    // 스크롤 위치에 따라 Footer의 투명도 계산 (애니메이션 활성화 시에만)
    const footerAnimatedStyle = shouldUseAnimations && scrollY ? useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [0, windowHeight * 0.8, windowHeight],
            [0, 0, 1],
            Extrapolate.CLAMP
        ),
    })) : null;

    // 스크롤 이벤트 핸들러 (애니메이션 활성화 시에만)
    const scrollHandler = shouldUseAnimations && scrollY ? useAnimatedScrollHandler({
        onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollY.value = event.nativeEvent.contentOffset.y;
        },
    }) : undefined;

    if (!shouldUseAnimations) {
        // Fallback to regular ScrollView when animations are disabled
        return (
            <View style={styles.container}>
                <Header title={title}/>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={[styles.contentContainer, {padding: responsiveStyles.container.padding}]}
                >
                    <View style={styles.content}>
                        {children}
                    </View>
                    <View style={styles.footerSpacing}/>
                </ScrollView>
                <View style={styles.footerContainer}>
                    <Footer/>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header title={title}/>
            <Animated.ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[styles.contentContainer, {padding: responsiveStyles.container.padding}]}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
            >
                <View style={styles.content}>
                    {children}
                </View>
                <View style={styles.footerSpacing}/>
            </Animated.ScrollView>
            <Animated.View style={[styles.footerContainer, footerAnimatedStyle]}>
                <Footer/>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
    },
    footerSpacing: {
        height: 100, // Footer가 보이기 시작할 때 콘텐츠가 가려지지 않도록 여백 추가
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
    },
});

export default MainLayout;
