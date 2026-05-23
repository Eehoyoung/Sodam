/**
 * Custom Animation Hooks for React Native Reanimated 3
 *
 * This file contains custom React hooks that provide easy-to-use
 * animation functionality for components throughout the application.
 */

import {useCallback, useEffect} from 'react';
import {
    cancelAnimation,
    Extrapolate,
    interpolate,
    runOnJS,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import {
    fadeIn,
    fadeInWithScale,
    fadeInWithSlide,
    fadeOut,
    pulse,
    resetToInitialValue,
    rotateInfinite,
    rotateTo,
    scaleIn,
    scaleOut,
    scaleTo,
    shake,
    slideDown,
    slideToPosition,
    slideUp,
} from './commonAnimations';
import {ANIMATION_VALUES, SPRING_CONFIGS, TIMING_CONFIGS,} from './constants';
import type {
    AnimationCallback,
    CombinedAnimationHook,
    FadeAnimationHook,
    RotationAnimationHook,
    ScaleAnimationHook,
    ScrollAnimationHook,
    SlideAnimationHook,
    SpringConfig,
    TimingConfig,
} from './types';

// Fade Animation Hook
export const useFadeAnimation = (
    initialValue: number = ANIMATION_VALUES.OPACITY.HIDDEN
): FadeAnimationHook => {
    const opacity = useSharedValue(initialValue);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const fadeInAnimation = useCallback((config?: TimingConfig) => {
        opacity.value = fadeIn(
            config?.duration,
            config?.easing
        );
    }, [opacity]);

    const fadeOutAnimation = useCallback((config?: TimingConfig) => {
        opacity.value = fadeOut(
            config?.duration,
            config?.easing
        );
    }, [opacity]);

    return {
        opacity,
        animatedStyle,
        fadeIn: fadeInAnimation,
        fadeOut: fadeOutAnimation,
    };
};

// Slide Animation Hook
export const useSlideAnimation = (
    initialY: number = ANIMATION_VALUES.TRANSLATE.HIDDEN_DOWN,
    initialX: number = ANIMATION_VALUES.TRANSLATE.VISIBLE
): SlideAnimationHook => {
    const translateY = useSharedValue(initialY);
    const translateX = useSharedValue(initialX);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            {translateY: translateY.value},
            {translateX: translateX.value},
        ],
    }));

    const slideUpAnimation = useCallback((distance?: number, config?: TimingConfig) => {
        translateY.value = slideUp(
            distance,
            config?.duration,
            config?.easing
        );
    }, [translateY]);

    const slideDownAnimation = useCallback((distance?: number, config?: TimingConfig) => {
        translateY.value = slideDown(
            distance,
            config?.duration,
            config?.easing
        );
    }, [translateY]);

    const slideLeftAnimation = useCallback((distance?: number, config?: TimingConfig) => {
        translateX.value = slideUp(
            distance,
            config?.duration,
            config?.easing
        );
    }, [translateX]);

    const slideRightAnimation = useCallback((distance?: number, config?: TimingConfig) => {
        translateX.value = slideDown(
            distance,
            config?.duration,
            config?.easing
        );
    }, [translateX]);

    const reset = useCallback(() => {
        translateY.value = slideToPosition(ANIMATION_VALUES.TRANSLATE.VISIBLE);
        translateX.value = slideToPosition(ANIMATION_VALUES.TRANSLATE.VISIBLE);
    }, [translateY, translateX]);

    return {
        translateY,
        translateX,
        animatedStyle,
        slideUp: slideUpAnimation,
        slideDown: slideDownAnimation,
        slideLeft: slideLeftAnimation,
        slideRight: slideRightAnimation,
        reset,
    };
};

// Scale Animation Hook
export const useScaleAnimation = (
    initialValue: number = ANIMATION_VALUES.SCALE.HIDDEN
): ScaleAnimationHook => {
    const scale = useSharedValue(initialValue);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{scale: scale.value}],
    }));

    const scaleInAnimation = useCallback((config?: SpringConfig) => {
        scale.value = scaleIn(config);
    }, [scale]);

    const scaleOutAnimation = useCallback((config?: SpringConfig) => {
        scale.value = scaleOut(config);
    }, [scale]);

    const scaleToAnimation = useCallback((value: number, config?: SpringConfig) => {
        scale.value = scaleTo(value, config);
    }, [scale]);

    const pulseAnimation = useCallback((config?: { scale?: number; duration?: number }) => {
        scale.value = pulse(
            config?.scale ?? ANIMATION_VALUES.SCALE.EXPANDED,
            config?.duration ?? 1000
        );
    }, [scale]);

    const stopPulse = useCallback(() => {
        cancelAnimation(scale);
        scale.value = scaleIn();
    }, [scale]);

    return {
        scale,
        animatedStyle,
        scaleIn: scaleInAnimation,
        scaleOut: scaleOutAnimation,
        scaleTo: scaleToAnimation,
        pulse: pulseAnimation,
        stopPulse,
    };
};

// Rotation Animation Hook
export const useRotationAnimation = (
    initialValue: number = 0
): RotationAnimationHook => {
    const rotation = useSharedValue(initialValue);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{rotate: `${rotation.value}deg`}],
    }));

    const rotateToAnimation = useCallback((degrees: number, config?: TimingConfig) => {
        rotation.value = rotateTo(
            degrees,
            config?.duration,
            config?.easing
        );
    }, [rotation]);

    const startRotation = useCallback((config?: { duration?: number; clockwise?: boolean }) => {
        rotation.value = rotateInfinite(
            config?.duration ?? 1000,
            config?.clockwise ?? true
        );
    }, [rotation]);

    const stopRotation = useCallback(() => {
        cancelAnimation(rotation);
        rotation.value = rotateTo(0);
    }, [rotation]);

    return {
        rotation,
        animatedStyle,
        rotateTo: rotateToAnimation,
        startRotation,
        stopRotation,
    };
};

// Combined Animation Hook
export const useCombinedAnimation = (
    initialOpacity: number = ANIMATION_VALUES.OPACITY.HIDDEN,
    initialScale: number = ANIMATION_VALUES.SCALE.HIDDEN,
    initialTranslateY: number = ANIMATION_VALUES.TRANSLATE.HIDDEN_DOWN,
    initialTranslateX: number = ANIMATION_VALUES.TRANSLATE.VISIBLE
): CombinedAnimationHook => {
    const opacity = useSharedValue(initialOpacity);
    const scale = useSharedValue(initialScale);
    const translateY = useSharedValue(initialTranslateY);
    const translateX = useSharedValue(initialTranslateX);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            {scale: scale.value},
            {translateY: translateY.value},
            {translateX: translateX.value},
        ],
    }));

    const fadeInWithSlideAnimation = useCallback((config?: {
        fadeConfig?: TimingConfig;
        slideConfig?: TimingConfig;
        slideDistance?: number;
        direction?: 'up' | 'down' | 'left' | 'right';
    }) => {
        const animations = fadeInWithSlide(
            config?.slideDistance ?? 50,
            config?.direction ?? 'up',
            config?.fadeConfig?.duration ?? TIMING_CONFIGS.NORMAL.duration,
            config?.fadeConfig?.easing ?? TIMING_CONFIGS.NORMAL.easing
        );

        opacity.value = animations.opacity;

        if (config?.direction === 'up' || config?.direction === 'down') {
            translateY.value = animations.translate;
        } else {
            translateX.value = animations.translate;
        }
    }, [opacity, translateY, translateX]);

    const fadeInWithScaleAnimation = useCallback((config?: {
        fadeConfig?: TimingConfig;
        scaleConfig?: SpringConfig;
    }) => {
        const animations = fadeInWithScale(
            config?.fadeConfig ?? TIMING_CONFIGS.NORMAL,
            config?.scaleConfig ?? SPRING_CONFIGS.DEFAULT
        );

        opacity.value = animations.opacity;
        scale.value = animations.scale;
    }, [opacity, scale]);

    const reset = useCallback(() => {
        resetToInitialValue(opacity, initialOpacity);
        resetToInitialValue(scale, initialScale);
        resetToInitialValue(translateY, initialTranslateY);
        resetToInitialValue(translateX, initialTranslateX);
    }, [opacity, scale, translateY, translateX, initialOpacity, initialScale, initialTranslateY, initialTranslateX]);

    return {
        opacity,
        scale,
        translateY,
        translateX,
        animatedStyle,
        fadeInWithSlide: fadeInWithSlideAnimation,
        fadeInWithScale: fadeInWithScaleAnimation,
        reset,
    };
};

// Scroll Animation Hook
export const useScrollAnimation = (
    config?: {
        opacityRange?: [number, number];
        scaleRange?: [number, number];
        translateRange?: [number, number];
    }
): ScrollAnimationHook => {
    const scrollY = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = config?.opacityRange
            ? interpolate(
                scrollY.value,
                [0, 100],
                config.opacityRange,
                Extrapolate.CLAMP
            )
            : 1;

        const scale = config?.scaleRange
            ? interpolate(
                scrollY.value,
                [0, 100],
                config.scaleRange,
                Extrapolate.CLAMP
            )
            : 1;

        const translateY = config?.translateRange
            ? interpolate(
                scrollY.value,
                [0, 100],
                config.translateRange,
                Extrapolate.CLAMP
            )
            : 0;

        return {
            opacity,
            transform: [
                {scale},
                {translateY},
            ],
        };
    });

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    return {
        scrollY,
        animatedStyle,
        onScroll,
    };
};

// Shake Animation Hook
export const useShakeAnimation = () => {
    const translateX = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{translateX: translateX.value}],
    }));

    const startShake = useCallback((intensity?: number, duration?: number, iterations?: number) => {
        translateX.value = shake(intensity, duration, iterations);
    }, [translateX]);

    const stopShake = useCallback(() => {
        cancelAnimation(translateX);
        translateX.value = slideToPosition(0);
    }, [translateX]);

    return {
        animatedStyle,
        startShake,
        stopShake,
    };
};

// Stagger Animation Hook
export const useStaggerAnimation = (itemCount: number) => {
    const animations = Array.from({length: itemCount}, (_, index) => ({
        opacity: useSharedValue<number>(ANIMATION_VALUES.OPACITY.HIDDEN),
        translateY: useSharedValue<number>(ANIMATION_VALUES.TRANSLATE.HIDDEN_DOWN),
        index,
    }));

    const animatedStyles = animations.map(({opacity, translateY}) =>
        useAnimatedStyle(() => ({
            opacity: opacity.value,
            transform: [{translateY: translateY.value}],
        }))
    );

    const startStagger = useCallback((delay: number = 100, onComplete?: AnimationCallback) => {
        animations.forEach(({opacity, translateY}, index) => {
            setTimeout(() => {
                opacity.value = fadeIn();
                translateY.value = slideToPosition(ANIMATION_VALUES.TRANSLATE.VISIBLE);

                if (index === animations.length - 1 && onComplete) {
                    setTimeout(() => {
                        runOnJS(onComplete)();
                    }, TIMING_CONFIGS.NORMAL.duration);
                }
            }, delay * index);
        });
    }, [animations]);

    const reset = useCallback(() => {
        animations.forEach(({opacity, translateY}) => {
            resetToInitialValue(opacity, ANIMATION_VALUES.OPACITY.HIDDEN);
            resetToInitialValue(translateY, ANIMATION_VALUES.TRANSLATE.HIDDEN_DOWN);
        });
    }, [animations]);

    return {
        animatedStyles,
        startStagger,
        reset,
    };
};

// Performance Monitoring Hook
export const useAnimationPerformance = (animationName: string) => {
    const startTime = useSharedValue(0);
    const endTime = useSharedValue(0);

    const start = useCallback(() => {
        'worklet';
        startTime.value = Date.now();
    }, [startTime]);

    const end = useCallback(() => {
        'worklet';
        endTime.value = Date.now();
        const duration = endTime.value - startTime.value;

        runOnJS(() => {
            console.log(`[ANIMATION_PERFORMANCE] ${animationName}: ${duration}ms`);
        })();

        return duration;
    }, [startTime, endTime, animationName]);

    return {start, end};
};

// Component Lifecycle Animation Hook
export const useLifecycleAnimation = (
    isVisible: boolean,
    config?: {
        enterAnimation?: 'fade' | 'slide' | 'scale' | 'combined';
        exitAnimation?: 'fade' | 'slide' | 'scale' | 'combined';
        onEnterComplete?: AnimationCallback;
        onExitComplete?: AnimationCallback;
    }
) => {
    const opacity = useSharedValue<number>(isVisible ? ANIMATION_VALUES.OPACITY.VISIBLE : ANIMATION_VALUES.OPACITY.HIDDEN);
    const scale = useSharedValue<number>(isVisible ? ANIMATION_VALUES.SCALE.NORMAL : ANIMATION_VALUES.SCALE.HIDDEN);
    const translateY = useSharedValue<number>(isVisible ? ANIMATION_VALUES.TRANSLATE.VISIBLE : ANIMATION_VALUES.TRANSLATE.HIDDEN_DOWN);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            {scale: scale.value},
            {translateY: translateY.value},
        ],
    }));

    useEffect(() => {
        if (isVisible) {
            // Enter animations
            switch (config?.enterAnimation) {
                case 'fade':
                    opacity.value = fadeIn(undefined, undefined, config?.onEnterComplete);
                    break;
                case 'slide':
                    translateY.value = slideToPosition(ANIMATION_VALUES.TRANSLATE.VISIBLE, undefined, undefined, config?.onEnterComplete);
                    opacity.value = fadeIn();
                    break;
                case 'scale':
                    scale.value = scaleIn();
                    opacity.value = fadeIn(undefined, undefined, config?.onEnterComplete);
                    break;
                case 'combined':
                default:
                    opacity.value = fadeIn();
                    scale.value = scaleIn();
                    translateY.value = slideToPosition(ANIMATION_VALUES.TRANSLATE.VISIBLE, undefined, undefined, config?.onEnterComplete);
                    break;
            }
        } else {
            // Exit animations
            switch (config?.exitAnimation) {
                case 'fade':
                    opacity.value = fadeOut(undefined, undefined, config?.onExitComplete);
                    break;
                case 'slide':
                    translateY.value = slideDown(50, undefined, undefined, config?.onExitComplete);
                    opacity.value = fadeOut();
                    break;
                case 'scale':
                    scale.value = scaleOut();
                    opacity.value = fadeOut(undefined, undefined, config?.onExitComplete);
                    break;
                case 'combined':
                default:
                    opacity.value = fadeOut();
                    scale.value = scaleOut();
                    translateY.value = slideDown(50, undefined, undefined, config?.onExitComplete);
                    break;
            }
        }
    }, [isVisible, opacity, scale, translateY, config]);

    return {animatedStyle};
};
