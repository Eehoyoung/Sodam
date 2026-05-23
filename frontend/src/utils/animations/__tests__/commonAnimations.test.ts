/**
 * Tests for Common Animation Functions
 *
 * This file demonstrates how to use the animation testing utilities
 * to test the common animation functions.
 */

import {
    AnimationTestHelpers,
    AnimationTestScenarios,
    AnimationValidators,
    PerformanceBenchmark,
    TestSetup,
} from './animationTestUtils';
import {fadeIn, fadeOut, pulse, scaleIn, scaleOut, shake, slideDown, slideUp,} from '../commonAnimations';
import {ANIMATION_DURATIONS, ANIMATION_VALUES,} from '../constants';

describe('Common Animation Functions', () => {
    let testSetup: ReturnType<typeof TestSetup.setupAnimationTesting>;

    beforeEach(() => {
        testSetup = TestSetup.setupAnimationTesting();
    });

    afterEach(() => {
        testSetup.restore();
    });

    describe('Fade Animations', () => {
        test('fadeIn should animate opacity from 0 to 1', async () => {
            const opacityValue = AnimationTestHelpers.createMockSharedValue(0);

            const result = await AnimationTestScenarios.testFadeIn(
                opacityValue,
                () => {
                    opacityValue.value = fadeIn();
                },
                {
                    expectedDuration: ANIMATION_DURATIONS.NORMAL,
                    toleranceMs: 50,
                }
            );

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('fadeOut should animate opacity from 1 to 0', async () => {
            const opacityValue = AnimationTestHelpers.createMockSharedValue(1);

            const result = await AnimationTestScenarios.testFadeOut(
                opacityValue,
                () => {
                    opacityValue.value = fadeOut();
                },
                {
                    expectedDuration: ANIMATION_DURATIONS.NORMAL,
                    toleranceMs: 50,
                }
            );

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('fadeIn with custom duration should respect timing', async () => {
            const customDuration = 500;
            const opacityValue = AnimationTestHelpers.createMockSharedValue(0);

            const result = await AnimationTestHelpers.executeAnimationTest(
                'fadeIn_custom_duration',
                () => {
                    opacityValue.value = fadeIn(customDuration);
                },
                {
                    expectedDuration: customDuration,
                    toleranceMs: 50,
                }
            );

            expect(result.success).toBe(true);
            expect(Math.abs(result.actualDuration - customDuration)).toBeLessThanOrEqual(50);
        });
    });

    describe('Scale Animations', () => {
        test('scaleIn should animate scale from 0 to 1', async () => {
            const scaleValue = AnimationTestHelpers.createMockSharedValue(0);

            const result = await AnimationTestScenarios.testScaleAnimation(
                scaleValue,
                ANIMATION_VALUES.SCALE.NORMAL,
                () => {
                    scaleValue.value = scaleIn();
                }
            );

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('scaleOut should animate scale from 1 to 0', async () => {
            const scaleValue = AnimationTestHelpers.createMockSharedValue(1);

            const result = await AnimationTestScenarios.testScaleAnimation(
                scaleValue,
                ANIMATION_VALUES.SCALE.HIDDEN,
                () => {
                    scaleValue.value = scaleOut();
                }
            );

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });
    });

    describe('Slide Animations', () => {
        test('slideUp should animate translateY to negative value', async () => {
            const translateValue = AnimationTestHelpers.createMockSharedValue(0);
            const slideDistance = 50;

            const result = await AnimationTestScenarios.testSlideAnimation(
                translateValue,
                -slideDistance,
                () => {
                    translateValue.value = slideUp(slideDistance);
                }
            );

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('slideDown should animate translateY to positive value', async () => {
            const translateValue = AnimationTestHelpers.createMockSharedValue(0);
            const slideDistance = 50;

            const result = await AnimationTestScenarios.testSlideAnimation(
                translateValue,
                slideDistance,
                () => {
                    translateValue.value = slideDown(slideDistance);
                }
            );

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });
    });

    describe('Complex Animations', () => {
        test('pulse animation should repeat correctly', async () => {
            const scaleValue = AnimationTestHelpers.createMockSharedValue(1);

            const result = await AnimationTestHelpers.executeAnimationTest(
                'pulse_animation',
                () => {
                    scaleValue.value = pulse(1.2, 1000, 2); // 2 iterations
                },
                {
                    expectedDuration: 2000, // 2 iterations * 1000ms each
                    toleranceMs: 100,
                }
            );

            expect(result.success).toBe(true);
        });

        test('shake animation should oscillate correctly', async () => {
            const translateValue = AnimationTestHelpers.createMockSharedValue(0);

            const result = await AnimationTestHelpers.executeAnimationTest(
                'shake_animation',
                () => {
                    translateValue.value = shake(10, 500, 3); // 3 iterations
                },
                {
                    expectedDuration: 500,
                    toleranceMs: 100,
                }
            );

            expect(result.success).toBe(true);
        });
    });

    describe('Animation Validation', () => {
        test('should validate opacity values correctly', () => {
            const opacityValue = AnimationTestHelpers.createMockSharedValue(1);

            const isValid = AnimationValidators.validateOpacityAnimation(
                opacityValue,
                ANIMATION_VALUES.OPACITY.VISIBLE,
                0.01
            );

            expect(isValid).toBe(true);
        });

        test('should validate scale values correctly', () => {
            const scaleValue = AnimationTestHelpers.createMockSharedValue(1);

            const isValid = AnimationValidators.validateScaleAnimation(
                scaleValue,
                ANIMATION_VALUES.SCALE.NORMAL,
                0.01
            );

            expect(isValid).toBe(true);
        });

        test('should validate translation values correctly', () => {
            const translateValue = AnimationTestHelpers.createMockSharedValue(-50);

            const isValid = AnimationValidators.validateTranslationAnimation(
                translateValue,
                -50,
                1
            );

            expect(isValid).toBe(true);
        });

        test('should validate animation duration correctly', () => {
            const isValid = AnimationValidators.validateAnimationDuration(
                305, // actual duration
                300, // expected duration
                10   // tolerance
            );

            expect(isValid).toBe(true);
        });

        test('should validate frame rate correctly', () => {
            const isValid = AnimationValidators.validateFrameRate(
                58, // actual FPS
                60, // target FPS
                0.1 // 10% tolerance
            );

            expect(isValid).toBe(true);
        });
    });

    describe('Performance Benchmarking', () => {
        test('should benchmark animation performance', async () => {
            const benchmark = await PerformanceBenchmark.benchmarkAnimation(
                'fadeIn_benchmark',
                () => {
                    const opacityValue = AnimationTestHelpers.createMockSharedValue(0);
                    opacityValue.value = fadeIn();
                },
                3, // 3 runs
                {
                    expectedDuration: ANIMATION_DURATIONS.NORMAL,
                }
            );

            expect(benchmark.averageDuration).toBeGreaterThan(0);
            expect(benchmark.minDuration).toBeGreaterThan(0);
            expect(benchmark.maxDuration).toBeGreaterThan(0);
            expect(benchmark.successRate).toBeGreaterThan(0);
        });

        test('should compare two animation implementations', async () => {
            const animation1 = () => {
                const value = AnimationTestHelpers.createMockSharedValue(0);
                value.value = fadeIn(200); // faster
            };

            const animation2 = () => {
                const value = AnimationTestHelpers.createMockSharedValue(0);
                value.value = fadeIn(400); // slower
            };

            const comparison = await PerformanceBenchmark.compareAnimations(
                'fadeIn_comparison',
                animation1,
                animation2,
                2, // 2 runs each
                {
                    expectedDuration: 300, // average
                }
            );

            expect(comparison.winner).toBeDefined();
            expect(comparison.improvement).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Test Utilities', () => {
        test('should create mock SharedValue correctly', () => {
            const mockValue = AnimationTestHelpers.createMockSharedValue(42);

            expect(mockValue.value).toBe(42);
            expect(mockValue.addListener).toBeDefined();
            expect(mockValue.removeListener).toBeDefined();
            expect(mockValue.modify).toBeDefined();
        });

        test('should wait for animation completion', async () => {
            const startTime = Date.now();

            await AnimationTestHelpers.waitForAnimation(100, 50);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeGreaterThanOrEqual(150); // 100ms + 50ms buffer
        });
    });

    describe('Mock Timers Integration', () => {
        test('should work with mock timers', () => {
            const mockTimers = TestSetup.setupMockTimers();

            let completed = false;
            setTimeout(() => {
                completed = true;
            }, 1000);

            expect(completed).toBe(false);

            mockTimers.advanceTime(1000);

            expect(completed).toBe(true);

            mockTimers.restore();
        });
    });
});
