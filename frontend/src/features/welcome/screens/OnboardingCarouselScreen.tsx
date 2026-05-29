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
import {AppButton} from '../../../common/components/ds';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';

interface Slide {
    glyph: string;
    headline: string;
    body: string;
    gradient: [string, string];
}

// 브랜드 글리프 사용 — 이모지(📲💰🌿) 대신 컨텍스트 의미를 담은 단일 문자.
// (B2B 톤·픽셀 일관성·고대비 가독성 모두 우위)
const SLIDES: Slide[] = [
    {
        glyph: 'N',
        headline: '출퇴근, NFC 한 번이면 끝',
        body: '카운터 위 스티커에 폰만 대면 자동 출근 인증.\n부정 출근 걱정 끝이에요.',
        gradient: ['#FFB48F', '#FF6B35'],
    },
    {
        glyph: '₩',
        headline: '급여, 자동으로 정확하게',
        body: '주휴수당·연장·야간 시급 자동 계산.\n월말 30분이면 정산 끝나요.',
        gradient: ['#FF9B63', '#FF5722'],
    },
    {
        glyph: '환',
        headline: '종합소득세 환급도 한 앱에서',
        body: '세무사 부담 없이 환급 받으세요.\n환급 받은 만큼만 수수료 드릴게요.',
        gradient: ['#FF9B63', '#E5552A'],
    },
];

const OnboardingCarouselScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const {width: WIDTH} = useWindowDimensions();
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);
    const [index, setIndex] = useState(0);
    const listRef = useRef<FlatList<Slide>>(null);

    const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const newIndex = Math.round(e.nativeEvent.contentOffset.x / WIDTH);
        if (newIndex !== index) setIndex(newIndex);
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
        navigation.reset({index: 0, routes: [{name: 'Welcome' as never}]});
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
                renderItem={({item}) => <SlideCard slide={item} width={WIDTH} styles={styles} />}
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
    );
};

const SlideCard: React.FC<{slide: Slide; width: number; styles: ReturnType<typeof makeStyles>}> = ({slide, width, styles}) => (
    <View style={[styles.slide, {width}]}>
        <LinearGradient
            colors={slide.gradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.illustrationBox}
        >
            <Text style={styles.illustrationGlyph}>{slide.glyph}</Text>
        </LinearGradient>
        <Text style={styles.headline}>{slide.headline}</Text>
        <Text style={styles.body}>{slide.body}</Text>
    </View>
);

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: c.background},
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
        color: c.textSecondary,
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
        width: 220,
        height: 220,
        borderRadius: 110,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginTop: tokens.spacing.huge,
        ...tokens.shadow.brand,
    },
    // 글리프는 그라디언트(브랜드 오렌지) 위에 항상 흰 텍스트 — 테마 무관.
    illustrationGlyph: {
        fontSize: 88,
        fontWeight: '900' as const,
        color: '#FFFFFF',
        letterSpacing: -2,
        textShadowColor: 'rgba(0,0,0,0.18)',
        textShadowOffset: {width: 0, height: 4},
        textShadowRadius: 12,
    },
    headline: {
        marginTop: tokens.spacing.xxxl,
        fontSize: tokens.typography.sizes.display,
        fontWeight: tokens.typography.weights.bold,
        color: c.textPrimary,
        textAlign: 'center' as const,
        letterSpacing: -1,
    },
    body: {
        marginTop: tokens.spacing.lg,
        fontSize: tokens.typography.sizes.md,
        color: c.textSecondary,
        textAlign: 'center' as const,
        lineHeight: 24,
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
    dotActive: {backgroundColor: c.brandPrimary, width: 24},
    dotInactive: {backgroundColor: c.surfaceMuted},
    footer: {
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: tokens.spacing.lg,
    },
});

export default OnboardingCarouselScreen;
