import React, {Component, ReactNode} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {safeLogger} from '../utils/safeLogger';

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
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Initialization Error</Text>
                    <Text style={styles.message}>A critical error occurred during app initialization.</Text>
                    {__DEV__ && (
                        <ScrollView style={styles.errorContainer}>
                            <Text style={styles.errorText}>
                                {this.state.error.message}
                            </Text>
                        </ScrollView>
                    )}
                </View>
            );
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
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#721c24',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#721c24',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 24,
    },
    errorContainer: {
        backgroundColor: '#f8d7da',
        borderRadius: 8,
        padding: 16,
        maxHeight: 200,
        width: '100%',
    },
    errorText: {
        fontSize: 12,
        color: '#721c24',
        fontFamily: 'monospace',
        lineHeight: 16,
    },
});

export default InitializationErrorBoundary;
