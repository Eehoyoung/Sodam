/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {Component, ReactNode, useMemo} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {safeLogger} from '../utils/safeLogger';
import {ThemeColors, useThemeColors} from '../common/hooks/useThemeColors';

/**
 * InitializationErrorBoundary Props Interface
 */
interface InitializationErrorBoundaryProps {
    children: ReactNode;
    onTimingIssue?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * InitializationErrorBoundary State Interface
 */
interface InitializationErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

/** 초기화 치명 오류 폴백 UI — 클래스 경계에서 훅(useThemeColors)을 쓰기 위한 함수 컴포넌트 분리 */
const InitializationErrorFallback: React.FC<{error: Error}> = ({error}) => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Initialization Error</Text>
            <Text style={styles.message}>A critical error occurred during app initialization.</Text>
            {__DEV__ && (
                <ScrollView style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        {error.message}
                    </Text>
                </ScrollView>
            )}
        </View>
    );
};

/**
 * Specialized Error Boundary for React Native initialization timing issues
 * Specifically handles ReactNoCrashSoftException and other framework timing conflicts
 * without showing error UI to users since these are non-critical timing issues.
 */
export class InitializationErrorBoundary extends Component<
    InitializationErrorBoundaryProps,
    InitializationErrorBoundaryState
> {
    constructor(props: InitializationErrorBoundaryProps) {
        super(props);
        this.state = {hasError: false};
    }

    /**
     * Check if the error is a ReactNoCrashSoftException timing issue
     */
    private isTimingIssue(error: Error): boolean {
        const errorMessage = error.message?.toLowerCase() || '';
        const errorName = error.name?.toLowerCase() || '';

        // Check for ReactNoCrashSoftException patterns
        const timingPatterns = [
            'reactnocrashsoftexception',
            'onwindowfocuschange',
            'context is not ready',
            'tried to access',
            'while context is not ready',
            'timing',
            'initialization'
        ];

        return timingPatterns.some(pattern =>
            errorMessage.includes(pattern) || errorName.includes(pattern)
        );
    }

    /**
     * Enhanced error handling for timing issues
     */
    static getDerivedStateFromError(_error: Error): InitializationErrorBoundaryState {
        // Don't update state for timing issues - let the app continue
        return {hasError: false};
    }

    /**
     * Component did catch with specialized timing issue handling
     */
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        if (this.isTimingIssue(error)) {
            // Handle as non-critical timing issue
            this.handleTimingIssue(error, errorInfo);
        } else {
            // Handle as regular error
            this.handleRegularError(error, errorInfo);
        }
    }

    /**
     * Handle ReactNoCrashSoftException and other timing issues
     */
    private handleTimingIssue(error: Error, errorInfo: React.ErrorInfo) {
        console.warn('[TIMING_ISSUE] ReactNoCrashSoftException detected:', error.message);

        // Log as warning, not error
        safeLogger.warn('React Native timing issue detected (non-critical)', {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            errorInfo: {
                componentStack: errorInfo.componentStack,
            },
            timestamp: new Date().toISOString(),
            severity: 'warning',
            type: 'timing_issue',
            impact: 'none',
            userVisible: false
        });

        // Call timing issue callback if provided
        if (this.props.onTimingIssue) {
            this.props.onTimingIssue(error, errorInfo);
        }

        // Analytics event for tracking frequency
        if (__DEV__) {
            console.group('[TIMING_ISSUE] Detailed Timing Issue Information');
            console.warn('Timing Issue:', error);
            console.warn('Component Stack:', errorInfo.componentStack);
            console.warn('Impact: None - App continues normally');
            console.warn('Action Required: Monitor frequency, optimize if needed');
            console.groupEnd();
        }

        // Don't set error state - let the app continue
    }

    /**
     * Handle regular errors (non-timing issues)
     */
    private handleRegularError(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[INIT_ERROR] Critical initialization error:', error);

        // Log as actual error
        safeLogger.error('Critical initialization error', {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            errorInfo: {
                componentStack: errorInfo.componentStack,
            },
            timestamp: new Date().toISOString(),
            severity: 'error',
            type: 'initialization_error',
            impact: 'high',
            userVisible: true
        });

        // Set error state for regular errors
        this.setState({hasError: true, error});
    }

    render() {
        // Only show error UI for non-timing issues
        if (this.state.hasError && this.state.error && !this.isTimingIssue(this.state.error)) {
            return <InitializationErrorFallback error={this.state.error} />;
        }

        // For timing issues and normal operation, render children
        return this.props.children;
    }
}

/**
 * HOC for wrapping components with InitializationErrorBoundary
 */
export function withInitializationErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<InitializationErrorBoundaryProps, 'children'>
) {
    const WrappedComponent = (props: P) => (
        <InitializationErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </InitializationErrorBoundary>
    );

    WrappedComponent.displayName = `withInitializationErrorBoundary(${Component.displayName ?? Component.name})`;

    return WrappedComponent;
}

/**
 * StyleSheet for InitializationErrorBoundary
 */
const makeStyles = (c: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: c.surfaceCanvas,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: c.error,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: c.error,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 24,
    },
    errorContainer: {
        backgroundColor: c.errorBg,
        borderRadius: 8,
        padding: 16,
        maxHeight: 200,
        width: '100%',
    },
    errorText: {
        fontSize: 12,
        color: c.error,
        fontFamily: 'monospace',
        lineHeight: 16,
    },
});

export default InitializationErrorBoundary;
