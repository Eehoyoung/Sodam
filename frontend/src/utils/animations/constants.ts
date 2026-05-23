/**
 * Animation Constants for React Native Reanimated 3
 *
 * This file contains all the common animation configuration constants
 * used throughout the Sodam application for consistent animation behavior.
 */

import {Easing} from 'react-native-reanimated';

// Animation Duration Constants
export const ANIMATION_DURATIONS = {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 800,
    EXTRA_SLOW: 1000,
} as const;

// Spring Animation Configuration
export const SPRING_CONFIGS = {
    DEFAULT: {
        damping: 15,
        stiffness: 150,
        mass: 1,
    },
    GENTLE: {
        damping: 20,
        stiffness: 100,
        mass: 1,
    },
    BOUNCY: {
        damping: 10,
        stiffness: 200,
        mass: 1,
    },
    SMOOTH: {
        damping: 25,
        stiffness: 120,
        mass: 1,
    },
} as const;

// Timing Animation Configuration
export const TIMING_CONFIGS = {
    FAST: {
        duration: ANIMATION_DURATIONS.FAST,
        easing: Easing.out(Easing.cubic),
    },
    NORMAL: {
        duration: ANIMATION_DURATIONS.NORMAL,
        easing: Easing.out(Easing.cubic),
    },
    SLOW: {
        duration: ANIMATION_DURATIONS.SLOW,
        easing: Easing.out(Easing.cubic),
    },
    LINEAR: {
        duration: ANIMATION_DURATIONS.NORMAL,
        easing: Easing.linear,
    },
    EASE_IN: {
        duration: ANIMATION_DURATIONS.NORMAL,
        easing: Easing.in(Easing.cubic),
    },
    EASE_OUT: {
        duration: ANIMATION_DURATIONS.NORMAL,
        easing: Easing.out(Easing.cubic),
    },
    EASE_IN_OUT: {
        duration: ANIMATION_DURATIONS.NORMAL,
        easing: Easing.inOut(Easing.cubic),
    },
} as const;

// Welcome Screen Animation Constants
export const WELCOME_ANIMATIONS = {
    FADE_IN: {
        duration: ANIMATION_DURATIONS.NORMAL,
        easing: Easing.out(Easing.cubic),
    },
    SLIDE_UP: {
        duration: 400,
        easing: Easing.out(Easing.cubic),
    },
    STAGGER_DELAY: 200, // Delay between sequential animations
    SCROLL_THRESHOLD: 100, // Scroll threshold for triggering animations
} as const;

// Demo Component Animation Constants
export const DEMO_ANIMATIONS = {
    SCALE_IN: {
        duration: ANIMATION_DURATIONS.NORMAL,
        easing: Easing.out(Easing.back(1.2)),
    },
    INTERACTION_SCALE: 1.05, // Scale factor for touch interactions
    LOADING_ROTATION_DURATION: 1000,
    PULSE_DURATION: 1000,
} as const;

// Common Component Animation Constants
export const COMMON_ANIMATIONS = {
    TOAST: {
        FADE_DURATION: ANIMATION_DURATIONS.NORMAL,
        SLIDE_DISTANCE: 50,
    },
    MODAL: {
        FADE_DURATION: ANIMATION_DURATIONS.FAST,
        BACKDROP_OPACITY: 0.5,
    },
    LAYOUT: {
        SCROLL_OPACITY_THRESHOLD: 100,
        FOOTER_FADE_RANGE: [0, 100],
    },
} as const;

// Animation Value Constants
export const ANIMATION_VALUES = {
    OPACITY: {
        HIDDEN: 0,
        VISIBLE: 1,
    },
    SCALE: {
        HIDDEN: 0,
        NORMAL: 1,
        PRESSED: 0.95,
        EXPANDED: 1.05,
    },
    TRANSLATE: {
        HIDDEN_UP: -50,
        HIDDEN_DOWN: 50,
        VISIBLE: 0,
    },
} as const;

// Performance Constants
export const PERFORMANCE_CONSTANTS = {
    TARGET_FPS: 60,
    FRAME_TIME_MS: 16.67, // 1000ms / 60fps
    PERFORMANCE_THRESHOLD_MS: 100, // Threshold for performance warnings
} as const;
