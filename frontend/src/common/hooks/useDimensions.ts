/**
 * Dimension Management Hooks for React Native
 * Provides safe access to screen dimensions for use in React Native Reanimated 3 worklets
 * Prevents JSI assertion failures by caching dimension values outside worklet context
 */

import {useMemo} from 'react';
import {Dimensions} from 'react-native';

export interface ScreenDimensions {
    screenWidth: number;
    screenHeight: number;
    isLandscape: boolean;
    aspectRatio: number;
}

export interface ResponsiveBreakpoints {
    isSmall: boolean;
    isMedium: boolean;
    isLarge: boolean;
    isTablet: boolean;
}

export interface SafeAreas {
    top: number;
    bottom: number;
    content: number;
    sidebar: number;
}

export interface JSISafeDimensions {
    dimensions: ScreenDimensions;
    breakpoints: ResponsiveBreakpoints;
    safeAreas: SafeAreas;
    animationValues: {
        halfWidth: number;
        halfHeight: number;
        quarterWidth: number;
        quarterHeight: number;
        threeQuarterWidth: number;
        threeQuarterHeight: number;
    };
}

/**
 * Hook that provides JSI-safe access to screen dimensions and responsive breakpoints
 * All values are cached using useMemo to prevent JSI violations in worklets
 *
 * @returns JSISafeDimensions object with all cached dimension values
 *
 * @example
 * ```typescript
 * const { dimensions, breakpoints, animationValues } = useJSISafeDimensions();
 *
 * const animatedStyle = useAnimatedStyle(() => ({
 *   width: dimensions.screenWidth, // Safe to use in worklet
 *   height: animationValues.halfHeight, // Pre-calculated safe value
 * }));
 * ```
 */
export const useJSISafeDimensions = (): JSISafeDimensions => {
    try {
        // Cache raw dimensions first to prevent JSI violations
        const rawDimensions = useMemo(() => {
            try {
                // Check if Dimensions API is available and ready
                if (typeof Dimensions === 'undefined') {
                    return {width: 375, height: 667};
                }

                if (typeof Dimensions.get !== 'function') {
                    return {width: 375, height: 667};
                }

                const windowDimensions = Dimensions.get('window');

                // Validate dimensions are reasonable
                if (!windowDimensions || typeof windowDimensions.width !== 'number' || typeof windowDimensions.height !== 'number') {
                    return {width: 375, height: 667};
                }

                if (windowDimensions.width <= 0 || windowDimensions.height <= 0) {
                    return {width: 375, height: 667};
                }

                if (windowDimensions.width > 10000 || windowDimensions.height > 10000) {
                    return {width: 375, height: 667};
                }

                const {width, height} = windowDimensions;
                return {width, height};
            } catch (error) {
                console.error('useJSISafeDimensions: Failed to get dimensions:', error);
                return {width: 375, height: 667};
            }
        }, []);

        // Cache screen dimensions using raw dimensions
        const dimensions = useMemo((): ScreenDimensions => {
            const {width, height} = rawDimensions;

            return {
                screenWidth: width,
                screenHeight: height,
                isLandscape: width > height,
                aspectRatio: width / height,
            };
        }, [rawDimensions.width, rawDimensions.height]);

        // Cache responsive breakpoints using raw width
        const breakpoints = useMemo((): ResponsiveBreakpoints => {
            const {width} = rawDimensions;

            return {
                isSmall: width < 400,
                isMedium: width >= 400 && width < 768,
                isLarge: width >= 768 && width < 1024,
                isTablet: width >= 768,
            };
        }, [rawDimensions.width]);

        // Cache safe area calculations using raw dimensions
        const safeAreas = useMemo((): SafeAreas => {
            const {width, height} = rawDimensions;

            return {
                top: height * 0.1,
                bottom: height * 0.1,
                content: height * 0.8,
                sidebar: width * 0.25,
            };
        }, [rawDimensions.width, rawDimensions.height]);

        // Pre-calculate common animation values for worklet safety using raw dimensions
        const animationValues = useMemo(() => {
            const {width, height} = rawDimensions;

            return {
                halfWidth: width * 0.5,
                halfHeight: height * 0.5,
                quarterWidth: width * 0.25,
                quarterHeight: height * 0.25,
                threeQuarterWidth: width * 0.75,
                threeQuarterHeight: height * 0.75,
            };
        }, [rawDimensions.width, rawDimensions.height]);

        return {
            dimensions,
            breakpoints,
            safeAreas,
            animationValues,
        };
    } catch (error) {
        console.error('useJSISafeDimensions: Critical error occurred:', error);

        // Return fallback values in case of error
        const fallbackDimensions = {width: 375, height: 667}; // iPhone 6/7/8 dimensions as fallback

        return {
            dimensions: {
                screenWidth: fallbackDimensions.width,
                screenHeight: fallbackDimensions.height,
                isLandscape: fallbackDimensions.width > fallbackDimensions.height,
                aspectRatio: fallbackDimensions.width / fallbackDimensions.height,
            },
            breakpoints: {
                isSmall: fallbackDimensions.width < 400,
                isMedium: fallbackDimensions.width >= 400 && fallbackDimensions.width < 768,
                isLarge: fallbackDimensions.width >= 768 && fallbackDimensions.width < 1024,
                isTablet: fallbackDimensions.width >= 768,
            },
            safeAreas: {
                top: fallbackDimensions.height * 0.1,
                bottom: fallbackDimensions.height * 0.1,
                content: fallbackDimensions.height * 0.8,
                sidebar: fallbackDimensions.width * 0.25,
            },
            animationValues: {
                halfWidth: fallbackDimensions.width * 0.5,
                halfHeight: fallbackDimensions.height * 0.5,
                quarterWidth: fallbackDimensions.width * 0.25,
                quarterHeight: fallbackDimensions.height * 0.25,
                threeQuarterWidth: fallbackDimensions.width * 0.75,
                threeQuarterHeight: fallbackDimensions.height * 0.75,
            },
        };
    }
};

/**
 * Simplified hook for basic dimension access
 * Use this when you only need basic width/height values
 */
export const useScreenDimensions = () => {
    return useMemo(() => {
        const {width, height} = Dimensions.get('window');
        return {width, height};
    }, []);
};

/**
 * Hook for animation-specific dimension calculations
 * Pre-calculates common animation thresholds and values
 */
export const useAnimationDimensions = () => {
    return useMemo(() => {
        const {width, height} = Dimensions.get('window');

        return {
            // Common scroll thresholds
            scrollThresholds: {
                small: height * 0.1,
                medium: height * 0.3,
                large: height * 0.5,
                full: height,
            },

            // Common card sizes
            cardSizes: {
                small: {width: width * 0.4, height: height * 0.2},
                medium: {width: width * 0.6, height: height * 0.3},
                large: {width: width * 0.8, height: height * 0.4},
                full: {width: width * 0.9, height: height * 0.6},
            },

            // Common translation values
            translations: {
                slideIn: width,
                slideOut: -width,
                slideUp: -height,
                slideDown: height,
            },
        };
    }, []);
};
