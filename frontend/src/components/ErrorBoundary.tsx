import React, {Component, ReactNode} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {safeLogger} from '../utils/safeLogger';

/**
 * ErrorBoundary Props 인터페이스
 */
interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * ErrorBoundary State 인터페이스
 */
interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

/**
 * 전역 에러 바운더리 컴포넌트
 * React 컴포넌트 트리에서 발생하는 JavaScript 오류를 포착하고
 * 사용자에게 친화적인 오류 화면을 보여줍니다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {hasError: false};
    }

    /**
     * 에러가 발생했을 때 상태를 업데이트합니다.
     * @param error 발생한 에러
     * @returns 새로운 상태
     */
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        console.error('[ErrorBoundary] Error caught by boundary:', error);
        return {
            hasError: true,
            error
        };
    }

    /**
     * 에러가 발생했을 때 호출되는 라이프사이클 메서드
     * @param error 발생한 에러
     * @param errorInfo 에러 정보 (컴포넌트 스택 등)
     */
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Component stack trace:', errorInfo.componentStack);

        // 상태에 에러 정보 저장
        this.setState({
            error,
            errorInfo
        });

        // 에러 로깅 서비스로 전송
        this.logErrorToService(error, errorInfo);

        // 부모 컴포넌트에서 제공한 에러 핸들러 호출
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            // 사용자 정의 fallback UI가 제공된 경우 사용
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // 기본 에러 UI 렌더링
            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.errorContainer}>
                            {/* 에러 아이콘 */}
                            <View style={styles.iconContainer}>
                                <Text style={styles.errorIcon}>⚠️</Text>
                            </View>

                            {/* 에러 메시지 */}
                            <Text style={styles.title}>문제가 발생했습니다</Text>
                            <Text style={styles.message}>
                                예상치 못한 오류가 발생했습니다.{'\n'}
                                잠시 후 다시 시도해주세요.
                            </Text>

                            {/* 개발 환경에서만 상세 에러 정보 표시 */}
                            {this.shouldShowErrorDetails() && this.state.error && (
                                <View style={styles.errorDetails}>
                                    <Text style={styles.errorDetailsTitle}>개발자 정보:</Text>
                                    <Text style={styles.errorDetailsText}>
                                        {this.state.error.name}: {this.state.error.message}
                                    </Text>
                                    {this.state.error.stack && (
                                        <Text style={styles.errorStack}>
                                            {this.state.error.stack}
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* 액션 버튼들 */}
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.retryButton]}
                                    onPress={this.handleRetry}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.retryButtonText}>다시 시도</Text>
                                </TouchableOpacity>

                                {__DEV__ && (
                                    <TouchableOpacity
                                        style={[styles.button, styles.restartButton]}
                                        onPress={this.handleRestart}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.restartButtonText}>앱 재시작</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* 도움말 텍스트 */}
                            <Text style={styles.helpText}>
                                문제가 계속 발생하면 앱을 재시작하거나{'\n'}
                                고객센터에 문의해주세요.
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }

    /**
     * 에러를 로깅 서비스로 전송합니다.
     * @param error 발생한 에러
     * @param errorInfo 에러 정보
     */
    private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
        try {
            // safeLogger를 사용하여 에러 로깅
            safeLogger.error('React Error Boundary caught an error', {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                errorInfo: {
                    componentStack: errorInfo.componentStack,
                },
                timestamp: new Date().toISOString(),
                userAgent: (typeof globalThis !== 'undefined' && (globalThis as any).navigator?.userAgent) || 'React Native',
            });

            // 개발 환경에서는 콘솔에 상세 정보 출력
            if (__DEV__) {
                console.group('[ErrorBoundary] Detailed Error Information');
                console.error('Error:', error);
                console.error('Error Info:', errorInfo);
                console.error('Component Stack:', errorInfo.componentStack);
                console.groupEnd();
            }
        } catch (loggingError) {
            console.error('[ErrorBoundary] Failed to log error:', loggingError);
        }
    }

    /**
     * 에러 상태를 초기화하고 다시 시도합니다.
     */
    private handleRetry = () => {
        console.log('[ErrorBoundary] Retrying after error...');
        this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined
        });
    };

    /**
     * 앱을 다시 시작합니다 (개발 환경에서만)
     */
    private handleRestart = () => {
        if (__DEV__) {
            console.log('[ErrorBoundary] Restarting app in development mode...');
            // 개발 환경에서는 페이지 새로고침 (웹 환경에서만)
            const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
            if (g.window && g.window.location && typeof g.window.location.reload === 'function') {
                g.window.location.reload();
            }
        } else {
            // 프로덕션에서는 앱 재시작 로직 구현
            console.log('[ErrorBoundary] App restart requested in production mode');
            this.handleRetry();
        }
    };

    /**
     * 에러 정보를 사용자에게 보여줄지 결정합니다.
     */
    private shouldShowErrorDetails(): boolean {
        return __DEV__ || false; // 프로덕션에서는 상세 에러 정보 숨김
    }
}

/**
 * 스타일 정의
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorContainer: {
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
    },
    iconContainer: {
        marginBottom: 20,
    },
    errorIcon: {
        fontSize: 64,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    errorDetails: {
        backgroundColor: '#f8d7da',
        borderColor: '#f5c6cb',
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        marginBottom: 30,
        width: '100%',
    },
    errorDetailsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#721c24',
        marginBottom: 8,
    },
    errorDetailsText: {
        fontSize: 12,
        color: '#721c24',
        marginBottom: 8,
    },
    errorStack: {
        fontSize: 10,
        color: '#721c24',
        fontFamily: 'monospace',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    retryButton: {
        backgroundColor: '#007bff',
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    restartButton: {
        backgroundColor: '#6c757d',
    },
    restartButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    helpText: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
        lineHeight: 20,
    },
});

/**
 * 함수형 컴포넌트를 위한 ErrorBoundary HOC
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
    const WrappedComponent = (props: P) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

    return WrappedComponent;
}

export default ErrorBoundary;
