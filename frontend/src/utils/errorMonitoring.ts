/**
 * 포괄적인 에러 모니터링 시스템
 * 고급 에러 추적, 크래시 리포팅, 성능 모니터링을 제공
 *
 * 생성일: 2025-07-21 05:42 (현지 시간)
 * 목적: 스택 트레이스 에러 방지 및 포괄적인 에러 처리 제공
 */

import {safeLogger} from './safeLogger';

// 분류를 위한 에러 타입
export enum ErrorType {
    RENDER_ERROR = 'RENDER_ERROR',
    ASYNC_ERROR = 'ASYNC_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    NAVIGATION_ERROR = 'NAVIGATION_ERROR',
    STORAGE_ERROR = 'STORAGE_ERROR',
    LIFECYCLE_ERROR = 'LIFECYCLE_ERROR',
    PERFORMANCE_ERROR = 'PERFORMANCE_ERROR'
}

// 에러 심각도 레벨
export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

// 에러 컨텍스트 인터페이스
interface ErrorContext {
    userId?: string;
    screen?: string;
    action?: string;
    timestamp: string;
    deviceInfo?: {
        platform: string;
        version: string;
        model?: string;
    };
    appState?: {
        isAuthenticated: boolean;
        currentRoute?: string;
        memoryUsage?: number;
    };
    additionalData?: Record<string, any>;
}

// 에러 리포트 인터페이스
interface ErrorReport {
    id: string;
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    stack?: string;
    context: ErrorContext;
    resolved: boolean;
    occurrenceCount: number;
    firstOccurrence: string;
    lastOccurrence: string;
}

class ErrorMonitoringSystem {
    private errorReports: Map<string, ErrorReport> = new Map();
    private performanceMetrics: Map<string, number[]> = new Map();
    private isEnabled: boolean = __DEV__;
    private maxReports: number = 100;

    constructor() {
        this.setupGlobalErrorHandlers();
        this.startPerformanceMonitoring();
    }

    /**
     * 에러 리포트
     */
    public reportError(params: {
        type: ErrorType;
        severity: ErrorSeverity;
        message: string;
        stack?: string;
        context?: Partial<ErrorContext>;
    }) {
        if (!this.isEnabled) return;

        const {type, severity, message, stack, context = {}} = params;
        const errorId = this.generateErrorId(type, message);
        const fullContext = {...this.getCurrentContext(), ...context};

        const existingReport = this.errorReports.get(errorId);

        if (existingReport) {
            // 기존 리포트 업데이트
            existingReport.occurrenceCount++;
            existingReport.lastOccurrence = fullContext.timestamp;
            existingReport.context = fullContext;
        } else {
            // 새 리포트 생성
            const newReport: ErrorReport = {
                id: errorId,
                type,
                severity,
                message,
                stack,
                context: fullContext,
                resolved: false,
                occurrenceCount: 1,
                firstOccurrence: fullContext.timestamp,
                lastOccurrence: fullContext.timestamp
            };

            this.errorReports.set(errorId, newReport);

            // Limit the number of stored reports
            if (this.errorReports.size > this.maxReports) {
                const oldestKey = this.errorReports.keys().next().value;
                if (oldestKey !== undefined) {
                    this.errorReports.delete(oldestKey);
                }
            }
        }

        // Log the error using safe logger
        this.logError(this.errorReports.get(errorId)!);
    }

    /**
     * Record performance metric
     */
    public recordPerformanceMetric(metric: string, value: number) {
        if (!this.isEnabled) return;

        if (!this.performanceMetrics.has(metric)) {
            this.performanceMetrics.set(metric, []);
        }

        const values = this.performanceMetrics.get(metric)!;
        values.push(value);

        // Keep only last 100 values
        if (values.length > 100) {
            values.shift();
        }
    }

    /**
     * Get error reports
     */
    public getErrorReports(): ErrorReport[] {
        return Array.from(this.errorReports.values());
    }

    /**
     * Get performance metrics
     */
    public getPerformanceMetrics(): Record<string, number[]> {
        const metrics: Record<string, number[]> = {};
        this.performanceMetrics.forEach((values, key) => {
            metrics[key] = [...values];
        });
        return metrics;
    }

    /**
     * Mark error as resolved
     */
    public markErrorResolved(errorId: string) {
        const report = this.errorReports.get(errorId);
        if (report) {
            report.resolved = true;
            safeLogger.log(`[ERROR_MONITOR] Error resolved: ${errorId}`);
        }
    }

    /**
     * Clear all error reports
     */
    public clearErrorReports() {
        this.errorReports.clear();
        safeLogger.log('[ERROR_MONITOR] All error reports cleared');
    }

    /**
     * Get error statistics
     */
    public getErrorStatistics() {
        const reports = this.getErrorReports();
        const stats = {
            total: reports.length,
            resolved: reports.filter(r => r.resolved).length,
            unresolved: reports.filter(r => !r.resolved).length,
            byType: {} as Record<ErrorType, number>,
            bySeverity: {} as Record<ErrorSeverity, number>,
            mostFrequent: reports.sort((a, b) => b.occurrenceCount - a.occurrenceCount).slice(0, 5)
        };

        // Count by type
        Object.values(ErrorType).forEach(type => {
            stats.byType[type] = reports.filter(r => r.type === type).length;
        });

        // Count by severity
        Object.values(ErrorSeverity).forEach(severity => {
            stats.bySeverity[severity] = reports.filter(r => r.severity === severity).length;
        });

        return stats;
    }

    /**
     * Export error reports for analysis
     */
    public exportErrorReports(): string {
        const data = {
            timestamp: new Date().toISOString(),
            reports: this.getErrorReports(),
            statistics: this.getErrorStatistics(),
            performanceMetrics: this.getPerformanceMetrics()
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * 전역 에러 핸들러 설정
     */
    private setupGlobalErrorHandlers() {
        if (!this.isEnabled) return;

        // 처리되지 않은 Promise 거부 처리
        if (typeof global !== 'undefined' && global.process) {
            global.process.on?.('unhandledRejection', (reason: any, _promise: Promise<any>) => {
                this.reportError({
                    type: ErrorType.ASYNC_ERROR,
                    severity: ErrorSeverity.HIGH,
                    message: `Unhandled Promise Rejection: ${reason}`,
                    stack: reason?.stack,
                    context: this.getCurrentContext()
                });
            });

            // 처리되지 않은 예외 처리
            global.process.on?.('uncaughtException', (error: Error) => {
                this.reportError({
                    type: ErrorType.ASYNC_ERROR,
                    severity: ErrorSeverity.CRITICAL,
                    message: `Uncaught Exception: ${error.message}`,
                    stack: error.stack,
                    context: this.getCurrentContext()
                });
            });
        }
    }

    /**
     * 성능 모니터링 시작
     */
    private startPerformanceMonitoring() {
        if (!this.isEnabled) return;

        // In Jest/test environment, skip starting intervals to avoid open handles
        try {
            const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
            const isJest = !!g.jest || (typeof process !== 'undefined' && (process as any)?.env?.JEST_WORKER_ID);
            if (isJest) return;
        } catch {
            // ignore env detection errors
        }

        // 메모리 사용량 모니터링 (React Native용 타입 단언 포함)
        setInterval(() => {
            const performance = global.performance as any;
            if (performance?.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize;
                this.recordPerformanceMetric('memoryUsage', memoryUsage);

                // 메모리 사용량이 너무 높으면 알림 (>50MB)
                if (memoryUsage > 50 * 1024 * 1024) {
                    this.reportError({
                        type: ErrorType.PERFORMANCE_ERROR,
                        severity: ErrorSeverity.MEDIUM,
                        message: `High memory usage detected: ${Math.round(memoryUsage / 1024 / 1024)}MB`,
                        context: this.getCurrentContext()
                    });
                }
            }
        }, 30000); // 30초마다 확인
    }

    /**
     * 현재 에러 컨텍스트 가져오기
     */
    private getCurrentContext(): ErrorContext {
        const performance = global.performance as any;
        return {
            timestamp: new Date().toISOString(),
            deviceInfo: {
                platform: 'react-native',
                version: '0.80.1'
            },
            appState: {
                isAuthenticated: false, // AuthContext에서 채워질 값
                memoryUsage: performance?.memory?.usedJSHeapSize
            }
        };
    }

    /**
     * 고유한 에러 ID 생성
     */
    private generateErrorId(type: ErrorType, message: string): string {
        const hash = message.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return `${type}_${Math.abs(hash)}`;
    }

    /**
     * Log error using safe logger
     */
    private logError(report: ErrorReport) {
        const logMessage = `[ERROR_MONITOR] ${report.type} - ${report.severity}: ${report.message}`;

        switch (report.severity) {
            case ErrorSeverity.CRITICAL:
                safeLogger.error(logMessage, report);
                break;
            case ErrorSeverity.HIGH:
                safeLogger.error(logMessage, report);
                break;
            case ErrorSeverity.MEDIUM:
                safeLogger.warn(logMessage, report);
                break;
            case ErrorSeverity.LOW:
                safeLogger.log(logMessage, report);
                break;
        }
    }
}

// Global error monitoring instance
export const errorMonitor = new ErrorMonitoringSystem();

// Convenience functions for common error types
export const reportRenderError = (message: string, stack?: string, context?: Partial<ErrorContext>) => {
    errorMonitor.reportError({
        type: ErrorType.RENDER_ERROR,
        severity: ErrorSeverity.HIGH,
        message,
        stack,
        context
    });
};

export const reportAsyncError = (message: string, stack?: string, context?: Partial<ErrorContext>) => {
    errorMonitor.reportError({
        type: ErrorType.ASYNC_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message,
        stack,
        context
    });
};

export const reportNetworkError = (message: string, context?: Partial<ErrorContext>) => {
    errorMonitor.reportError({
        type: ErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message,
        context
    });
};

export const reportNavigationError = (message: string, context?: Partial<ErrorContext>) => {
    errorMonitor.reportError({
        type: ErrorType.NAVIGATION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message,
        context
    });
};

export const reportLifecycleError = (message: string, stack?: string, context?: Partial<ErrorContext>) => {
    errorMonitor.reportError({
        type: ErrorType.LIFECYCLE_ERROR,
        severity: ErrorSeverity.HIGH,
        message,
        stack,
        context
    });
};

export default errorMonitor;
