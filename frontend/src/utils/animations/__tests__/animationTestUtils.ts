/**
 * Animation Test Utilities
 *
 * This file contains utilities for testing animations including
 * performance measurement, validation helpers, and test setup functions.
 */

import {act} from 'react-test-renderer';
import {SharedValue} from 'react-native-reanimated';
import {ANIMATION_DURATIONS, ANIMATION_VALUES, PERFORMANCE_CONSTANTS,} from '../constants';
import type {AnimationPerformanceMetrics, AnimationTestConfig, AnimationTestResult,} from '../types';

// Performance measurement utilities
export class AnimationPerformanceMeasurer {
    private startTime: number = 0;
    private endTime: number = 0;
    private animationName: string;
    private frameCount: number = 0;
    private frameStartTime: number = 0;

    constructor(animationName: string) {
        this.animationName = animationName;
    }

    start(): void {
        this.startTime = performance.now();
        this.frameStartTime = this.startTime;
        this.frameCount = 0;
    }

    recordFrame(): void {
        this.frameCount++;
    }

    end(): AnimationPerformanceMetrics {
        this.endTime = performance.now();
        const duration = this.endTime - this.startTime;
        const averageFPS = this.frameCount > 0 ? (this.frameCount / (duration / 1000)) : 0;
        const frameDrops = Math.max(0, Math.floor((duration / PERFORMANCE_CONSTANTS.FRAME_TIME_MS) - this.frameCount));

        return {
            animationName: this.animationName,
            startTime: this.startTime,
            endTime: this.endTime,
            duration,
            frameDrops,
            averageFPS,
        };
    }

    getMetrics(): AnimationPerformanceMetrics | null {
        if (this.startTime === 0) return null;

        return this.end();
    }
}

// Animation validation helpers
export const AnimationValidators = {
    /**
     * Validates that an opacity animation reaches the expected value
     */
    validateOpacityAnimation: (
        sharedValue: SharedValue<number>,
        expectedValue: number,
        tolerance: number = 0.01
    ): boolean => {
        const actualValue = sharedValue.value;
        return Math.abs(actualValue - expectedValue) <= tolerance;
    },

    /**
     * Validates that a scale animation reaches the expected value
     */
    validateScaleAnimation: (
        sharedValue: SharedValue<number>,
        expectedValue: number,
        tolerance: number = 0.01
    ): boolean => {
        const actualValue = sharedValue.value;
        return Math.abs(actualValue - expectedValue) <= tolerance;
    },

    /**
     * Validates that a translation animation reaches the expected value
     */
    validateTranslationAnimation: (
        sharedValue: SharedValue<number>,
        expectedValue: number,
        tolerance: number = 1
    ): boolean => {
        const actualValue = sharedValue.value;
        return Math.abs(actualValue - expectedValue) <= tolerance;
    },

    /**
     * Validates that an animation completes within the expected duration
     */
    validateAnimationDuration: (
        actualDuration: number,
        expectedDuration: number,
        toleranceMs: number = 50
    ): boolean => {
        return Math.abs(actualDuration - expectedDuration) <= toleranceMs;
    },

    /**
     * Validates that frame rate meets performance requirements
     */
    validateFrameRate: (
        actualFPS: number,
        targetFPS: number = PERFORMANCE_CONSTANTS.TARGET_FPS,
        tolerance: number = 0.1
    ): boolean => {
        return actualFPS >= (targetFPS * (1 - tolerance));
    },
};

// Test execution helpers
export const AnimationTestHelpers = {
    /**
     * Waits for an animation to complete
     */
    waitForAnimation: async (
        duration: number,
        bufferMs: number = 100
    ): Promise<void> => {
        return new Promise((resolve) => {
            setTimeout(resolve, duration + bufferMs);
        });
    },

    /**
     * Executes an animation test with performance monitoring
     */
    executeAnimationTest: async (
        testName: string,
        animationFunction: () => void,
        config: AnimationTestConfig = {}
    ): Promise<AnimationTestResult> => {
        const {
            timeout = 5000,
            expectedDuration = ANIMATION_DURATIONS.NORMAL,
            toleranceMs = 50,
            checkFrameRate = false,
            targetFPS = PERFORMANCE_CONSTANTS.TARGET_FPS,
        } = config;

        const measurer = new AnimationPerformanceMeasurer(testName);
        let success = false;
        let error: string | undefined;

        try {
            measurer.start();

            await act(async () => {
                animationFunction();
                await AnimationTestHelpers.waitForAnimation(expectedDuration);
            });

            const metrics = measurer.end();

            // Validate duration
            const durationValid = AnimationValidators.validateAnimationDuration(
                metrics.duration,
                expectedDuration,
                toleranceMs
            );

            // Validate frame rate if requested
            let frameRateValid = true;
            if (checkFrameRate && metrics.averageFPS) {
                frameRateValid = AnimationValidators.validateFrameRate(
                    metrics.averageFPS,
                    targetFPS
                );
            }

            success = durationValid && frameRateValid;

            if (!success) {
                error = `Animation validation failed. Duration: ${metrics.duration}ms (expected: ${expectedDuration}ms), FPS: ${metrics.averageFPS}`;
            }

            return {
                success,
                actualDuration: metrics.duration,
                expectedDuration,
                frameRate: metrics.averageFPS,
                error,
            };
        } catch (e) {
            return {
                success: false,
                actualDuration: 0,
                expectedDuration,
                error: e instanceof Error ? e.message : 'Unknown error',
            };
        }
    },

    /**
     * Creates a mock SharedValue for testing
     */
    createMockSharedValue: <T>(initialValue: T): SharedValue<T> => {
        let value = initialValue;

        return {
            value,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            modify: jest.fn((modifier) => {
                value = modifier(value);
                return value;
            }),
        } as unknown as SharedValue<T>;
    },

    /**
     * Simulates frame updates for performance testing
     */
    simulateFrameUpdates: (
        measurer: AnimationPerformanceMeasurer,
        duration: number,
        targetFPS: number = 60
    ): void => {
        const frameInterval = 1000 / targetFPS;
        const frameCount = Math.floor(duration / frameInterval);

        for (let i = 0; i < frameCount; i++) {
            setTimeout(() => {
                measurer.recordFrame();
            }, i * frameInterval);
        }
    },
};

// Common test scenarios
export const AnimationTestScenarios = {
    /**
     * Tests a fade in animation
     */
    testFadeIn: async (
        opacityValue: SharedValue<number>,
        animationFunction: () => void,
        config?: AnimationTestConfig
    ): Promise<AnimationTestResult> => {
        const result = await AnimationTestHelpers.executeAnimationTest(
            'fadeIn',
            animationFunction,
            config
        );

        // Additional validation for fade in
        if (result.success) {
            const opacityValid = AnimationValidators.validateOpacityAnimation(
                opacityValue,
                ANIMATION_VALUES.OPACITY.VISIBLE
            );

            if (!opacityValid) {
                result.success = false;
                result.error = `Opacity validation failed. Expected: ${ANIMATION_VALUES.OPACITY.VISIBLE}, Actual: ${opacityValue.value}`;
            }
        }

        return result;
    },

    /**
     * Tests a fade out animation
     */
    testFadeOut: async (
        opacityValue: SharedValue<number>,
        animationFunction: () => void,
        config?: AnimationTestConfig
    ): Promise<AnimationTestResult> => {
        const result = await AnimationTestHelpers.executeAnimationTest(
            'fadeOut',
            animationFunction,
            config
        );

        // Additional validation for fade out
        if (result.success) {
            const opacityValid = AnimationValidators.validateOpacityAnimation(
                opacityValue,
                ANIMATION_VALUES.OPACITY.HIDDEN
            );

            if (!opacityValid) {
                result.success = false;
                result.error = `Opacity validation failed. Expected: ${ANIMATION_VALUES.OPACITY.HIDDEN}, Actual: ${opacityValue.value}`;
            }
        }

        return result;
    },

    /**
     * Tests a scale animation
     */
    testScaleAnimation: async (
        scaleValue: SharedValue<number>,
        expectedScale: number,
        animationFunction: () => void,
        config?: AnimationTestConfig
    ): Promise<AnimationTestResult> => {
        const result = await AnimationTestHelpers.executeAnimationTest(
            'scaleAnimation',
            animationFunction,
            config
        );

        // Additional validation for scale
        if (result.success) {
            const scaleValid = AnimationValidators.validateScaleAnimation(
                scaleValue,
                expectedScale
            );

            if (!scaleValid) {
                result.success = false;
                result.error = `Scale validation failed. Expected: ${expectedScale}, Actual: ${scaleValue.value}`;
            }
        }

        return result;
    },

    /**
     * Tests a slide animation
     */
    testSlideAnimation: async (
        translateValue: SharedValue<number>,
        expectedPosition: number,
        animationFunction: () => void,
        config?: AnimationTestConfig
    ): Promise<AnimationTestResult> => {
        const result = await AnimationTestHelpers.executeAnimationTest(
            'slideAnimation',
            animationFunction,
            config
        );

        // Additional validation for translation
        if (result.success) {
            const translationValid = AnimationValidators.validateTranslationAnimation(
                translateValue,
                expectedPosition
            );

            if (!translationValid) {
                result.success = false;
                result.error = `Translation validation failed. Expected: ${expectedPosition}, Actual: ${translateValue.value}`;
            }
        }

        return result;
    },
};

// Performance benchmarking utilities
export const PerformanceBenchmark = {
    /**
     * Benchmarks animation performance across multiple runs
     */
    benchmarkAnimation: async (
        testName: string,
        animationFunction: () => void,
        runs: number = 10,
        config?: AnimationTestConfig
    ): Promise<{
        averageDuration: number;
        minDuration: number;
        maxDuration: number;
        averageFPS: number;
        successRate: number;
    }> => {
        const results: AnimationTestResult[] = [];

        for (let i = 0; i < runs; i++) {
            const result = await AnimationTestHelpers.executeAnimationTest(
                `${testName}_run_${i + 1}`,
                animationFunction,
                config
            );
            results.push(result);
        }

        const successfulResults = results.filter(r => r.success);
        const durations = results.map(r => r.actualDuration);
        const frameRates = results.map(r => r.frameRate || 0).filter(fps => fps > 0);

        return {
            averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            averageFPS: frameRates.length > 0 ? frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length : 0,
            successRate: successfulResults.length / results.length,
        };
    },

    /**
     * Compares performance between two animation implementations
     */
    compareAnimations: async (
        testName: string,
        animation1: () => void,
        animation2: () => void,
        runs: number = 5,
        config?: AnimationTestConfig
    ): Promise<{
        animation1: any;
        animation2: any;
        winner: 'animation1' | 'animation2' | 'tie';
        improvement: number;
    }> => {
        const [benchmark1, benchmark2] = await Promise.all([
            PerformanceBenchmark.benchmarkAnimation(`${testName}_v1`, animation1, runs, config),
            PerformanceBenchmark.benchmarkAnimation(`${testName}_v2`, animation2, runs, config),
        ]);

        let winner: 'animation1' | 'animation2' | 'tie' = 'tie';
        let improvement = 0;

        if (benchmark1.averageDuration < benchmark2.averageDuration) {
            winner = 'animation1';
            improvement = ((benchmark2.averageDuration - benchmark1.averageDuration) / benchmark2.averageDuration) * 100;
        } else if (benchmark2.averageDuration < benchmark1.averageDuration) {
            winner = 'animation2';
            improvement = ((benchmark1.averageDuration - benchmark2.averageDuration) / benchmark1.averageDuration) * 100;
        }

        return {
            animation1: benchmark1,
            animation2: benchmark2,
            winner,
            improvement,
        };
    },
};

// Test setup and teardown utilities
export const TestSetup = {
    /**
     * Sets up the test environment for animation testing
     */
    setupAnimationTesting: () => {
        // Mock performance.now if not available
        if (typeof performance === 'undefined') {
            (global as any).performance = {
                now: () => Date.now(),
            };
        }

        // Mock console methods for cleaner test output
        const originalConsoleLog = console.log;
        const originalConsoleWarn = console.warn;

        console.log = jest.fn();
        console.warn = jest.fn();

        return {
            restore: () => {
                console.log = originalConsoleLog;
                console.warn = originalConsoleWarn;
            },
        };
    },

    /**
     * Creates a test environment with mocked timers
     */
    setupMockTimers: () => {
        jest.useFakeTimers();

        return {
            advanceTime: (ms: number) => {
                jest.advanceTimersByTime(ms);
            },
            restore: () => {
                jest.useRealTimers();
            },
        };
    },
};
