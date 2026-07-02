/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import {AppButton} from '../../../common/components/ds';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {useResponsive} from '../../../common/hooks/useResponsive';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';

interface Slide {
    icon: string;
    headline: string;
    body: string;
    gradient: [string, string];
}

// 이모지(📲💰🌿) 대신 Ionicons 라인 아이콘 — Android 렌더 차이·픽셀 일관성·고대비 가독성 우위.
const SLIDES: Slide[] = [
    {
        icon: 'phone-portrait-outline',
        headline: '출퇴근,\nNFC 한 번이면 끝',
        body: '카운터 위 스티커에 폰만 대면 자동 출근.\n부정 출근 걱정 끝이에요.',
        gradient: ['#FFB48F', '#FF6B35'],
    },
    {
        icon: 'cash-outline',
        headline: '급여,\n자동으로 정확하게',
        body: '주휴수당·연장·야간 시급 자동 계산.\n월말 30분이면 정산 끝나요.',
        gradient: ['#FF9B63', '#FF5722'],
    },
    {
        icon: 'shield-checkmark-outline',
        headline: '출퇴근 기록이\n분쟁의 증거가 돼요',
        body: 'NFC·GPS로 남는 출퇴근 기록.\n노무 분쟁 때 사장님을 지켜줘요.',
        gradient: ['#FF9B63', '#E5552A'],
    },
];

const OnboardingCarouselScreen: React.FC = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 크로스 네비게이터: Auth 스택에서 루트(Welcome)로 reset
    const navigation = useNavigation<any>();
    const {width: WIDTH} = useWindowDimensions();
    const c = useThemeColors();
    const {pick, isCompactHeight} = useResponsive();
    // 작은/짧은 화면(iPhone SE, 360×640)에서 글리프가 폴드 아래로 밀리거나 헤드라인과 겹치는 것 방지.
    const illoSize = pick({compact: 160, default: 220});
    const illoMarginTop = isCompactHeight ? tokens.spacing.lg : tokens.spacing.huge;
    const styles = useMemo(
        () => makeStyles(c, illoSize, illoMarginTop),
        [c, illoSize, illoMarginTop],
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
                renderItem={({item}) => <SlideCard slide={item} width={WIDTH} iconSize={illoSize * 0.42} styles={styles} />}
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

const SlideCard: React.FC<{slide: Slide; width: number; iconSize: number; styles: ReturnType<typeof makeStyles>}> = ({slide, width, iconSize, styles}) => (
    <View style={[styles.slide, {width}]}>
        <LinearGradient
            colors={slide.gradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.illustrationBox}
        >
            <Ionicons name={slide.icon} size={iconSize} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.headline}>{slide.headline}</Text>
        <Text style={styles.body}>{slide.body}</Text>
    </View>
);

const makeStyles = (c: ThemeColors, illoSize: number, illoMarginTop: number) => StyleSheet.create({
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
        width: illoSize,
        height: illoSize,
        borderRadius: illoSize / 2,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginTop: illoMarginTop,
        ...tokens.shadow.brand,
    },
    headline: {
        marginTop: tokens.spacing.xxxl,
        fontSize: 30,
        lineHeight: 38,
        fontWeight: '800' as const,
        color: c.textPrimary,
        textAlign: 'center' as const,
        letterSpacing: -1,
    },
    body: {
        marginTop: tokens.spacing.lg,
        fontSize: tokens.typography.sizes.lg,
        color: c.textSecondary,
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
    dotActive: {backgroundColor: c.brandPrimary, width: 24},
    dotInactive: {backgroundColor: c.surfaceMuted},
    footer: {
        paddingHorizontal: tokens.spacing.lg,
        paddingBottom: tokens.spacing.lg,
    },
});

export default OnboardingCarouselScreen;
