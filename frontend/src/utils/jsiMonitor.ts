/**
 * Runtime JSI Assertion Monitoring System
 * Monitors and reports JSI violations in React Native Reanimated 3 worklets
 * Prevents JSI assertion failures by detecting unsafe patterns at runtime
 */

import {runOnJS} from 'react-native-reanimated';

interface JSIViolation {
    type: 'DIMENSIONS_GET' | 'DATE_NOW' | 'MATH_RANDOM' | 'CONSOLE_METHODS' | 'UNKNOWN';
    severity: 'CRITICAL' | 'WARNING';
    message: string;
    stackTrace?: string;
    timestamp: number;
    component?: string;
    workletType?: string;
}

interface JSIMonitorConfig {
    enabled: boolean;
    logToConsole: boolean;
    reportToAnalytics: boolean;
    maxViolations: number;
    enableStackTrace: boolean;
}

class JSIMonitor {
    private violations: JSIViolation[] = [];
    private config: JSIMonitorConfig = {
        enabled: __DEV__, // Only enable in development
        logToConsole: true,
        reportToAnalytics: false,
        maxViolations: 100,
        enableStackTrace: true
    };

    private violationCount = 0;
    private isInitialized = false;

    /**
     * Initialize the JSI monitor
     */
    initialize(config?: Partial<JSIMonitorConfig>) {
        if (this.isInitialized) return;

        this.config = {...this.config, ...config};

        if (this.config.enabled) {
            this.setupGlobalErrorHandling();
            this.patchDangerousAPIs();
            console.log('🔍 JSI Monitor initialized - watching for violations...');
        }

        this.isInitialized = true;
    }

    /**
     * Get violation statistics
     */
    getStatistics() {
        const criticalCount = this.violations.filter(v => v.severity === 'CRITICAL').length;
        const warningCount = this.violations.filter(v => v.severity === 'WARNING').length;

        return {
            totalViolations: this.violationCount,
            storedViolations: this.violations.length,
            criticalViolations: criticalCount,
            warningViolations: warningCount,
            isHealthy: criticalCount === 0,
            lastViolation: this.violations[this.violations.length - 1]
        };
    }

    /**
     * Get all violations
     */
    getViolations(): JSIViolation[] {
        return [...this.violations];
    }

    /**
     * Clear all violations
     */
    clearViolations() {
        this.violations = [];
        this.violationCount = 0;
    }

    /**
     * Generate health report
     */
    generateHealthReport(): string {
        const stats = this.getStatistics();
        const report = [
            '🏥 JSI HEALTH REPORT',
            '='.repeat(30),
            `📊 Total Violations: ${stats.totalViolations}`,
            `🚨 Critical: ${stats.criticalViolations}`,
            `⚠️  Warnings: ${stats.warningViolations}`,
            `💚 Health Status: ${stats.isHealthy ? 'HEALTHY' : 'NEEDS ATTENTION'}`,
            ''
        ];

        if (stats.lastViolation) {
            report.push(
                '🕐 Last Violation:',
                `   Type: ${stats.lastViolation.type}`,
                `   Time: ${new Date(stats.lastViolation.timestamp).toISOString()}`,
                `   Message: ${stats.lastViolation.message}`
            );
        }

        return report.join('\n');
    }

    /**
     * Track worklet execution (to be called from worklets via runOnJS)
     */
    trackWorkletExecution = (workletName: string, component?: string) => {
        // This should be called via runOnJS from worklets for tracking
        if (__DEV__) {
            console.log(`⚡ Worklet executed: ${workletName} in ${component || 'unknown component'}`);
        }
    };

    /**
     * Safe wrapper for worklet debugging
     */
    safeWorkletLog = (message: string, data?: any) => {
        'worklet';
        // This can be called from worklets safely
        runOnJS(() => {
            console.log(`[WORKLET] ${message}`, data);
        })();
    };

    /**
     * Setup global error handling to catch JSI assertion failures
     */
    private setupGlobalErrorHandling() {
        // Catch unhandled promise rejections that might be JSI-related
        if (typeof global !== 'undefined' && (global as any).ErrorUtils) {
            const errorUtils = (global as any).ErrorUtils;
            const originalHandler = errorUtils.getGlobalHandler();

            errorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
                this.checkForJSIError(error);
                if (originalHandler) {
                    originalHandler(error, isFatal);
                }
            });
        }

        // Monitor console errors for JSI-related messages
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
            const message = args.join(' ');
            if (this.isJSIRelatedError(message)) {
                this.reportViolation({
                    type: 'UNKNOWN',
                    severity: 'CRITICAL',
                    message: `JSI-related error detected: ${message}`,
                    timestamp: Date.now()
                });
            }
            originalConsoleError.apply(console, args);
        };
    }

    /**
     * Patch dangerous APIs to detect when they're called inappropriately
     */
    private patchDangerousAPIs() {
        // Note: This is for monitoring only - actual prevention should be done via ESLint
        if (typeof global !== 'undefined') {
            // Monitor Dimensions.get calls
            const globalDimensions = (global as any).Dimensions;
            if (globalDimensions && globalDimensions.get) {
                const originalDimensionsGet = globalDimensions.get;
                globalDimensions.get = (...args: any[]) => {
                    // Check if we're potentially in a worklet context
                    if (this.isPotentiallyInWorklet()) {
                        this.reportViolation({
                            type: 'DIMENSIONS_GET',
                            severity: 'CRITICAL',
                            message: 'Dimensions.get() called in potential worklet context',
                            timestamp: Date.now(),
                            stackTrace: this.config.enableStackTrace ? this.getStackTrace() : undefined
                        });
                    }
                    return originalDimensionsGet.apply(globalDimensions, args);
                };
            }
        }
    }

    /**
     * Check if an error is JSI-related
     */
    private isJSIRelatedError(message: string): boolean {
        const jsiErrorPatterns = [
            'assertion "isHostFunction(runtime)" failed',
            'JSI assertion',
            'HostFunctionType',
            'getHostFunction',
            'worklet',
            'react-native-reanimated'
        ];

        return jsiErrorPatterns.some(pattern =>
            message.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    /**
     * Check if we're potentially in a worklet context
     */
    private isPotentiallyInWorklet(): boolean {
        // This is a heuristic - in a real worklet, we wouldn't be able to call this
        // But we can detect suspicious call patterns
        const stack = this.getStackTrace();
        return stack.includes('useAnimatedStyle') ||
            stack.includes('useAnimatedScrollHandler') ||
            stack.includes('worklet');
    }

    /**
     * Get current stack trace
     */
    private getStackTrace(): string {
        try {
            throw new Error();
        } catch (e) {
            return (e as Error).stack || 'Stack trace not available';
        }
    }

    /**
     * Check if an error is JSI-related
     */
    private checkForJSIError(error: Error) {
        const message = error.message || '';
        const stack = error.stack || '';

        if (this.isJSIRelatedError(message) || this.isJSIRelatedError(stack)) {
            this.reportViolation({
                type: 'UNKNOWN',
                severity: 'CRITICAL',
                message: `JSI assertion failure detected: ${message}`,
                stackTrace: stack,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Report a JSI violation
     */
    private reportViolation(violation: JSIViolation) {
        if (!this.config.enabled) return;

        this.violationCount++;

        // Prevent memory leaks by limiting stored violations
        if (this.violations.length >= this.config.maxViolations) {
            this.violations.shift(); // Remove oldest violation
        }

        this.violations.push(violation);

        if (this.config.logToConsole) {
            this.logViolation(violation);
        }

        if (this.config.reportToAnalytics) {
            this.sendToAnalytics(violation);
        }

        // Trigger immediate action for critical violations
        if (violation.severity === 'CRITICAL') {
            this.handleCriticalViolation(violation);
        }
    }

    /**
     * Log violation to console
     */
    private logViolation(violation: JSIViolation) {
        const emoji = violation.severity === 'CRITICAL' ? '🚨' : '⚠️';
        const timestamp = new Date(violation.timestamp).toISOString();

        console.group(`${emoji} JSI VIOLATION DETECTED [${violation.severity}]`);
        console.log(`🕐 Time: ${timestamp}`);
        console.log(`🔍 Type: ${violation.type}`);
        console.log(`📝 Message: ${violation.message}`);

        if (violation.component) {
            console.log(`📄 Component: ${violation.component}`);
        }

        if (violation.workletType) {
            console.log(`⚡ Worklet: ${violation.workletType}`);
        }

        if (violation.stackTrace && this.config.enableStackTrace) {
            console.log(`📚 Stack Trace:`);
            console.log(violation.stackTrace);
        }

        console.log(`💡 Suggestion: ${this.getViolationSuggestion(violation.type)}`);
        console.groupEnd();
    }

    /**
     * Get suggestion for violation type
     */
    private getViolationSuggestion(type: JSIViolation['type']): string {
        const suggestions = {
            DIMENSIONS_GET: 'Cache Dimensions.get() with useMemo outside the worklet',
            DATE_NOW: 'Use useSharedValue(Date.now()) or runOnJS wrapper',
            MATH_RANDOM: 'Use useSharedValue(Math.random()) or runOnJS wrapper',
            CONSOLE_METHODS: 'Use runOnJS(() => console.log(...))() for debugging',
            UNKNOWN: 'Review worklet code for JavaScript API calls'
        };
        return suggestions[type] || 'Wrap JavaScript API calls with runOnJS()';
    }

    /**
     * Handle critical violations
     */
    private handleCriticalViolation(violation: JSIViolation) {
        // In development, we can show an alert or take other actions
        if (__DEV__) {
            // Use runOnJS to safely call JavaScript functions
            runOnJS(() => {
                console.error('🚨 CRITICAL JSI VIOLATION - This may cause app crashes!');
                console.error('Fix this violation immediately to prevent JSI assertion failures.');
            })();
        }
    }

    /**
     * Send violation to analytics (placeholder)
     */
    private sendToAnalytics(violation: JSIViolation) {
        // Placeholder for analytics integration
        // In a real implementation, this would send to Crashlytics, Sentry, etc.
        if (__DEV__) {
            console.log('📊 Would send to analytics:', {
                event: 'jsi_violation',
                type: violation.type,
                severity: violation.severity,
                timestamp: violation.timestamp
            });
        }
    }
}

// Create singleton instance
export const jsiMonitor = new JSIMonitor();

// Auto-initialize in development
if (__DEV__) {
    jsiMonitor.initialize();
}

export default jsiMonitor;
