/**
 * JSI-Safe Animation Components
 * Standardized animation component templates for React Native Reanimated 3
 * Prevents JSI assertion failures by using proper worklet patterns
 */

import React, {useEffect} from 'react';
import {View, ViewStyle, Text} from 'react-native';
import {ENABLE_ANIMATIONS, stageAtLeast, ANIMATION_RECOVERY_STAGE} from '../../../navigation/config';

// Conditionally import Reanimated components only when needed
// Using specific types for better type safety while maintaining dynamic loading
let Animated: typeof import('react-native-reanimated').default | undefined;
let Easing: typeof import('react-native-reanimated').Easing | undefined;
let interpolate: typeof import('react-native-reanimated').interpolate | undefined;
let runOnJS: typeof import('react-native-reanimated').runOnJS | undefined;
let useAnimatedStyle: typeof import('react-native-reanimated').useAnimatedStyle | undefined;
let useSharedValue: typeof import('react-native-reanimated').useSharedValue | undefined;
let withRepeat: typeof import('react-native-reanimated').withRepeat | undefined;
let withSequence: typeof import('react-native-reanimated').withSequence | undefined;
let withSpring: typeof import('react-native-reanimated').withSpring | undefined;
let withTiming: typeof import('react-native-reanimated').withTiming | undefined;

try {
  if (ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE)) {
    // Dynamic import for Reanimated components
    const reanimated = require('react-native-reanimated'); // eslint-disable-line @typescript-eslint/no-var-requires
    Animated = reanimated.default;
    Easing = reanimated.Easing;
    interpolate = reanimated.interpolate;
    runOnJS = reanimated.runOnJS;
    useAnimatedStyle = reanimated.useAnimatedStyle;
    useSharedValue = reanimated.useSharedValue;
    withRepeat = reanimated.withRepeat;
    withSequence = reanimated.withSequence;
    withSpring = reanimated.withSpring;
    withTiming = reanimated.withTiming;
  }
} catch (error) {
  console.warn('[RECOVERY] JSISafeAnimations: Reanimated import failed, using fallback', error);
}
import {useJSISafeDimensions} from '../../../hooks/useJSISafeDimensions';

// Mock Hook implementations for when Reanimated is not available
const mockUseSharedValue = (initialValue: number) => ({ value: initialValue });
const mockUseAnimatedStyle = (styleFactory: () => any) => styleFactory();

// Common animation configuration types
export interface AnimationConfig {
    duration?: number;
    easing?: ((value: number) => number) | null; // Easing function type
    delay?: number;
}

export interface SpringConfig {
    damping?: number;
    stiffness?: number;
    delay?: number;
}

export interface FadeAnimationProps {
    children: React.ReactNode;
    isVisible: boolean;
    config?: AnimationConfig;
    style?: ViewStyle;
    onAnimationComplete?: () => void;
}

export interface ScaleAnimationProps {
    children: React.ReactNode;
    isVisible: boolean;
    config?: SpringConfig;
    style?: ViewStyle;
    fromScale?: number;
    toScale?: number;
    onAnimationComplete?: () => void;
}

export interface ProgressAnimationProps {
    children: React.ReactNode;
    progress: number;
    config?: AnimationConfig;
    style?: ViewStyle;
    onProgressComplete?: () => void;
}

export interface PulseAnimationProps {
    children: React.ReactNode;
    isActive: boolean;
    config?: {
        minScale?: number;
        maxScale?: number;
        duration?: number;
    };
    style?: ViewStyle;
}

export interface NumberCountAnimationProps {
    targetValue: number;
    startValue?: number;
    config?: AnimationConfig;
    formatter?: (value: number) => string;
    onCountComplete?: (finalValue: number) => void;
}

/**
 * JSI-Safe Fade Animation Component
 * Provides smooth fade in/out animations with proper cleanup
 */
export const FadeAnimation: React.FC<FadeAnimationProps> = ({
                                                                children,
                                                                isVisible,
                                                                config = {},
                                                                style,
                                                                onAnimationComplete,
                                                            }) => {
    const shouldUseAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    // Always call hooks in the same order - use real hook or mock
    const fadeAnim = (useSharedValue ?? mockUseSharedValue)(isVisible ? 1 : 0);

    const {
        duration = 300,
        easing = shouldUseAnimations && Easing ? Easing.out(Easing.cubic) : null,
    } = config;

    useEffect(() => {
        if (!shouldUseAnimations) {
            // No animations - trigger completion callback immediately
            if (onAnimationComplete) {
                setTimeout(onAnimationComplete, 0);
            }
            return;
        }

        if (fadeAnim && withTiming && 'value' in fadeAnim) {
            const targetValue = isVisible ? 1 : 0;

            fadeAnim.value = withTiming(
                targetValue,
                {
                    duration,
                    easing: easing ?? undefined,
                },
                (finished?: boolean) => {
                    'worklet';
                    if (finished && onAnimationComplete && runOnJS) {
                        runOnJS(onAnimationComplete)();
                    }
                }
            );
        }
    }, [isVisible, duration, easing, onAnimationComplete, shouldUseAnimations, fadeAnim]);

    // Always call useAnimatedStyle or mock
    const animatedStyle = (useAnimatedStyle ?? mockUseAnimatedStyle)(() => {
        if (!shouldUseAnimations || !fadeAnim || !('value' in fadeAnim)) {
            return { opacity: isVisible ? 1 : 0 };
        }
        return { opacity: fadeAnim.value };
    });

    if (!shouldUseAnimations || !Animated) {
        // Fallback to regular View when animations are disabled
        return (
            <View style={[animatedStyle, style]}>
                {children}
            </View>
        );
    }

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

/**
 * JSI-Safe Scale Animation Component
 * Provides smooth scale animations with spring physics
 */
export const ScaleAnimation: React.FC<ScaleAnimationProps> = ({
                                                                  children,
                                                                  isVisible,
                                                                  config = {},
                                                                  style,
                                                                  fromScale = 0.8,
                                                                  toScale = 1,
                                                                  onAnimationComplete,
                                                              }) => {
    const shouldUseAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    // Always call hooks in the same order
    const scaleAnim = (useSharedValue ?? mockUseSharedValue)(isVisible ? toScale : fromScale);

    const {
        damping = 15,
        stiffness = 150,
    } = config;

    useEffect(() => {
        if (!shouldUseAnimations) {
            // No animations - trigger completion callback immediately
            if (onAnimationComplete) {
                setTimeout(onAnimationComplete, 0);
            }
            return;
        }

        if (scaleAnim && withSpring && 'value' in scaleAnim) {
            const targetValue = isVisible ? toScale : fromScale;

            scaleAnim.value = withSpring(
                targetValue,
                {
                    damping,
                    stiffness,
                },
                (finished?: boolean) => {
                    'worklet';
                    if (finished && onAnimationComplete && runOnJS) {
                        runOnJS(onAnimationComplete)();
                    }
                }
            );
        }
    }, [isVisible, damping, stiffness, fromScale, toScale, onAnimationComplete, shouldUseAnimations, scaleAnim]);

    // Always call useAnimatedStyle or mock
    const animatedStyle = (useAnimatedStyle ?? mockUseAnimatedStyle)(() => {
        if (!shouldUseAnimations || !scaleAnim || !('value' in scaleAnim)) {
            const currentScale = isVisible ? toScale : fromScale;
            return { transform: [{ scale: currentScale }] };
        }
        return { transform: [{ scale: scaleAnim.value }] };
    });

    if (!shouldUseAnimations || !Animated) {
        // Fallback to regular View when animations are disabled
        return (
            <View style={[animatedStyle, style]}>
                {children}
            </View>
        );
    }

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

/**
 * JSI-Safe Progress Animation Component
 * Provides smooth progress bar animations
 */
export const ProgressAnimation: React.FC<ProgressAnimationProps> = ({
                                                                        children,
                                                                        progress,
                                                                        config = {},
                                                                        style,
                                                                        onProgressComplete,
                                                                    }) => {
    console.log('[DEBUG_LOG] ProgressAnimation: Component initialization started');
    console.log('[DEBUG_LOG] ProgressAnimation: Props received:', {progress});

    const shouldUseAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    // Use JSI-safe dimensions hook
    console.log('[DEBUG_LOG] ProgressAnimation: About to call useJSISafeDimensions hook');
    let dimensions;
    try {
        const hookResult = useJSISafeDimensions();
        dimensions = hookResult.dimensions;
        console.log('[DEBUG_LOG] ProgressAnimation: useJSISafeDimensions hook called successfully');
        console.log('[DEBUG_LOG] ProgressAnimation: Received dimensions:', dimensions);
        console.log('[DEBUG_LOG] ProgressAnimation: Full hook result:', hookResult);
    } catch (error) {
        console.error('[DEBUG_LOG] ProgressAnimation: ERROR calling useJSISafeDimensions:', error);
        if (error instanceof Error) {
            console.error('[DEBUG_LOG] ProgressAnimation: Error stack:', error.stack);
        }
        throw error;
    }

    // Always call hooks in the same order
    const progressAnim = (useSharedValue ?? mockUseSharedValue)(0);

    const {
        duration = 2000,
        easing = shouldUseAnimations && Easing ? Easing.out(Easing.quad) : null,
    } = config;

    useEffect(() => {
        if (!shouldUseAnimations) {
            // No animations - trigger completion callback immediately if progress is complete
            if (progress >= 1 && onProgressComplete) {
                setTimeout(onProgressComplete, 0);
            }
            return;
        }

        if (progressAnim && withTiming && 'value' in progressAnim) {
            progressAnim.value = withTiming(
                progress,
                {
                    duration,
                    easing: easing ?? undefined,
                },
                (finished?: boolean) => {
                    'worklet';
                    if (finished && progress >= 1 && onProgressComplete && runOnJS) {
                        runOnJS(onProgressComplete)();
                    }
                }
            );
        }
    }, [progress, duration, easing, onProgressComplete, shouldUseAnimations, progressAnim]);

    // Always call useAnimatedStyle or mock
    const animatedStyle = (useAnimatedStyle ?? mockUseAnimatedStyle)(() => {
        if (!shouldUseAnimations || !progressAnim || !('value' in progressAnim) || !interpolate) {
            const currentWidth = progress * dimensions.screenWidth * 0.8;
            return { width: currentWidth };
        }

        const width = interpolate(
            progressAnim.value,
            [0, 1],
            [0, dimensions.screenWidth * 0.8]
        );

        return {
            width,
        };
    });

    if (!shouldUseAnimations || !Animated) {
        // Fallback to regular View when animations are disabled
        return (
            <View style={[animatedStyle, style]}>
                {children}
            </View>
        );
    }

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

/**
 * JSI-Safe Pulse Animation Component
 * Provides continuous pulse animations with proper cleanup
 */
export const PulseAnimation: React.FC<PulseAnimationProps> = ({
                                                                  children,
                                                                  isActive,
                                                                  config = {},
                                                                  style,
                                                              }) => {
    const shouldUseAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    // Always call hooks in the same order
    const pulseAnim = (useSharedValue ?? mockUseSharedValue)(1);

    const {
        minScale = 1,
        maxScale = 1.1,
        duration = 500,
    } = config;

    useEffect(() => {
        if (!shouldUseAnimations) {
            return;
        }

        if (pulseAnim && withRepeat && withSequence && withTiming && Easing && 'value' in pulseAnim) {
            if (isActive) {
                pulseAnim.value = withRepeat(
                    withSequence(
                        withTiming(maxScale, {
                            duration,
                            easing: Easing.inOut(Easing.sin),
                        }),
                        withTiming(minScale, {
                            duration,
                            easing: Easing.inOut(Easing.sin),
                        })
                    ),
                    -1, // infinite
                    true // reverse
                );
            } else {
                pulseAnim.value = withTiming(minScale, {
                    duration: duration / 2,
                    easing: Easing.out(Easing.cubic),
                });
            }
        }
    }, [isActive, minScale, maxScale, duration, shouldUseAnimations, pulseAnim]);

    // Always call useAnimatedStyle or mock
    const animatedStyle = (useAnimatedStyle ?? mockUseAnimatedStyle)(() => {
        if (!shouldUseAnimations || !pulseAnim || !('value' in pulseAnim)) {
            return { transform: [{ scale: minScale }] };
        }
        return { transform: [{ scale: pulseAnim.value }] };
    });

    if (!shouldUseAnimations || !Animated) {
        // Fallback to regular View when animations are disabled
        return (
            <View style={[animatedStyle, style]}>
                {children}
            </View>
        );
    }

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
};

/**
 * JSI-Safe Number Count Animation Component
 * Provides smooth number counting animations
 */
export const NumberCountAnimation: React.FC<NumberCountAnimationProps> = ({
                                                                              targetValue,
                                                                              startValue = 0,
                                                                              config = {},
                                                                              formatter = (value) => Math.round(value).toString(),
                                                                              onCountComplete,
                                                                          }) => {
    const shouldUseAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    // Always call hooks in the same order
    const countAnim = (useSharedValue ?? mockUseSharedValue)(startValue);

    const {
        duration = 1500,
        easing = shouldUseAnimations && Easing ? Easing.out(Easing.cubic) : null,
    } = config;

    useEffect(() => {
        if (!shouldUseAnimations) {
            // No animations - trigger completion callback immediately
            if (onCountComplete) {
                setTimeout(() => onCountComplete(targetValue), 0);
            }
            return;
        }

        if (countAnim && withTiming && 'value' in countAnim) {
            countAnim.value = withTiming(
                targetValue,
                {
                    duration,
                    easing: easing ?? undefined,
                },
                (finished?: boolean) => {
                    'worklet';
                    if (finished && onCountComplete && runOnJS) {
                        runOnJS(onCountComplete)(targetValue);
                    }
                }
            );
        }
    }, [targetValue, duration, easing, onCountComplete, shouldUseAnimations, countAnim]);

    // Always call useAnimatedStyle or mock
    const animatedStyle = (useAnimatedStyle ?? mockUseAnimatedStyle)(() => {
        return {
            // This will be handled by the text component that uses this
        };
    });

    const displayValue = shouldUseAnimations && countAnim && 'value' in countAnim
        ? formatter(countAnim.value)
        : formatter(targetValue);

    if (!shouldUseAnimations || !Animated) {
        // Fallback to regular Text when animations are disabled
        return (
            <Text style={animatedStyle}>
                {displayValue}
            </Text>
        );
    }

    return (
        <Animated.Text style={animatedStyle}>
            {displayValue}
        </Animated.Text>
    );
};

/**
 * Combined Animation Component
 * Combines multiple animations for complex entrance effects
 */
export interface CombinedAnimationProps {
    children: React.ReactNode;
    isVisible: boolean;
    fadeConfig?: AnimationConfig;
    scaleConfig?: SpringConfig;
    style?: ViewStyle;
    onAnimationComplete?: () => void;
}

export const CombinedAnimation: React.FC<CombinedAnimationProps> = ({
                                                                        children,
                                                                        isVisible,
                                                                        fadeConfig = {},
                                                                        scaleConfig = {},
                                                                        style,
                                                                        onAnimationComplete,
                                                                    }) => {
    return (
        <FadeAnimation
            isVisible={isVisible}
            config={fadeConfig}
            onAnimationComplete={onAnimationComplete}
        >
            <ScaleAnimation
                isVisible={isVisible}
                config={scaleConfig}
                style={style}
            >
                {children}
            </ScaleAnimation>
        </FadeAnimation>
    );
};

// Export all animation components
export default {
    FadeAnimation,
    ScaleAnimation,
    ProgressAnimation,
    PulseAnimation,
    NumberCountAnimation,
    CombinedAnimation,
};
