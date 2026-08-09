/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
/* eslint-disable react-native/no-color-literals -- 다크 인트로 톤(Splash/RoleStart/WelcomeMain/KakaoLogin과 동일 계열) 고정 색상. */
import React, {useMemo, useRef, useState} from 'react';
import {
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import {AppButton, Brandmark} from '../../../common/components/ds';
import {useResponsive} from '../../../common/hooks/useResponsive';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';

interface Slide {
    headline: string;
    body: string;
}

// 아티팩트(sodam-v3-01-auth.html "03 OnboardingCarousel")는 슬라이드별 색 아이콘이 아니라
// Splash/RoleStart/WelcomeMain/KakaoLogin과 동일한 마스코트 brandmark-logo를 그대로 쓴다 —
// 슬라이드마다 다른 그라디언트 아이콘 서클로 분화했던 이전 구현을 시안대로 통일.
// 1번째 슬라이드 카피는 아티팩트와 1:1 — "출근 기록을 서로 믿게" / "매장 반경과 NFC 태그로 기록의 기준을 만들어요."
const SLIDES: Slide[] = [
    {
        headline: '출근 기록을\n서로 믿게',
        body: '매장 반경과 NFC 태그로 기록의 기준을 만들어요.',
    },
    {
        headline: '급여,\n자동 계산으로 간편하게',
        body: '주휴수당·연장·야간 시급 자동 계산.\n월말 30분이면 정산 끝나요.',
    },
    {
        headline: '출퇴근 기록이\n분쟁의 증거가 돼요',
        body: 'NFC·GPS로 남는 출퇴근 기록.\n노무 분쟁 때 사장님을 지켜줘요.',
    },
];

const OnboardingCarouselScreen: React.FC = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 크로스 네비게이터: Auth 스택에서 루트(Welcome)로 reset
    const navigation = useNavigation<any>();
    const {width: WIDTH} = useWindowDimensions();
    const {pick, isCompactHeight} = useResponsive();
    // 작은/짧은 화면(iPhone SE, 360×640)에서 글리프가 폴드 아래로 밀리거나 헤드라인과 겹치는 것 방지.
    const illoSize = pick({compact: 160, default: 220});
    const illoMarginTop = isCompactHeight ? tokens.spacing.lg : tokens.spacing.huge;
    const styles = useMemo(
        () => makeStyles(illoSize, illoMarginTop),
        [illoSize, illoMarginTop],
    );
    const [index, setIndex] = useState(0);
    const listRef = useRef<FlatList<Slide>>(null);

    const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const newIndex = Math.round(e.nativeEvent.contentOffset.x / WIDTH);
        if (newIndex !== index) {setIndex(newIndex);}
    };

    const handleNext = async () => {
        if (index < SLIDES.length - 1) {
            listRef.current?.scrollToIndex({index: index + 1, animated: true});
        } else {
            await finish();
        }
    };

    const handleSkip = () => finish();

    const finish = async () => {
        try {
            await unifiedStorage.setItem('onboardingSeen', '1');
        } catch (_) {/* ignore */}
        navigation.reset({index: 0, routes: [{name: 'SodamLanding' as never}]});
    };

    return (
        <LinearGradient
            colors={tokens.gradient.darkScreen}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <View style={styles.skipRow}>
                    <Pressable
                        onPress={handleSkip}
                        style={({pressed}) => [styles.skipBtn, pressed && {opacity: 0.5}]}
                        accessibilityRole="button"
                        accessibilityLabel="온보딩 건너뛰기"
                    >
                        <Text style={styles.skipText}>건너뛰기</Text>
                    </Pressable>
                </View>

                <FlatList
                    ref={listRef}
                    data={SLIDES}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onMomentumEnd}
                    keyExtractor={(_, i) => String(i)}
                    renderItem={({item}) => <SlideCard slide={item} width={WIDTH} logoSize={illoSize} styles={styles} />}
                />

                <View style={styles.indicators}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === index ? styles.dotActive : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.footer}>
                    <AppButton
                        label={index === SLIDES.length - 1 ? '시작하기' : '다음'}
                        onPress={handleNext}
                    />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const SlideCard: React.FC<{slide: Slide; width: number; logoSize: number; styles: ReturnType<typeof makeStyles>}> = ({slide, width, logoSize, styles}) => (
    <View style={[styles.slide, {width}]}>
        <View style={styles.illustrationBox}>
            <Brandmark size={logoSize} />
        </View>
        <Text style={styles.headline}>{slide.headline}</Text>
        <Text style={styles.body}>{slide.body}</Text>
    </View>
);

// 아티팩트(sodam-v3-01-auth.html "03 OnboardingCarousel")는 device__screen--dark(다크 인트로 톤,
// Splash/RoleStart/WelcomeMain/KakaoLogin과 동일 gradient.darkScreen) — 테마 토큰(useThemeColors)이
// 아니라 다크 화면 고정 색을 직접 쓴다(라이트 테마에서도 배경은 항상 다크 그라디언트이므로).
const makeStyles = (illoSize: number, illoMarginTop: number) => StyleSheet.create({
    flex: {flex: 1},
    skipRow: {
        flexDirection: 'row' as const,
        justifyContent: 'flex-end' as const,
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
    },
    skipBtn: {
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
    },
    skipText: {
        color: 'rgba(245,243,239,0.72)',
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.medium,
    },
    slide: {
        flex: 1,
        alignItems: 'center' as const,
        justifyContent: 'flex-start' as const,
        paddingHorizontal: tokens.spacing.xl,
    },
    illustrationBox: {
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginTop: illoMarginTop,
    },
    headline: {
        marginTop: tokens.spacing.xxxl,
        fontSize: 30,
        lineHeight: 38,
        fontWeight: '800' as const,
        color: '#F5F3EF',
        textAlign: 'center' as const,
        letterSpacing: -1,
    },
    body: {
        marginTop: tokens.spacing.lg,
        fontSize: tokens.typography.sizes.lg,
        color: 'rgba(245,243,239,0.72)',
        textAlign: 'center' as const,
        lineHeight: 26,
    },
    indicators: {
        flexDirection: 'row' as const,
        justifyContent: 'center' as const,
        gap: tokens.spacing.sm,
        paddingVertical: tokens.spacing.xl,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {backgroundColor: '#FF7288', width: 24},
    dotInactive: {backgroundColor: 'rgba(245,243,239,0.3)'},
    footer: {
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: tokens.spacing.lg,
    },
});

export default OnboardingCarouselScreen;
