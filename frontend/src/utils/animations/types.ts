/**
 * TypeScript Type Definitions for Animation Utilities
 *
 * This file contains all the type definitions used in the animation system
 * to ensure type safety and better developer experience.
 */

import {AnimatedStyle, SharedValue} from 'react-native-reanimated';
import {ViewStyle} from 'react-native';

// Basic Animation Configuration Types
export interface TimingConfig {
    duration: number;
    easing?: (value: number) => number;
}

export interface SpringConfig {
    damping: number;
    stiffness: number;
    mass: number;
    overshootClamping?: boolean;
    restDisplacementThreshold?: number;
    restSpeedThreshold?: number;
}

// Animation Hook Return Types
export interface FadeAnimationHook {
    opacity: SharedValue<number>;
    animatedStyle: AnimatedStyle<ViewStyle>;
    fadeIn: (config?: TimingConfig) => void;
    fadeOut: (config?: TimingConfig) => void;
}

export interface SlideAnimationHook {
    translateY: SharedValue<number>;
    translateX: SharedValue<number>;
    animatedStyle: AnimatedStyle<ViewStyle>;
    slideUp: (distance?: number, config?: TimingConfig) => void;
    slideDown: (distance?: number, config?: TimingConfig) => void;
    slideLeft: (distance?: number, config?: TimingConfig) => void;
    slideRight: (distance?: number, config?: TimingConfig) => void;
    reset: () => void;
}

export interface ScaleAnimationHook {
    scale: SharedValue<number>;
    animatedStyle: AnimatedStyle<ViewStyle>;
    scaleIn: (config?: SpringConfig) => void;
    scaleOut: (config?: SpringConfig) => void;
    scaleTo: (value: number, config?: SpringConfig) => void;
    pulse: (config?: { scale?: number; duration?: number }) => void;
    stopPulse: () => void;
}

export interface RotationAnimationHook {
    rotation: SharedValue<number>;
    animatedStyle: AnimatedStyle<ViewStyle>;
    rotateTo: (degrees: number, config?: TimingConfig) => void;
    startRotation: (config?: { duration?: number; clockwise?: boolean }) => void;
    stopRotation: () => void;
}

// Combined Animation Hook Types
export interface CombinedAnimationHook {
    opacity: SharedValue<number>;
    scale: SharedValue<number>;
    translateY: SharedValue<number>;
    translateX: SharedValue<number>;
    animatedStyle: AnimatedStyle<ViewStyle>;
    fadeInWithSlide: (config?: {
        fadeConfig?: TimingConfig;
        slideConfig?: TimingConfig;
        slideDistance?: number;
        direction?: 'up' | 'down' | 'left' | 'right';
    }) => void;
    fadeInWithScale: (config?: {
        fadeConfig?: TimingConfig;
        scaleConfig?: SpringConfig;
    }) => void;
    reset: () => void;
}

// Scroll Animation Types
export interface ScrollAnimationConfig {
    inputRange: number[];
    outputRange: number[];
    extrapolate?: 'extend' | 'clamp' | 'identity';
}

export interface ScrollAnimationHook {
    scrollY: SharedValue<number>;
    animatedStyle: AnimatedStyle<ViewStyle>;
    onScroll: (event: any) => void;
}

// Performance Measurement Types
export interface AnimationPerformanceMetrics {
    animationName: string;
    startTime: number;
    endTime: number;
    duration: number;
    frameDrops?: number;
    averageFPS?: number;
}

export interface PerformanceMeasurement {
    start: () => void;
    end: () => AnimationPerformanceMetrics;
    getMetrics: () => AnimationPerformanceMetrics | null;
}

// Animation State Types
export type AnimationState = 'idle' | 'running' | 'finished' | 'cancelled';

export interface AnimationStateHook {
    state: SharedValue<AnimationState>;
    isRunning: SharedValue<boolean>;
    isFinished: SharedValue<boolean>;
}

// Gesture Animation Types
export interface GestureAnimationConfig {
    scale?: {
        min?: number;
        max?: number;
        friction?: number;
    };
    translation?: {
        boundX?: number;
        boundY?: number;
        friction?: number;
    };
    rotation?: {
        enabled?: boolean;
        friction?: number;
    };
}

export interface GestureAnimationHook {
    scale: SharedValue<number>;
    translateX: SharedValue<number>;
    translateY: SharedValue<number>;
    rotation: SharedValue<number>;
    animatedStyle: AnimatedStyle<ViewStyle>;
    reset: () => void;
}

// Stagger Animation Types
export interface StaggerAnimationConfig {
    delay: number;
    duration: number;
    easing?: (value: number) => number;
    reverse?: boolean;
}

export interface StaggerAnimationItem {
    index: number;
    opacity: SharedValue<number>;
    translateY: SharedValue<number>;
    animatedStyle: AnimatedStyle<ViewStyle>;
}

// Loop Animation Types
export interface LoopAnimationConfig {
    duration: number;
    iterations?: number; // -1 for infinite
    reverse?: boolean;
    easing?: (value: number) => number;
}

// Animation Preset Types
export type AnimationPreset =
    | 'fadeIn'
    | 'fadeOut'
    | 'slideUp'
    | 'slideDown'
    | 'slideLeft'
    | 'slideRight'
    | 'scaleIn'
    | 'scaleOut'
    | 'bounceIn'
    | 'bounceOut'
    | 'pulse'
    | 'shake'
    | 'flip'
    | 'rotate';

export interface AnimationPresetConfig {
    preset: AnimationPreset;
    duration?: number;
    delay?: number;
    easing?: (value: number) => number;
    customConfig?: Record<string, any>;
}

// Test Utilities Types
export interface AnimationTestConfig {
    timeout?: number;
    expectedDuration?: number;
    toleranceMs?: number;
    checkFrameRate?: boolean;
    targetFPS?: number;
}

export interface AnimationTestResult {
    success: boolean;
    actualDuration: number;
    expectedDuration: number;
    frameRate?: number;
    error?: string;
}

// Component-Specific Animation Types
export interface ToastAnimationConfig {
    position: 'top' | 'bottom';
    slideDistance?: number;
    fadeConfig?: TimingConfig;
}

export interface ModalAnimationConfig {
    backdropFade?: boolean;
    modalSlide?: boolean;
    slideDirection?: 'up' | 'down' | 'left' | 'right';
    config?: TimingConfig;
}

export interface LayoutAnimationConfig {
    headerFade?: boolean;
    footerFade?: boolean;
    scrollThreshold?: number;
    config?: TimingConfig;
}

// Utility Types
export type AnimationCallback = () => void;
export type AnimationCallbackWithValue<T> = (value: T) => void;

export interface AnimationCallbacks {
    onStart?: AnimationCallback;
    onEnd?: AnimationCallback;
    onCancel?: AnimationCallback;
    onUpdate?: AnimationCallbackWithValue<number>;
}

// Re-export commonly used Reanimated types for convenience
export type {SharedValue, AnimatedStyle} from 'react-native-reanimated';
export type {ViewStyle, TextStyle} from 'react-native';
