/**
 * Error Boundary Component for React Native
 * Catches and handles JavaScript errors in the React component tree
 * Provides fallback UI and error logging capabilities
 */

/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {Component, ReactNode, useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ThemeColors, useThemeColors} from '../hooks/useThemeColors';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface FallbackProps {
    error?: Error;
    errorInfo?: React.ErrorInfo;
    onRetry: () => void;
    onReload: () => void;
}

/** 기본 폴백 UI — 클래스 ErrorBoundary 에서 훅(useThemeColors)을 쓰기 위한 함수 컴포넌트 분리 */
const DefaultErrorFallback: React.FC<FallbackProps> = ({error, errorInfo, onRetry, onReload}) => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);

    return (
        <View style={styles.container}>
            <View style={styles.errorContainer}>
                <Text style={styles.title}>앱에 문제가 발생했습니다</Text>
                <Text style={styles.subtitle}>
                    잠시 후 다시 시도해주세요
                </Text>

                {__DEV__ && error && (
                    <View style={styles.debugContainer}>
                        <Text style={styles.debugTitle}>Debug Information:</Text>
                        <Text style={styles.debugText}>
                            {error.message}
                        </Text>
                        {errorInfo && (
                            <Text style={styles.debugText}>
                                {errorInfo.componentStack}
                            </Text>
                        )}
                    </View>
                )}

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={onRetry}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.reloadButton}
                        onPress={onReload}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.reloadButtonText}>새로고침</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

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
                <DefaultErrorFallback
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    onRetry={this.handleRetry}
                    onReload={this.handleReload}
                />
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: c.surfaceCanvas,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorContainer: {
        backgroundColor: c.surface,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        shadowColor: c.shadowColor,
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
        color: c.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: c.textSecondary,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 24,
    },
    debugContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: c.surfaceMuted,
        borderRadius: 8,
        alignSelf: 'stretch',
    },
    debugTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: c.error,
        marginBottom: 8,
    },
    debugText: {
        fontSize: 12,
        color: c.textSecondary,
        fontFamily: 'monospace',
        lineHeight: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    retryButton: {
        backgroundColor: c.brandPrimary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100,
    },
    retryButtonText: {
        color: c.textInverse,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    reloadButton: {
        backgroundColor: c.textSecondary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100,
    },
    reloadButtonText: {
        color: c.textInverse,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ErrorBoundary;
