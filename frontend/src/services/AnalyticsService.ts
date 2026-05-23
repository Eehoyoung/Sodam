// Analytics Service for Phase 2 Implementation
// Provides comprehensive user interaction tracking and analytics

import {AppState} from 'react-native';
import {safeLogger} from '../utils/safeLogger';
import {unifiedStorage} from '../common/utils/unifiedStorage';

export interface AnalyticsEvent {
    eventName: string;
    section: 'storytelling' | 'dashboard' | 'conversion' | 'ab_testing' | 'demo' | 'navigation';
    action: 'view' | 'interact' | 'demo_start' | 'demo_complete' | 'cta_click' | 'scroll' | 'tap' | 'swipe' | 'hover' | 'focus' | 'conversion';
    timestamp: number;
    sessionId: string;
    userId?: string;
    metadata?: Record<string, any>;
}

export interface UserInteraction {
    type: 'scroll' | 'tap' | 'swipe' | 'hover' | 'focus';
    target: string;
    timestamp: number;
    coordinates?: { x: number; y: number };
    duration?: number;
    sectionId?: string;
}

export interface ConversionFunnelStep {
    step: string;
    timestamp: number;
    userId?: string;
    sessionId: string;
    metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
    renderTime: number;
    animationFrameRate: number;
    memoryUsage: number;
    bundleSize: number;
    sectionLoadTime: Record<string, number>;
}

class AnalyticsService {
    private static instance: AnalyticsService;
    private sessionId: string;
    private eventQueue: AnalyticsEvent[] = [];
    private interactionQueue: UserInteraction[] = [];
    private isOnline: boolean = true;
    private flushInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.initializeService();
    }

    static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    /**
     * Track analytics event
     */
    async trackEvent(event: AnalyticsEvent): Promise<void> {
        try {
            // Add to queue
            this.eventQueue.push({
                ...event,
                sessionId: event.sessionId || this.sessionId,
                timestamp: event.timestamp || Date.now(),
            });

            // Store locally for persistence
            await this.storeEventLocally(event);

            // If queue is getting large, flush immediately
            if (this.eventQueue.length >= 50) {
                this.flushEvents();
            }
        } catch (error) {
            console.error('Failed to track event:', error);
        }
    }

    /**
     * Track section view with duration
     */
    async trackSectionView(section: string, duration: number, metadata?: Record<string, any>): Promise<void> {
        await this.trackEvent({
            eventName: 'section_view',
            section: section as any,
            action: 'view',
            timestamp: Date.now(),
            sessionId: this.sessionId,
            metadata: {
                duration,
                ...metadata,
            },
        });
    }

    /**
     * Track conversion funnel step
     */
    async trackConversionFunnel(step: string, metadata?: Record<string, any>): Promise<void> {
        const funnelStep: ConversionFunnelStep = {
            step,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            metadata,
        };

        await this.trackEvent({
            eventName: 'conversion_funnel',
            section: 'conversion',
            action: 'conversion',
            timestamp: funnelStep.timestamp,
            sessionId: this.sessionId,
            metadata: {
                funnelStep: step,
                ...metadata,
            },
        });

        // Store funnel step locally
        try {
            const existingSteps = await unifiedStorage.getItem('conversion_funnel_steps');
            const steps = existingSteps ? JSON.parse(existingSteps) : [];
            steps.push(funnelStep);
            await unifiedStorage.setItem('conversion_funnel_steps', JSON.stringify(steps));
        } catch (error) {
            console.warn('Failed to store funnel step locally:', error);
        }
    }

    /**
     * Track user interaction
     */
    async trackInteraction(interaction: UserInteraction): Promise<void> {
        try {
            this.interactionQueue.push({
                ...interaction,
                timestamp: interaction.timestamp || Date.now(),
            });

            // Convert interaction to analytics event
            await this.trackEvent({
                eventName: `user_${interaction.type}`,
                section: 'navigation',
                action: interaction.type as any,
                timestamp: interaction.timestamp,
                sessionId: this.sessionId,
                metadata: {
                    target: interaction.target,
                    coordinates: interaction.coordinates,
                    duration: interaction.duration,
                    sectionId: interaction.sectionId,
                },
            });

            // Flush interactions if queue is large
            if (this.interactionQueue.length >= 100) {
                await this.flushInteractions();
            }
        } catch (error) {
            console.error('Failed to track interaction:', error);
        }
    }

    /**
     * Track demo interaction
     */
    async trackDemoInteraction(demoType: 'nfc' | 'salary' | 'store', action: 'start' | 'complete' | 'skip', metadata?: Record<string, any>): Promise<void> {
        await this.trackEvent({
            eventName: `demo_${action}`,
            section: 'demo',
            action: action === 'start' ? 'demo_start' : action === 'complete' ? 'demo_complete' : 'interact',
            timestamp: Date.now(),
            sessionId: this.sessionId,
            metadata: {
                demoType,
                ...metadata,
            },
        });
    }

    /**
     * Track performance metrics
     */
    async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
        await this.trackEvent({
            eventName: 'performance_metrics',
            section: 'navigation',
            action: 'view',
            timestamp: Date.now(),
            sessionId: this.sessionId,
            metadata: {
                renderTime: metrics.renderTime,
                animationFrameRate: metrics.animationFrameRate,
                memoryUsage: metrics.memoryUsage,
                bundleSize: metrics.bundleSize,
                sectionLoadTime: metrics.sectionLoadTime,
            },
        });
    }

    /**
     * Get analytics summary
     */
    async getAnalyticsSummary(): Promise<{
        totalEvents: number;
        totalInteractions: number;
        sessionDuration: number;
        topEvents: Array<{ eventName: string; count: number }>;
        conversionFunnel: ConversionFunnelStep[];
    }> {
        try {
            // Get stored events
            const eventsJson = await unifiedStorage.getItem('analytics_events');
            const events: AnalyticsEvent[] = eventsJson ? JSON.parse(eventsJson) : [];

            // Get stored interactions
            const interactionsJson = await unifiedStorage.getItem('user_interactions');
            const interactions: UserInteraction[] = interactionsJson ? JSON.parse(interactionsJson) : [];

            // Get conversion funnel
            const funnelJson = await unifiedStorage.getItem('conversion_funnel_steps');
            const funnelSteps: ConversionFunnelStep[] = funnelJson ? JSON.parse(funnelJson) : [];

            // Calculate session duration
            const sessionEvents = events.filter(e => e.sessionId === this.sessionId);
            const sessionStart = Math.min(...sessionEvents.map(e => e.timestamp));
            const sessionEnd = Math.max(...sessionEvents.map(e => e.timestamp));
            const sessionDuration = sessionEnd - sessionStart;

            // Calculate top events
            const eventCounts: Record<string, number> = {};
            events.forEach(event => {
                eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
            });

            const topEvents = Object.entries(eventCounts)
                .map(([eventName, count]) => ({eventName, count}))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return {
                totalEvents: events.length,
                totalInteractions: interactions.length,
                sessionDuration,
                topEvents,
                conversionFunnel: funnelSteps,
            };
        } catch (error) {
            console.error('Failed to get analytics summary:', error);
            return {
                totalEvents: 0,
                totalInteractions: 0,
                sessionDuration: 0,
                topEvents: [],
                conversionFunnel: [],
            };
        }
    }

    /**
     * Set user ID for tracking
     */
    setUserId(userId: string): void {
        this.trackEvent({
            eventName: 'user_identified',
            section: 'navigation',
            action: 'view',
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId,
        });
    }

    /**
     * Clear analytics data (for privacy compliance)
     */
    async clearAnalyticsData(): Promise<void> {
        try {
            const keys = await unifiedStorage.getAllKeys();
            const analyticsKeys = keys.filter((key: string) =>
                key.startsWith('analytics_') ||
                key.startsWith('event_') ||
                key.startsWith('user_interactions') ||
                key.startsWith('conversion_funnel_')
            );

            await unifiedStorage.multiRemove(analyticsKeys);
            this.eventQueue = [];
            this.interactionQueue = [];

            console.log('Analytics data cleared');
        } catch (error) {
            safeLogger.asyncStorageError('Failed to clear analytics data:', error);
        }
    }

    /**
     * Cleanup service
     */
    cleanup(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval as unknown as number);
            this.flushInterval = null;
        }

        // Flush remaining events
        this.flushEvents();
        this.flushInteractions();
    }

    /**
     * Initialize analytics service
     */
    private initializeService(): void {
        // Start a periodic flush of events
        this.flushInterval = setInterval(() => {
            this.flushEvents();
        }, 30000); // Flush every 30 seconds

        // Listen for app state changes
        try {
            AppState.addEventListener('change', (nextAppState: string) => {
                if (nextAppState === 'background' || nextAppState === 'inactive') {
                    this.flushEvents();
                }
            });
        } catch (error) {
            console.warn('Failed to set up app state listener:', error);
        }

        // Track session start
        this.trackEvent({
            eventName: 'session_start',
            section: 'navigation',
            action: 'view',
            timestamp: Date.now(),
            sessionId: this.sessionId,
        });
    }

    /**
     * Flush events to remote analytics service
     */
    private async flushEvents(): Promise<void> {
        if (this.eventQueue.length === 0) return;

        try {
            // In a real implementation, this would send to your analytics backend
            // For now, we'll store locally and log
            console.log(`Flushing ${this.eventQueue.length} analytics events`);

            // Store events locally
            const existingEvents = await unifiedStorage.getItem('analytics_events');
            const events = existingEvents ? JSON.parse(existingEvents) : [];
            events.push(...this.eventQueue);
            await unifiedStorage.setItem('analytics_events', JSON.stringify(events));

            // Clear queue
            this.eventQueue = [];
        } catch (error) {
            console.error('Failed to flush events:', error);
        }
    }

    /**
     * Flush interactions to storage
     */
    private async flushInteractions(): Promise<void> {
        if (this.interactionQueue.length === 0) return;

        try {
            const existingInteractions = await unifiedStorage.getItem('user_interactions');
            const interactions = existingInteractions ? JSON.parse(existingInteractions) : [];
            interactions.push(...this.interactionQueue);
            await unifiedStorage.setItem('user_interactions', JSON.stringify(interactions));

            // Clear queue
            this.interactionQueue = [];
        } catch (error) {
            safeLogger.asyncStorageError('Failed to flush interactions:', error);
        }
    }

    /**
     * Store event locally for persistence
     */
    private async storeEventLocally(event: AnalyticsEvent): Promise<void> {
        try {
            const key = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await unifiedStorage.setItem(key, JSON.stringify(event));
        } catch (error) {
            console.warn('Failed to store event locally:', error);
        }
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();

// Export tracking events constants
export const trackingEvents = {
    // Section view times
    sectionViewTime: {
        storytelling: 'section_storytelling_view_time',
        dashboard: 'section_dashboard_view_time',
        conversion: 'section_conversion_view_time'
    },

    // Interaction events
    interactions: {
        problemCardTap: 'problem_card_tap',
        featureCardTap: 'feature_card_tap',
        featureDemo: 'feature_demo_start',
        ctaButtonTap: 'cta_button_tap',
        testimonialTap: 'testimonial_tap'
    },

    // Conversion events
    conversions: {
        appDownload: 'app_download_initiated',
        webTrial: 'web_trial_started',
        signupStarted: 'signup_process_started',
        signupCompleted: 'signup_completed'
    },

    // Exit points
    exitPoints: {
        storytellingExit: 'exit_at_storytelling',
        dashboardExit: 'exit_at_dashboard',
        conversionExit: 'exit_at_conversion'
    }
};
