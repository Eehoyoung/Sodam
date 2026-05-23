/**
 * Error Boundary Component for React Native
 * Catches and handles JavaScript errors in the React component tree
 * Provides fallback UI and error logging capabilities
 */

import React, {Component, ReactNode} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {hasError: false};
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {hasError: true, error};
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error details
        console.error('ErrorBoundary caught an error:', error);
        console.error('Error info:', errorInfo);

        // Update state with error info
        this.setState({errorInfo});

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // In production, you might want to log to a crash reporting service
        this.logErrorToService(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <View style={styles.container}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.title}>앱에 문제가 발생했습니다</Text>
                        <Text style={styles.subtitle}>
                            잠시 후 다시 시도해주세요
                        </Text>

                        {__DEV__ && this.state.error && (
                            <View style={styles.debugContainer}>
                                <Text style={styles.debugTitle}>Debug Information:</Text>
                                <Text style={styles.debugText}>
                                    {this.state.error.message}
                                </Text>
                                {this.state.errorInfo && (
                                    <Text style={styles.debugText}>
                                        {this.state.errorInfo.componentStack}
                                    </Text>
                                )}
                            </View>
                        )}

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={this.handleRetry}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.retryButtonText}>다시 시도</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.reloadButton}
                                onPress={this.handleReload}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.reloadButtonText}>새로고침</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }

    private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
        // TODO: Integrate with crash reporting service (e.g., Firebase Crashlytics)
        if (__DEV__) {
            console.group('🚨 Error Boundary Report');
            console.error('Error:', error);
            console.error('Component Stack:', errorInfo.componentStack);
            console.error('Error Stack:', error.stack);
            console.groupEnd();
        }
    };

    private handleRetry = () => {
        this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined
        });
    };

    private handleReload = () => {
        // In React Native, we can't reload the entire app easily
        // This is a placeholder for potential reload functionality
        this.handleRetry();
    };
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        maxWidth: '90%',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#343a40',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6c757d',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 24,
    },
    debugContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        alignSelf: 'stretch',
    },
    debugTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#dc3545',
        marginBottom: 8,
    },
    debugText: {
        fontSize: 12,
        color: '#6c757d',
        fontFamily: 'monospace',
        lineHeight: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    retryButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    reloadButton: {
        backgroundColor: '#6c757d',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100,
    },
    reloadButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ErrorBoundary;
