import React, {useRef, useState} from 'react';
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Button from '../../../common/components/form/Button';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';

interface Slide {
    emoji: string;
    headline: string;
    body: string;
    gradient: [string, string];
}

const SLIDES: Slide[] = [
    {
        emoji: '📲',
        headline: '출퇴근, NFC 한 번이면 끝',
        body: '카운터 위 스티커에 폰만 대면 자동 출근 인증.\n부정 출근 걱정 끝이에요.',
        gradient: ['#FFB48F', '#FF6B35'],
    },
    {
        emoji: '💰',
        headline: '급여, 자동으로 정확하게',
        body: '주휴수당·연장·야간 시급 자동 계산.\n월말 30분이면 정산 끝나요.',
        gradient: ['#FF8A5C', '#FF5722'],
    },
    {
        emoji: '🌿',
        headline: '종합소득세 환급도 한 앱에서',
        body: '세무사 부담 없이 환급 받으세요.\n환급 받은 만큼만 수수료 드립니다.',
        gradient: ['#FFA67A', '#E5552A'],
    },
];

const OnboardingCarouselScreen: React.FC = () => {
    const navigation = useNavigation<any>();
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
                renderItem={({item}) => <SlideCard slide={item} />}
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
                <Button
                    title={index === SLIDES.length - 1 ? '시작하기' : '다음 →'}
                    onPress={handleNext}
                    variant="primary"
                    size="lg"
                    fullWidth
                />
            </View>
        </SafeAreaView>
    );
};

const {width: WIDTH} = Dimensions.get('window');

const SlideCard: React.FC<{slide: Slide}> = ({slide}) => (
    <View style={[styles.slide, {width: WIDTH}]}>
        <LinearGradient
            colors={slide.gradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.illustrationBox}
        >
            <Text style={styles.illustrationEmoji}>{slide.emoji}</Text>
        </LinearGradient>
        <Text style={styles.headline}>{slide.headline}</Text>
        <Text style={styles.body}>{slide.body}</Text>
    </View>
);

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    skipRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
    },
    skipBtn: {
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
    },
    skipText: {
        color: tokens.colors.textSecondary,
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.medium,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: tokens.spacing.xl,
    },
    illustrationBox: {
        width: 220,
        height: 220,
        borderRadius: 110,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: tokens.spacing.huge,
        ...tokens.shadow.brand,
    },
    illustrationEmoji: {fontSize: 92},
    headline: {
        marginTop: tokens.spacing.xxxl,
        fontSize: tokens.typography.sizes.display,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        textAlign: 'center',
        letterSpacing: -1,
    },
    body: {
        marginTop: tokens.spacing.lg,
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: tokens.spacing.sm,
        paddingVertical: tokens.spacing.xl,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {backgroundColor: tokens.colors.brandPrimary, width: 24},
    dotInactive: {backgroundColor: tokens.colors.surfaceMuted},
    footer: {
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: tokens.spacing.lg,
    },
});

export default OnboardingCarouselScreen;
