/**
 * Common Animation Functions for React Native Reanimated 3
 *
 * This file contains reusable animation functions that can be used
 * throughout the application for consistent animation behavior.
 */

import {Easing, runOnJS, withDelay, withRepeat, withSequence, withSpring, withTiming,} from 'react-native-reanimated';
import {ANIMATION_DURATIONS, ANIMATION_VALUES, SPRING_CONFIGS, TIMING_CONFIGS,} from './constants';
import type {AnimationCallback, LoopAnimationConfig, SpringConfig, TimingConfig,} from './types';

// Basic Fade Animations
export const fadeIn = (
    duration: number = ANIMATION_DURATIONS.NORMAL,
    easing: (value: number) => number = Easing.out(Easing.cubic),
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withTiming(
        ANIMATION_VALUES.OPACITY.VISIBLE,
        {duration, easing},
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

export const fadeOut = (
    duration: number = ANIMATION_DURATIONS.NORMAL,
    easing: (value: number) => number = Easing.out(Easing.cubic),
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withTiming(
        ANIMATION_VALUES.OPACITY.HIDDEN,
        {duration, easing},
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

// Slide Animations
export const slideUp = (
    distance: number = 50,
    duration: number = ANIMATION_DURATIONS.NORMAL,
    easing: (value: number) => number = Easing.out(Easing.cubic),
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withTiming(
        -distance,
        {duration, easing},
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

export const slideDown = (
    distance: number = 50,
    duration: number = ANIMATION_DURATIONS.NORMAL,
    easing: (value: number) => number = Easing.out(Easing.cubic),
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withTiming(
        distance,
        {duration, easing},
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

export const slideToPosition = (
    position: number,
    duration: number = ANIMATION_DURATIONS.NORMAL,
    easing: (value: number) => number = Easing.out(Easing.cubic),
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withTiming(
        position,
        {duration, easing},
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

// Scale Animations
export const scaleIn = (
    config: SpringConfig = SPRING_CONFIGS.DEFAULT,
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withSpring(
        ANIMATION_VALUES.SCALE.NORMAL,
        config,
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

export const scaleOut = (
    config: SpringConfig = SPRING_CONFIGS.DEFAULT,
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withSpring(
        ANIMATION_VALUES.SCALE.HIDDEN,
        config,
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

export const scaleTo = (
    value: number,
    config: SpringConfig = SPRING_CONFIGS.DEFAULT,
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withSpring(
        value,
        config,
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

// Rotation Animations
export const rotateTo = (
    degrees: number,
    duration: number = ANIMATION_DURATIONS.NORMAL,
    easing: (value: number) => number = Easing.linear,
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withTiming(
        degrees,
        {duration, easing},
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

export const rotateInfinite = (
    duration: number = 1000,
    clockwise: boolean = true
) => {
    'worklet';
    const targetDegrees = clockwise ? 360 : -360;
    return withRepeat(
        withTiming(targetDegrees, {duration, easing: Easing.linear}),
        -1,
        false
    );
};

// Pulse Animation
export const pulse = (
    scale: number = ANIMATION_VALUES.SCALE.EXPANDED,
    duration: number = 1000,
    iterations: number = -1
) => {
    'worklet';
    return withRepeat(
        withSequence(
            withTiming(scale, {duration: duration / 2}),
            withTiming(ANIMATION_VALUES.SCALE.NORMAL, {duration: duration / 2})
        ),
        iterations,
        true
    );
};

// Shake Animation
export const shake = (
    intensity: number = 10,
    duration: number = 500,
    iterations: number = 3
) => {
    'worklet';
    return withRepeat(
        withSequence(
            withTiming(intensity, {duration: duration / 4}),
            withTiming(-intensity, {duration: duration / 2}),
            withTiming(0, {duration: duration / 4})
        ),
        iterations,
        false
    );
};

// Bounce Animation
export const bounceIn = (
    config: SpringConfig = SPRING_CONFIGS.BOUNCY,
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withSpring(
        ANIMATION_VALUES.SCALE.NORMAL,
        config,
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

// Combined Animations
export const fadeInWithSlide = (
    slideDistance: number = 50,
    direction: 'up' | 'down' | 'left' | 'right' = 'up',
    duration: number = ANIMATION_DURATIONS.NORMAL,
    easing: (value: number) => number = Easing.out(Easing.cubic),
    onComplete?: AnimationCallback
) => {
    'worklet';
    const targetPosition = direction === 'up' || direction === 'left' ? -slideDistance : slideDistance;

    return {
        opacity: fadeIn(duration, easing, onComplete),
        translate: slideToPosition(ANIMATION_VALUES.TRANSLATE.VISIBLE, duration, easing),
    };
};

export const fadeInWithScale = (
    fadeConfig: TimingConfig = TIMING_CONFIGS.NORMAL,
    scaleConfig: SpringConfig = SPRING_CONFIGS.DEFAULT,
    onComplete?: AnimationCallback
) => {
    'worklet';
    return {
        opacity: fadeIn(fadeConfig.duration, fadeConfig.easing, onComplete),
        scale: scaleIn(scaleConfig),
    };
};

// Stagger Animation Helper
export const createStaggerAnimation = (
    itemCount: number,
    delay: number = 100,
    animationFactory: (index: number) => any
) => {
    'worklet';
    const animations: any[] = [];

    for (let i = 0; i < itemCount; i++) {
        animations.push(
            withDelay(delay * i, animationFactory(i))
        );
    }

    return animations;
};

// Sequence Animation Helper
export const createSequence = (
    animations: any[],
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withSequence(
        ...animations,
        ...(onComplete ? [withTiming(0, {duration: 0}, (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        })] : [])
    );
};

// Loop Animation Helper
export const createLoop = (
    animation: any,
    config: LoopAnimationConfig
) => {
    'worklet';
    return withRepeat(
        animation,
        config.iterations ?? -1,
        config.reverse ?? false
    );
};

// Preset Animations
export const presetAnimations = {
    // Entrance animations
    fadeIn: () => fadeIn(),
    slideInUp: () => slideUp(),
    slideInDown: () => slideDown(),
    scaleIn: () => scaleIn(),
    bounceIn: () => bounceIn(),

    // Exit animations
    fadeOut: () => fadeOut(),
    slideOutUp: () => slideUp(50),
    slideOutDown: () => slideDown(50),
    scaleOut: () => scaleOut(),

    // Attention animations
    pulse: () => pulse(),
    shake: () => shake(),
    bounce: () => bounceIn(SPRING_CONFIGS.BOUNCY),

    // Loading animations
    rotate: () => rotateInfinite(),

    // Combined animations
    fadeInSlideUp: () => fadeInWithSlide(50, 'up'),
    fadeInScale: () => fadeInWithScale(),
};

// Animation Utilities
export const createTimingAnimation = (
    toValue: number,
    config: TimingConfig = TIMING_CONFIGS.NORMAL,
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withTiming(
        toValue,
        config,
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

export const createSpringAnimation = (
    toValue: number,
    config: SpringConfig = SPRING_CONFIGS.DEFAULT,
    onComplete?: AnimationCallback
) => {
    'worklet';
    return withSpring(
        toValue,
        config,
        onComplete ? (finished) => {
            'worklet';
            if (finished && onComplete) {
                runOnJS(onComplete)();
            }
        } : undefined
    );
};

// Animation State Helpers
export const cancelAnimation = (sharedValue: any) => {
    'worklet';
    // Cancel any running animation on the shared value
    sharedValue.value = sharedValue.value;
};

export const resetToInitialValue = (sharedValue: any, initialValue: number) => {
    'worklet';
    sharedValue.value = initialValue;
};
