/**
 * JSI Crash Reporting Hook
 * Provides automatic crash detection and reporting for JSI-related issues
 */

import React, {useCallback, useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import JSIPerformanceMonitor from '../services/JSIPerformanceMonitor';

interface CrashReportingConfig {
    componentName: string;
    enableAutoReporting?: boolean;
    enableConsoleLogging?: boolean;
    onCrashDetected?: (error: Error) => void;
}

interface JSICrashReportingHook {
    reportCrash: (error: Error, context?: string) => void;
    reportJSIViolation: (violation: string, context?: string) => void;
    wrapAsyncOperation: <T>(
        operation: () => Promise<T>,
        operationName: string
    ) => Promise<T>;
    wrapSyncOperation: <T>(
        operation: () => T,
        operationName: string
    ) => T | null;
}

/**
 * Hook for JSI crash reporting and error handling
 */
export const useJSICrashReporting = (
    config: CrashReportingConfig
): JSICrashReportingHook => {
    const {
        componentName,
        enableAutoReporting = true,
        enableConsoleLogging = true,
        onCrashDetected,
    } = config;

    const crashCountRef = useRef(0);
    const lastCrashTimeRef = useRef(0);

    // Setup global error handlers
    useEffect(() => {
        if (!enableAutoReporting) {return;}

        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        // Override console.error to catch JSI-related errors
        console.error = (...args: unknown[]) => {
            const errorMessage = args.join(' ');

            // Check for JSI-related error patterns
            if (isJSIRelatedError(errorMessage)) {
                const error = new Error(errorMessage);
                handleCrashDetection(error, 'Console Error');
            }

            if (enableConsoleLogging) {
                originalConsoleError.apply(console, args);
            }
        };

        // Override console.warn to catch JSI warnings
        console.warn = (...args: unknown[]) => {
            const warningMessage = args.join(' ');

            // Check for JSI-related warning patterns
            if (isJSIRelatedWarning(warningMessage)) {
                const error = new Error(`JSI Warning: ${warningMessage}`);
                handleCrashDetection(error, 'Console Warning');
            }

            if (enableConsoleLogging) {
                originalConsoleWarn.apply(console, args);
            }
        };

        // Setup unhandled promise rejection handler
        const handleUnhandledRejection = (event: {reason?: unknown}) => {
            const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

            if (isJSIRelatedError(error.message)) {
                handleCrashDetection(error, 'Unhandled Promise Rejection');
            }
        };

        // Setup global error handler
        const handleGlobalError = (event: {message?: string; filename?: string; lineno?: number; colno?: number}) => {
            if (isJSIRelatedError(event.message ?? '')) {
                const error = new Error(event.message);
                error.stack = `${event.filename}:${event.lineno}:${event.colno}`;
                handleCrashDetection(error, 'Global Error');
            }
        };

        if (Platform.OS === 'web') {
            const win = window as unknown as {
                addEventListener: (type: string, listener: (event: never) => void) => void;
                removeEventListener: (type: string, listener: (event: never) => void) => void;
            };
            win.addEventListener('unhandledrejection', handleUnhandledRejection as (event: never) => void);
            win.addEventListener('error', handleGlobalError as (event: never) => void);
        }

        // Cleanup function
        return () => {
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;

            if (Platform.OS === 'web') {
                const win = window as unknown as {
                    removeEventListener: (type: string, listener: (event: never) => void) => void;
                };
                win.removeEventListener('unhandledrejection', handleUnhandledRejection as (event: never) => void);
                win.removeEventListener('error', handleGlobalError as (event: never) => void);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 설정 변경 시에만 핸들러 재설치. handleCrashDetection 은 ref 기반 안정 콜백이라 의존 추가 불필요.
    }, [componentName, enableAutoReporting, enableConsoleLogging]);

    const handleCrashDetection = useCallback((error: Error, context: string) => {
        const now = Date.now();

        // Prevent spam reporting (max 1 crash per second)
        if (now - lastCrashTimeRef.current < 1000) {
            return;
        }

        lastCrashTimeRef.current = now;
        crashCountRef.current += 1;

        // Report to performance monitor
        JSIPerformanceMonitor.reportCrash(error, `${componentName} - ${context}`);

        // Call custom crash handler if provided
        if (onCrashDetected) {
            try {
                onCrashDetected(error);
            } catch (handlerError) {
                console.error('[JSI Crash Reporting] Error in crash handler:', handlerError);
            }
        }

        console.error(`[JSI Crash Reporting] Crash detected in ${componentName}:`, {
            error: error.message,
            context,
            crashCount: crashCountRef.current,
            stack: error.stack,
        });
    }, [componentName, onCrashDetected]);

    const reportCrash = useCallback((error: Error, context: string = 'Manual Report') => {
        handleCrashDetection(error, context);
    }, [handleCrashDetection]);

    const reportJSIViolation = useCallback((violation: string, context: string = 'JSI Violation') => {
        const error = new Error(`JSI Violation: ${violation}`);
        error.name = 'JSIViolationError';
        handleCrashDetection(error, context);
    }, [handleCrashDetection]);

    const wrapAsyncOperation = useCallback(async <T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> => {
        try {
            return await operation();
        } catch (error) {
            const wrappedError = error instanceof Error ? error : new Error(String(error));
            handleCrashDetection(wrappedError, `Async Operation: ${operationName}`);
            throw wrappedError;
        }
    }, [handleCrashDetection]);

    const wrapSyncOperation = useCallback(<T>(
        operation: () => T,
        operationName: string
    ): T | null => {
        try {
            return operation();
        } catch (error) {
            const wrappedError = error instanceof Error ? error : new Error(String(error));
            handleCrashDetection(wrappedError, `Sync Operation: ${operationName}`);
            return null;
        }
    }, [handleCrashDetection]);

    return {
        reportCrash,
        reportJSIViolation,
        wrapAsyncOperation,
        wrapSyncOperation,
    };
};

/**
 * Check if an error message is related to JSI issues
 */
function isJSIRelatedError(message: string): boolean {
    const jsiErrorPatterns = [
        'JSI assertion failure',
        'worklet',
        'reanimated',
        'SharedValue',
        'runOnJS',
        'runOnUI',
        'useSharedValue',
        'useAnimatedStyle',
        'withTiming',
        'withSpring',
        'interpolate',
        'Animated.Value',
        'NativeAnimatedHelper',
        'RCTUIManager',
        'UIManagerBinding',
        'Fabric',
        'TurboModule',
        'JSIException',
        'Cannot access property',
        'is not a function',
        'undefined is not an object',
    ];

    const lowerMessage = message.toLowerCase();
    return jsiErrorPatterns.some(pattern =>
        lowerMessage.includes(pattern.toLowerCase())
    );
}

/**
 * Check if a warning message is related to JSI issues
 */
function isJSIRelatedWarning(message: string): boolean {
    const jsiWarningPatterns = [
        'worklet',
        'reanimated',
        'SharedValue',
        'runOnJS',
        'runOnUI',
        'Animated',
        'useSharedValue',
        'useAnimatedStyle',
        'Performance warning',
        'Memory warning',
        'Frame drop',
        'Skipped frame',
        'VirtualizedList',
        'FlatList performance',
    ];

    const lowerMessage = message.toLowerCase();
    return jsiWarningPatterns.some(pattern =>
        lowerMessage.includes(pattern.toLowerCase())
    );
}

/**
 * Higher-order component for automatic crash reporting
 */
export function withJSICrashReporting<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    componentName: string
): React.ComponentType<P> {
    return function JSICrashReportingWrapper(props: P) {
        const crashReporting = useJSICrashReporting({
            componentName,
            enableAutoReporting: true,
            enableConsoleLogging: true,
        });

        // Wrap the component in error boundary logic
        try {
            return React.createElement(WrappedComponent, props);
        } catch (error) {
            const wrappedError = error instanceof Error ? error : new Error(String(error));
            crashReporting.reportCrash(wrappedError, 'Component Render');

            // Return fallback UI
            return null;
        }
    };
}

export default useJSICrashReporting;
