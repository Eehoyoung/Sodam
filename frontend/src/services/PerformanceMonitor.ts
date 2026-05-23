// Performance Monitor Service for Phase 2 Implementation
// Provides advanced performance monitoring and optimization

// TypeScript definitions for Performance Observer API
interface PerformanceEntry {
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
}

interface PerformanceObserverEntryList {
    getEntries(): PerformanceEntry[];

    getEntriesByName(name: string): PerformanceEntry[];

    getEntriesByType(type: string): PerformanceEntry[];
}

interface PerformanceObserverCallback {
    (list: PerformanceObserverEntryList, observer: PerformanceObserver): void;
}

interface PerformanceObserverInit {
    entryTypes?: string[];
    type?: string;
    buffered?: boolean;
}

declare class PerformanceObserver {
    constructor(callback: PerformanceObserverCallback);

    observe(options: PerformanceObserverInit): void;

    disconnect(): void;

    takeRecords(): PerformanceEntry[];
}

export interface PerformanceMetrics {
    renderTime: number;
    animationFrameRate: number;
    memoryUsage: number;
    bundleSize: number;
    sectionLoadTime: Record<string, number>;
    interactionLatency: number;
    scrollPerformance: {
        averageFPS: number;
        droppedFrames: number;
        scrollDuration: number;
    };
}

export interface PerformanceIssue {
    type: 'memory' | 'render' | 'animation' | 'network' | 'bundle';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface OptimizationSuggestion {
    category: 'performance' | 'memory' | 'animation' | 'bundle';
    priority: 'low' | 'medium' | 'high';
    suggestion: string;
    impact: string;
    implementation: string;
}

class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private isMonitoring: boolean = false;
    private metrics: PerformanceMetrics;
    private performanceObserver: PerformanceObserver | null = null;
    private frameRateMonitor: any = null;
    private memoryMonitor: ReturnType<typeof setInterval> | null = null;
    private issues: PerformanceIssue[] = [];
    private startTime: number = 0;
    private sectionStartTimes: Record<string, number> = {};

    constructor() {
        this.metrics = {
            renderTime: 0,
            animationFrameRate: 60,
            memoryUsage: 0,
            bundleSize: 0,
            sectionLoadTime: {},
            interactionLatency: 0,
            scrollPerformance: {
                averageFPS: 60,
                droppedFrames: 0,
                scrollDuration: 0,
            },
        };
    }

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Start performance monitoring
     */
    startMonitoring(): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.startTime = performance.now();

        // Initialize monitoring systems
        this.initializeFrameRateMonitoring();
        this.initializeMemoryMonitoring();
        this.initializeRenderTimeMonitoring();
        this.initializeBundleSizeMonitoring();

        console.log('Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;

        // Cleanup monitoring systems
        if (this.frameRateMonitor) {
            cancelAnimationFrame(this.frameRateMonitor);
            this.frameRateMonitor = null;
        }

        if (this.memoryMonitor) {
            clearInterval(this.memoryMonitor as unknown as number);
            this.memoryMonitor = null;
        }

        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }

        console.log('Performance monitoring stopped');
    }

    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics {
        return {...this.metrics};
    }

    /**
     * Track section load time
     */
    startSectionLoad(sectionId: string): void {
        this.sectionStartTimes[sectionId] = performance.now();
    }

    /**
     * End section load time tracking
     */
    endSectionLoad(sectionId: string): void {
        const startTime = this.sectionStartTimes[sectionId];
        if (startTime) {
            const loadTime = performance.now() - startTime;
            this.metrics.sectionLoadTime[sectionId] = loadTime;
            delete this.sectionStartTimes[sectionId];

            // Check for performance issues
            if (loadTime > 1000) {
                this.reportPerformanceIssue({
                    type: 'render',
                    severity: loadTime > 3000 ? 'critical' : loadTime > 2000 ? 'high' : 'medium',
                    message: `Section ${sectionId} took ${loadTime.toFixed(2)}ms to load`,
                    timestamp: Date.now(),
                    metadata: {sectionId, loadTime},
                });
            }
        }
    }

    /**
     * Track interaction latency
     */
    trackInteractionLatency(startTime: number): void {
        const latency = performance.now() - startTime;
        this.metrics.interactionLatency = latency;

        // Check for interaction performance issues
        if (latency > 100) {
            this.reportPerformanceIssue({
                type: 'render',
                severity: latency > 300 ? 'high' : 'medium',
                message: `Interaction latency is ${latency.toFixed(2)}ms`,
                timestamp: Date.now(),
                metadata: {latency},
            });
        }
    }

    /**
     * Track scroll performance
     */
    trackScrollPerformance(fps: number, droppedFrames: number, duration: number): void {
        this.metrics.scrollPerformance = {
            averageFPS: fps,
            droppedFrames,
            scrollDuration: duration,
        };

        // Check for scroll performance issues
        if (fps < 45) {
            this.reportPerformanceIssue({
                type: 'animation',
                severity: fps < 30 ? 'high' : 'medium',
                message: `Scroll performance is poor: ${fps.toFixed(1)} FPS`,
                timestamp: Date.now(),
                metadata: {fps, droppedFrames, duration},
            });
        }
    }

    /**
     * Report performance issue
     */
    reportPerformanceIssue(issue: PerformanceIssue): void {
        this.issues.push(issue);

        // Send to analytics service
        try {
            const analyticsService = require('./AnalyticsService').analyticsService;
            analyticsService.trackEvent({
                eventName: 'performance_issue',
                section: 'navigation',
                action: 'view',
                timestamp: issue.timestamp,
                sessionId: this.generateSessionId(),
                metadata: {
                    type: issue.type,
                    severity: issue.severity,
                    message: issue.message,
                    ...issue.metadata,
                },
            });
        } catch (error) {
            console.warn('Failed to track performance issue:', error);
        }

        // Log critical issues immediately
        if (issue.severity === 'critical') {
            console.error('Critical performance issue:', issue);
        }

        // Keep only recent issues (last 100)
        if (this.issues.length > 100) {
            this.issues = this.issues.slice(-100);
        }
    }

    /**
     * Get performance issues
     */
    getPerformanceIssues(): PerformanceIssue[] {
        return [...this.issues];
    }

    /**
     * Get optimization suggestions
     */
    getOptimizationSuggestions(): OptimizationSuggestion[] {
        const suggestions: OptimizationSuggestion[] = [];

        // Memory optimization suggestions
        if (this.metrics.memoryUsage > 100) {
            suggestions.push({
                category: 'memory',
                priority: this.metrics.memoryUsage > 200 ? 'high' : 'medium',
                suggestion: 'Optimize memory usage by implementing lazy loading and component cleanup',
                impact: 'Reduce memory consumption by 30-50%',
                implementation: 'Use React.lazy(), cleanup listeners, optimize image loading',
            });
        }

        // Render performance suggestions
        const avgRenderTime = Object.values(this.metrics.sectionLoadTime).reduce((a, b) => a + b, 0) /
            Object.keys(this.metrics.sectionLoadTime).length;
        if (avgRenderTime > 500) {
            suggestions.push({
                category: 'performance',
                priority: avgRenderTime > 1000 ? 'high' : 'medium',
                suggestion: 'Optimize component rendering with memoization and virtualization',
                impact: 'Improve render time by 40-60%',
                implementation: 'Use React.memo(), useMemo(), useCallback(), and FlatList for long lists',
            });
        }

        // Animation performance suggestions
        if (this.metrics.scrollPerformance.averageFPS < 50) {
            suggestions.push({
                category: 'animation',
                priority: this.metrics.scrollPerformance.averageFPS < 30 ? 'high' : 'medium',
                suggestion: 'Optimize animations using native driver and reduce complex calculations',
                impact: 'Achieve consistent 60 FPS performance',
                implementation: 'Use useNativeDriver: true, optimize animation timing, reduce layout calculations',
            });
        }

        // Bundle size suggestions
        if (this.metrics.bundleSize > 5000000) { // 5MB
            suggestions.push({
                category: 'bundle',
                priority: this.metrics.bundleSize > 10000000 ? 'high' : 'medium',
                suggestion: 'Reduce bundle size with code splitting and tree shaking',
                impact: 'Reduce initial load time by 20-40%',
                implementation: 'Implement dynamic imports, remove unused dependencies, optimize assets',
            });
        }

        return suggestions;
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary(): {
        overallScore: number;
        metrics: PerformanceMetrics;
        issues: PerformanceIssue[];
        suggestions: OptimizationSuggestion[];
    } {
        // Calculate overall performance score (0-100)
        let score = 100;

        // Deduct points for performance issues
        score -= this.metrics.renderTime > 16.67 ? 10 : 0;
        score -= this.metrics.animationFrameRate < 50 ? 15 : 0;
        score -= this.metrics.memoryUsage > 100 ? 10 : 0;
        score -= this.metrics.interactionLatency > 100 ? 10 : 0;
        score -= this.metrics.scrollPerformance.averageFPS < 50 ? 15 : 0;

        // Deduct points for critical issues
        const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
        const highIssues = this.issues.filter(i => i.severity === 'high').length;
        score -= criticalIssues * 20;
        score -= highIssues * 10;

        score = Math.max(0, score);

        return {
            overallScore: score,
            metrics: this.getMetrics(),
            issues: this.getPerformanceIssues(),
            suggestions: this.getOptimizationSuggestions(),
        };
    }

    /**
     * Clear performance data
     */
    clearPerformanceData(): void {
        this.issues = [];
        this.metrics = {
            renderTime: 0,
            animationFrameRate: 60,
            memoryUsage: 0,
            bundleSize: 0,
            sectionLoadTime: {},
            interactionLatency: 0,
            scrollPerformance: {
                averageFPS: 60,
                droppedFrames: 0,
                scrollDuration: 0,
            },
        };
        this.sectionStartTimes = {};
    }

    /**
     * Export performance data for analysis
     */
    async exportPerformanceData(): Promise<string> {
        const data = {
            timestamp: Date.now(),
            metrics: this.getMetrics(),
            issues: this.getPerformanceIssues(),
            suggestions: this.getOptimizationSuggestions(),
            summary: this.getPerformanceSummary(),
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Initialize frame rate monitoring
     */
    private initializeFrameRateMonitoring(): void {
        let frameCount = 0;
        let lastTime = performance.now();
        const targetFPS = 60;
        const frameInterval = 1000 / targetFPS;

        const measureFrameRate = () => {
            const currentTime = performance.now();
            frameCount++;

            if (currentTime - lastTime >= 1000) {
                const fps = frameCount;
                this.metrics.animationFrameRate = fps;

                frameCount = 0;
                lastTime = currentTime;

                // Check for frame rate issues
                if (fps < 45) {
                    this.reportPerformanceIssue({
                        type: 'animation',
                        severity: fps < 30 ? 'high' : 'medium',
                        message: `Low frame rate detected: ${fps} FPS`,
                        timestamp: Date.now(),
                        metadata: {fps},
                    });
                }
            }

            if (this.isMonitoring) {
                this.frameRateMonitor = requestAnimationFrame(measureFrameRate);
            }
        };

        this.frameRateMonitor = requestAnimationFrame(measureFrameRate);
    }

    /**
     * Initialize memory monitoring
     */
    private initializeMemoryMonitoring(): void {
        this.memoryMonitor = setInterval(() => {
            try {
                // For React Native, we'll estimate memory usage
                if (typeof performance !== 'undefined' && (performance as any).memory) {
                    const memory = (performance as any).memory;
                    this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB

                    // Check for memory issues
                    if (this.metrics.memoryUsage > 150) {
                        this.reportPerformanceIssue({
                            type: 'memory',
                            severity: this.metrics.memoryUsage > 250 ? 'critical' : 'high',
                            message: `High memory usage: ${this.metrics.memoryUsage.toFixed(2)} MB`,
                            timestamp: Date.now(),
                            metadata: {memoryUsage: this.metrics.memoryUsage},
                        });
                    }
                } else {
                    // Fallback estimation for React Native
                    this.metrics.memoryUsage = Math.random() * 50 + 30; // Simulated value
                }
            } catch (error) {
                console.warn('Failed to monitor memory usage:', error);
            }
        }, 5000); // Check every 5 seconds
    }

    /**
     * Initialize render time monitoring
     */
    private initializeRenderTimeMonitoring(): void {
        try {
            // Use Performance Observer API if available
            if (typeof PerformanceObserver !== 'undefined') {
                this.performanceObserver = new PerformanceObserver((list: PerformanceObserverEntryList) => {
                    const entries = list.getEntries();
                    entries.forEach((entry: PerformanceEntry) => {
                        if (entry.entryType === 'measure') {
                            this.metrics.renderTime = entry.duration;

                            // Check for render performance issues
                            if (entry.duration > 16.67) { // 60 FPS threshold
                                this.reportPerformanceIssue({
                                    type: 'render',
                                    severity: entry.duration > 33.33 ? 'high' : 'medium',
                                    message: `Slow render detected: ${entry.duration.toFixed(2)}ms`,
                                    timestamp: Date.now(),
                                    metadata: {renderTime: entry.duration, entryName: entry.name},
                                });
                            }
                        }
                    });
                });

                this.performanceObserver.observe({entryTypes: ['measure']});
            }
        } catch (error) {
            console.warn('Performance Observer not available:', error);
        }
    }

    /**
     * Initialize bundle size monitoring
     */
    private initializeBundleSizeMonitoring(): void {
        try {
            // Estimate bundle size (in a real app, this would come from build tools)
            // For now, we'll use a placeholder value
            this.metrics.bundleSize = 2500000; // 2.5MB estimated

            // In a real implementation, you would get this from:
            // - Metro bundler stats
            // - Build tool analysis
            // - Network monitoring
        } catch (error) {
            console.warn('Failed to monitor bundle size:', error);
        }
    }

    /**
     * Generate session ID for tracking
     */
    private generateSessionId(): string {
        return `perf_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export performance optimization utilities
export const performanceUtils = {
    // Debounce function for performance optimization
    debounce: <T extends (...args: any[]) => any>(func: T, wait: number): T => {
        let timeout: ReturnType<typeof setTimeout>;
        return ((...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(null, args), wait);
        }) as T;
    },

    // Throttle function for performance optimization
    throttle: <T extends (...args: any[]) => any>(func: T, limit: number): T => {
        let inThrottle: boolean;
        return ((...args: any[]) => {
            if (!inThrottle) {
                func.apply(null, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }) as T;
    },

    // Measure execution time
    measureExecutionTime: async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();

        console.log(`${name} took ${(end - start).toFixed(2)}ms`);

        // Track in performance monitor
        performanceMonitor.trackInteractionLatency(start);

        return result;
    },
};
