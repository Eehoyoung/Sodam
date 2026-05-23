/**
 * JSI Performance Monitor Service
 * Tracks JSI-related performance metrics and crash analytics
 * Provides real-time monitoring and reporting capabilities
 */

import {Platform} from 'react-native';

export interface JSIMetrics {
    frameRate: number;
    memoryUsage: number;
    animationCount: number;
    crashCount: number;
    timestamp: number;
    platform: string;
}

export interface JSICrashReport {
    id: string;
    timestamp: number;
    error: string;
    stackTrace: string;
    component: string;
    platform: string;
    deviceInfo: {
        model: string;
        osVersion: string;
        appVersion: string;
    };
}

export interface JSIHealthStatus {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
}

class JSIPerformanceMonitorService {
    private metrics: JSIMetrics[] = [];
    private crashReports: JSICrashReport[] = [];
    private isMonitoring: boolean = false;
    private monitoringInterval: ReturnType<typeof setInterval> | null = null;
    private frameRateMonitor: number = 0;
    private animationRegistry: Set<string> = new Set();
    private currentFrameRate: number = 60;

    /**
     * Start JSI performance monitoring
     */
    startMonitoring(): void {
        if (this.isMonitoring) {
            console.warn('[JSI Monitor] Already monitoring');
            return;
        }

        this.isMonitoring = true;
        console.log('[JSI Monitor] Starting performance monitoring');

        // Monitor metrics every 5 seconds
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, 5000);

        // Setup frame rate monitoring
        this.setupFrameRateMonitoring();
    }

    /**
     * Stop JSI performance monitoring
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        console.log('[JSI Monitor] Stopping performance monitoring');

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval as unknown as number);
            this.monitoringInterval = null;
        }

        if (this.frameRateMonitor) {
            cancelAnimationFrame(this.frameRateMonitor);
            this.frameRateMonitor = 0;
        }
    }

    /**
     * Register an active animation
     */
    registerAnimation(animationId: string): void {
        this.animationRegistry.add(animationId);
        console.log(`[JSI Monitor] Animation registered: ${animationId}`);
    }

    /**
     * Unregister a completed animation
     */
    unregisterAnimation(animationId: string): void {
        this.animationRegistry.delete(animationId);
        console.log(`[JSI Monitor] Animation unregistered: ${animationId}`);
    }

    /**
     * Report a JSI-related crash
     */
    reportCrash(error: Error, component: string): void {
        const crashReport: JSICrashReport = {
            id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            error: error.message,
            stackTrace: error.stack || 'No stack trace available',
            component,
            platform: Platform.OS,
            deviceInfo: {
                model: (Platform.constants as any).model || (Platform.constants as any).Model || 'Unknown',
                osVersion: Platform.Version.toString(),
                appVersion: '1.0.0', // Should be retrieved from app config
            },
        };

        this.crashReports.push(crashReport);
        console.error('[JSI Monitor] Crash reported:', crashReport);

        // Keep only last 50 crash reports
        if (this.crashReports.length > 50) {
            this.crashReports = this.crashReports.slice(-50);
        }

        // Send to analytics service (placeholder)
        this.sendCrashToAnalytics(crashReport);
    }

    /**
     * Get current JSI health status
     */
    getHealthStatus(): JSIHealthStatus {
        const recentMetrics = this.getRecentMetrics(10);

        if (recentMetrics.length === 0) {
            return {
                status: 'warning',
                score: 50,
                issues: ['No metrics available'],
                recommendations: ['Start monitoring to collect metrics'],
            };
        }

        const avgFrameRate = recentMetrics.reduce((sum, m) => sum + m.frameRate, 0) / recentMetrics.length;
        const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;
        const recentCrashes = this.crashReports.filter(c => Date.now() - c.timestamp < 300000); // Last 5 minutes

        let score = 100;
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Frame rate analysis
        if (avgFrameRate < 30) {
            score -= 30;
            issues.push(`Low frame rate: ${avgFrameRate.toFixed(1)} FPS`);
            recommendations.push('Optimize animations and reduce concurrent operations');
        } else if (avgFrameRate < 50) {
            score -= 15;
            issues.push(`Moderate frame rate: ${avgFrameRate.toFixed(1)} FPS`);
            recommendations.push('Consider optimizing heavy animations');
        }

        // Memory usage analysis
        if (avgMemoryUsage > 80) {
            score -= 25;
            issues.push(`High memory usage: ${avgMemoryUsage.toFixed(1)}%`);
            recommendations.push('Check for memory leaks in animations');
        } else if (avgMemoryUsage > 60) {
            score -= 10;
            issues.push(`Moderate memory usage: ${avgMemoryUsage.toFixed(1)}%`);
            recommendations.push('Monitor memory usage trends');
        }

        // Crash analysis
        if (recentCrashes.length > 0) {
            score -= recentCrashes.length * 20;
            issues.push(`${recentCrashes.length} recent crashes`);
            recommendations.push('Review crash reports and fix JSI violations');
        }

        // Animation count analysis
        const activeAnimations = this.animationRegistry.size;
        if (activeAnimations > 10) {
            score -= 15;
            issues.push(`High animation count: ${activeAnimations}`);
            recommendations.push('Limit concurrent animations');
        }

        let status: 'healthy' | 'warning' | 'critical';
        if (score >= 80) {
            status = 'healthy';
        } else if (score >= 50) {
            status = 'warning';
        } else {
            status = 'critical';
        }

        return {
            status,
            score: Math.max(0, score),
            issues,
            recommendations,
        };
    }

    /**
     * Get performance metrics
     */
    getMetrics(): JSIMetrics[] {
        return [...this.metrics];
    }

    /**
     * Get recent metrics
     */
    getRecentMetrics(count: number = 20): JSIMetrics[] {
        return this.metrics.slice(-count);
    }

    /**
     * Get crash reports
     */
    getCrashReports(): JSICrashReport[] {
        return [...this.crashReports];
    }

    /**
     * Clear all metrics and reports
     */
    clearData(): void {
        this.metrics = [];
        this.crashReports = [];
        console.log('[JSI Monitor] Data cleared');
    }

    /**
     * Export metrics for external analysis
     */
    exportMetrics(): string {
        const data = {
            metrics: this.metrics,
            crashReports: this.crashReports,
            healthStatus: this.getHealthStatus(),
            exportTimestamp: Date.now(),
        };

        return JSON.stringify(data, null, 2);
    }

    private collectMetrics(): void {
        const metrics: JSIMetrics = {
            frameRate: this.getCurrentFrameRate(),
            memoryUsage: this.getMemoryUsage(),
            animationCount: this.animationRegistry.size,
            crashCount: this.crashReports.length,
            timestamp: Date.now(),
            platform: Platform.OS,
        };

        this.metrics.push(metrics);

        // Keep only last 1000 metrics (about 1.4 hours at 5-second intervals)
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000);
        }

        console.log('[JSI Monitor] Metrics collected:', metrics);
    }

    private setupFrameRateMonitoring(): void {
        let lastTime = performance.now();
        let frameCount = 0;
        let currentFPS = 60;

        const measureFPS = (currentTime: number) => {
            frameCount++;

            if (currentTime - lastTime >= 1000) {
                currentFPS = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
            }

            if (this.isMonitoring) {
                this.frameRateMonitor = requestAnimationFrame(measureFPS);
            }
        };

        this.frameRateMonitor = requestAnimationFrame(measureFPS);

        // Store current FPS for metrics collection
        setInterval(() => {
            this.currentFrameRate = currentFPS;
        }, 1000);
    }

    private getCurrentFrameRate(): number {
        return this.currentFrameRate;
    }

    private getMemoryUsage(): number {
        // Placeholder implementation - in real app, use native modules
        // to get actual memory usage
        if (Platform.OS === 'web' && (performance as any).memory) {
            const memory = (performance as any).memory;
            return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        }

        // Fallback estimation based on animation count and metrics
        const baseUsage = 20;
        const animationOverhead = this.animationRegistry.size * 2;
        const metricsOverhead = this.metrics.length * 0.01;

        return Math.min(100, baseUsage + animationOverhead + metricsOverhead);
    }

    private sendCrashToAnalytics(crashReport: JSICrashReport): void {
        // Placeholder for analytics integration
        // In production, this would send to services like Crashlytics, Sentry, etc.
        console.log('[JSI Monitor] Sending crash report to analytics:', crashReport.id);

        // Example integration points:
        // - Firebase Crashlytics
        // - Sentry
        // - Bugsnag
        // - Custom analytics endpoint
    }
}

// Singleton instance
export const JSIPerformanceMonitor = new JSIPerformanceMonitorService();

// Export types and service
export default JSIPerformanceMonitor;
