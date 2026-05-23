/**
 * JSI-Safe Standardized Animation Component Templates
 * Pre-built animation components that follow JSI safety patterns
 * Uses JSI-safe dimension hooks and proper worklet implementations
 */

import React, {ReactNode} from 'react';
import {ViewStyle, View, NativeSyntheticEvent, NativeScrollEvent} from 'react-native';
import {ENABLE_ANIMATIONS, stageAtLeast, ANIMATION_RECOVERY_STAGE} from '../../navigation/config';

// Conditionally import Reanimated components only when needed
let Animated: any;
let Easing: any;
let Extrapolate: any;
let interpolate: any;
let runOnJS: any;
let useAnimatedScrollHandler: any;
let useAnimatedStyle: any;
let useSharedValue: any;
let withDelay: any;
let withSpring: any;
let withTiming: any;

try {
  if (ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE)) {
    const reanimated = require('react-native-reanimated');
    Animated = reanimated.default;
    Easing = reanimated.Easing;
    Extrapolate = reanimated.Extrapolate;
    interpolate = reanimated.interpolate;
    runOnJS = reanimated.runOnJS;
    useAnimatedScrollHandler = reanimated.useAnimatedScrollHandler;
    useAnimatedStyle = reanimated.useAnimatedStyle;
    useSharedValue = reanimated.useSharedValue;
    withDelay = reanimated.withDelay;
    withSpring = reanimated.withSpring;
    withTiming = reanimated.withTiming;
  }
} catch (error) {
  console.warn('[RECOVERY] JSISafeAnimatedComponents: Reanimated import failed, using fallback', error);
}
import {useAnimationDimensions, useJSISafeDimensions} from '../../hooks/useJSISafeDimensions';

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

export interface AnimationConfig {
    duration?: number;
    easing?: any; // Allow flexible easing function types
    delay?: number;
}

export interface SpringConfig {
    damping?: number;
    stiffness?: number;
    mass?: number;
}

export interface FadeAnimationProps {
    children: ReactNode;
    isVisible: boolean;
    config?: AnimationConfig;
    style?: ViewStyle;
    onAnimationComplete?: () => void;
}

export interface SlideAnimationProps {
    children: ReactNode;
    isVisible: boolean;
    direction: 'up' | 'down' | 'left' | 'right';
    config?: AnimationConfig;
    style?: ViewStyle;
    onAnimationComplete?: () => void;
}

export interface ScaleAnimationProps {
    children: ReactNode;
    isVisible: boolean;
    config?: SpringConfig;
    style?: ViewStyle;
    onAnimationComplete?: () => void;
}

export interface ScrollParallaxProps {
    children: ReactNode;
    scrollY: any; // SharedValue<number> - using any due to conditional import
    parallaxFactor?: number;
    style?: ViewStyle;
}

export interface ProgressBarProps {
    progress: any; // SharedValue<number> - using any due to conditional import
    height?: number;
    backgroundColor?: string;
    progressColor?: string;
    style?: ViewStyle;
}

// =============================================================================
// FADE ANIMATION COMPONENT
// =============================================================================

/**
 * JSI-Safe Fade Animation Component
 * Provides smooth fade in/out animations with proper cleanup
 */
export const JSISafeFadeAnimation: React.FC<FadeAnimationProps> = ({
                                                                       children,
                                                                       isVisible,
                                                                       config = {},
                                                                       style,
                                                                       onAnimationComplete,
                                                                   }) => {
    const shouldUseAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    // Only use animated values when animations are enabled
    const opacity = shouldUseAnimations && useSharedValue ? useSharedValue(isVisible ? 1 : 0) : null;

    React.useEffect(() => {
        if (!shouldUseAnimations) {
            // No animations - trigger completion callback immediately
            if (onAnimationComplete) {
                setTimeout(onAnimationComplete, 0);
            }
            return;
        }

        if (opacity && withDelay && withTiming && Easing && runOnJS) {
            const {duration = 300, easing = Easing.out(Easing.cubic), delay = 0} = config;

            opacity.value = withDelay(
                delay,
                withTiming(
                    isVisible ? 1 : 0,
                    {duration, easing},
                    (finished: boolean) => {
                        'worklet';
                        if (finished && onAnimationComplete) {
                            runOnJS(onAnimationComplete)();
                        }
                    }
                )
            );
        }
    }, [isVisible, opacity, config, onAnimationComplete, shouldUseAnimations]);

    // Conditionally create animated styles only when animations are enabled
    const animatedStyle = shouldUseAnimations && useAnimatedStyle && opacity ? useAnimatedStyle(() => ({
        opacity: opacity.value,
    })) : null;

    if (!shouldUseAnimations) {
        // Fallback to regular View when animations are disabled
        return (
            <View style={[{opacity: isVisible ? 1 : 0}, style]}>
                {children}
            </View>
        );
    }

    const AnimatedComponent = Animated || View;
    return (
        <AnimatedComponent style={[animatedStyle, style]}>
            {children}
        </AnimatedComponent>
    );
};

// =============================================================================
// SLIDE ANIMATION COMPONENT
// =============================================================================

/**
 * JSI-Safe Slide Animation Component
 * Uses cached dimension values to prevent JSI violations
 */
export const JSISafeSlideAnimation: React.FC<SlideAnimationProps> = ({
                                                                         children,
                                                                         isVisible,
                                                                         direction,
                                                                         config = {},
                                                                         style,
                                                                         onAnimationComplete,
                                                                     }) => {
    const {translations} = useAnimationDimensions();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // Get initial position based on direction using cached values
    const getInitialPosition = () => {
        switch (direction) {
            case 'left':
                return {x: translations.slideOut, y: 0};
            case 'right':
                return {x: translations.slideIn, y: 0};
            case 'up':
                return {x: 0, y: translations.slideUp};
            case 'down':
                return {x: 0, y: translations.slideDown};
            default:
                return {x: 0, y: 0};
        }
    };

    React.useEffect(() => {
        const {duration = 400, easing = Easing.out(Easing.back(1.1)), delay = 0} = config;
        const initialPos = getInitialPosition();

        if (!isVisible) {
            translateX.value = initialPos.x;
            translateY.value = initialPos.y;
        }

        translateX.value = withDelay(
            delay,
            withTiming(
                isVisible ? 0 : initialPos.x,
                {duration, easing}
            )
        );

        translateY.value = withDelay(
            delay,
            withTiming(
                isVisible ? 0 : initialPos.y,
                {duration, easing},
                (finished: boolean) => {
                    'worklet';
                    if (finished && onAnimationComplete) {
                        runOnJS(onAnimationComplete)();
                    }
                }
            )
        );
    }, [isVisible, direction, config, onAnimationComplete]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            {translateX: translateX.value},
            {translateY: translateY.value},
        ],
    }));

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

// =============================================================================
// SCALE ANIMATION COMPONENT
// =============================================================================

/**
 * JSI-Safe Scale Animation Component
 * Provides smooth scale animations with spring physics
 */
export const JSISafeScaleAnimation: React.FC<ScaleAnimationProps> = ({
                                                                         children,
                                                                         isVisible,
                                                                         config = {},
                                                                         style,
                                                                         onAnimationComplete,
                                                                     }) => {
    const scale = useSharedValue(isVisible ? 1 : 0);

    React.useEffect(() => {
        const {damping = 15, stiffness = 150, mass = 1} = config;

        scale.value = withSpring(
            isVisible ? 1 : 0,
            {damping, stiffness, mass},
            (finished: boolean) => {
                'worklet';
                if (finished && onAnimationComplete) {
                    runOnJS(onAnimationComplete)();
                }
            }
        );
    }, [isVisible, config, onAnimationComplete]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{scale: scale.value}],
    }));

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

// =============================================================================
// SCROLL PARALLAX COMPONENT
// =============================================================================

/**
 * JSI-Safe Scroll Parallax Component
 * Uses cached dimension values for parallax calculations
 */
export const JSISafeScrollParallax: React.FC<ScrollParallaxProps> = ({
                                                                         children,
                                                                         scrollY,
                                                                         parallaxFactor = 0.5,
                                                                         style,
                                                                     }) => {
    const {scrollThresholds} = useAnimationDimensions();

    const animatedStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollY.value,
            [0, scrollThresholds.full],
            [0, scrollThresholds.full * parallaxFactor],
            Extrapolate.CLAMP
        );

        return {
            transform: [{translateY}],
        };
    });

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

// =============================================================================
// PROGRESS BAR COMPONENT
// =============================================================================

/**
 * JSI-Safe Progress Bar Component
 * Animated progress bar with smooth transitions
 */
export const JSISafeProgressBar: React.FC<ProgressBarProps> = ({
                                                                   progress,
                                                                   height = 4,
                                                                   backgroundColor = '#E0E0E0',
                                                                   progressColor = '#2196F3',
                                                                   style,
                                                               }) => {
    const animatedStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    return (
        <Animated.View
            style={[
                {
                    height,
                    backgroundColor,
                    borderRadius: height / 2,
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            <Animated.View
                style={[
                    {
                        height: '100%',
                        backgroundColor: progressColor,
                        borderRadius: height / 2,
                    },
                    animatedStyle,
                ]}
            />
        </Animated.View>
    );
};

// =============================================================================
// SAFE SCROLL HANDLER HOOK
// =============================================================================

/**
 * JSI-Safe Scroll Handler Hook
 * Provides safe scroll handling with cached dimension values
 */
export const useJSISafeScrollHandler = (
    onScroll?: (scrollY: number) => void,
    thresholds?: number[]
) => {
    const {scrollThresholds} = useAnimationDimensions();
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollY.value = event.nativeEvent.contentOffset.y;

            // Safe JavaScript function calls
            if (onScroll) {
                runOnJS(onScroll)(event.nativeEvent.contentOffset.y);
            }

            // Threshold-based callbacks using cached values
            if (thresholds) {
                thresholds.forEach((threshold, index) => {
                    if (event.nativeEvent.contentOffset.y > threshold) {
                        runOnJS(() => {
                            console.log(`[JSI-Safe] Scroll threshold ${index + 1} reached: ${threshold}`);
                        })();
                    }
                });
            }
        },
    });

    return {scrollY, scrollHandler, scrollThresholds};
};

// =============================================================================
// COMBINED ANIMATION COMPONENT
// =============================================================================

/**
 * JSI-Safe Combined Animation Component
 * Combines multiple animation types for complex effects
 */
export interface CombinedAnimationProps {
    children: ReactNode;
    isVisible: boolean;
    animations: {
        fade?: boolean;
        slide?: { direction: 'up' | 'down' | 'left' | 'right' };
        scale?: boolean;
    };
    config?: AnimationConfig;
    style?: ViewStyle;
    onAnimationComplete?: () => void;
}

export const JSISafeCombinedAnimation: React.FC<CombinedAnimationProps> = ({
                                                                               children,
                                                                               isVisible,
                                                                               animations,
                                                                               config = {},
                                                                               style,
                                                                               onAnimationComplete,
                                                                           }) => {
    const {translations} = useAnimationDimensions();
    const opacity = useSharedValue(isVisible ? 1 : 0);
    const scale = useSharedValue(isVisible ? 1 : 0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    React.useEffect(() => {
        const {duration = 400, easing = Easing.out(Easing.cubic), delay = 0} = config;

        // Fade animation
        if (animations.fade) {
            opacity.value = withDelay(
                delay,
                withTiming(isVisible ? 1 : 0, {duration, easing})
            );
        }

        // Scale animation
        if (animations.scale) {
            scale.value = withDelay(
                delay,
                withTiming(isVisible ? 1 : 0, {duration, easing})
            );
        }

        // Slide animation
        if (animations.slide) {
            const {direction} = animations.slide;
            let initialX = 0;
            let initialY = 0;

            switch (direction) {
                case 'left':
                    initialX = translations.slideOut;
                    break;
                case 'right':
                    initialX = translations.slideIn;
                    break;
                case 'up':
                    initialY = translations.slideUp;
                    break;
                case 'down':
                    initialY = translations.slideDown;
                    break;
            }

            translateX.value = withDelay(
                delay,
                withTiming(isVisible ? 0 : initialX, {duration, easing})
            );

            translateY.value = withDelay(
                delay,
                withTiming(
                    isVisible ? 0 : initialY,
                    {duration, easing},
                    (finished: boolean) => {
                        'worklet';
                        if (finished && onAnimationComplete) {
                            runOnJS(onAnimationComplete)();
                        }
                    }
                )
            );
        }
    }, [isVisible, animations, config, onAnimationComplete]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: animations.fade ? opacity.value : 1,
        transform: [
            {scale: animations.scale ? scale.value : 1},
            {translateX: translateX.value},
            {translateY: translateY.value},
        ],
    }));

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

export default {
    JSISafeFadeAnimation,
    JSISafeSlideAnimation,
    JSISafeScaleAnimation,
    JSISafeScrollParallax,
    JSISafeProgressBar,
    JSISafeCombinedAnimation,
    useJSISafeScrollHandler,
};
