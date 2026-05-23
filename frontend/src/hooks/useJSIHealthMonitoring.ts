/**
 * JSI Health Monitoring Hook
 * Provides real-time JSI health monitoring and alerting
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import JSIPerformanceMonitor, {JSIHealthStatus} from '../services/JSIPerformanceMonitor';
import {useJSICrashReporting} from './useJSICrashReporting';

interface HealthMonitoringConfig {
    componentName: string;
    enableRealTimeMonitoring?: boolean;
    enableAlerts?: boolean;
    alertThreshold?: 'warning' | 'critical';
    monitoringInterval?: number; // in milliseconds
    onHealthChange?: (status: JSIHealthStatus) => void;
    onCriticalIssue?: (status: JSIHealthStatus) => void;
}

interface JSIHealthMonitoringHook {
    healthStatus: JSIHealthStatus | null;
    isMonitoring: boolean;
    startMonitoring: () => void;
    stopMonitoring: () => void;
    refreshHealth: () => void;
    registerAnimation: (animationId: string) => void;
    unregisterAnimation: (animationId: string) => void;
}

/**
 * Hook for real-time JSI health monitoring
 */
export const useJSIHealthMonitoring = (
    config: HealthMonitoringConfig
): JSIHealthMonitoringHook => {
    const {
        componentName,
        enableRealTimeMonitoring = true,
        enableAlerts = true,
        alertThreshold = 'critical',
        monitoringInterval = 10000, // 10 seconds
        onHealthChange,
        onCriticalIssue,
    } = config;

    const [healthStatus, setHealthStatus] = useState<JSIHealthStatus | null>(null);
    const [isMonitoring, setIsMonitoring] = useState(false);

    const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastAlertTimeRef = useRef(0);
    const previousHealthScoreRef = useRef<number | null>(null);

    // Setup crash reporting for this component
    const crashReporting = useJSICrashReporting({
        componentName: `${componentName}-HealthMonitor`,
        enableAutoReporting: true,
        enableConsoleLogging: true,
    });

    // Start monitoring when component mounts if enabled
    useEffect(() => {
        if (enableRealTimeMonitoring) {
            startMonitoring();
        }

        return () => {
            stopMonitoring();
        };
    }, [enableRealTimeMonitoring]);

    const refreshHealth = useCallback(() => {
        try {
            const currentHealth = JSIPerformanceMonitor.getHealthStatus();
            setHealthStatus(currentHealth);

            // Check for health changes
            if (previousHealthScoreRef.current !== null) {
                const scoreDifference = currentHealth.score - previousHealthScoreRef.current;

                // Log significant health changes
                if (Math.abs(scoreDifference) >= 10) {
                    console.log(`[JSI Health Monitor] ${componentName} health score changed by ${scoreDifference}: ${previousHealthScoreRef.current} → ${currentHealth.score}`);
                }
            }

            previousHealthScoreRef.current = currentHealth.score;

            // Call health change callback
            if (onHealthChange) {
                onHealthChange(currentHealth);
            }

            // Check for alerts
            if (enableAlerts && shouldTriggerAlert(currentHealth)) {
                triggerHealthAlert(currentHealth);
            }

            // Check for critical issues
            if (currentHealth.status === 'critical' && onCriticalIssue) {
                onCriticalIssue(currentHealth);
            }

            return currentHealth;
        } catch (error) {
            const healthError = error instanceof Error ? error : new Error(String(error));
            crashReporting.reportCrash(healthError, 'Health Status Refresh');

            // Return a default critical status
            const criticalStatus: JSIHealthStatus = {
                status: 'critical',
                score: 0,
                issues: ['Health monitoring system error'],
                recommendations: ['Restart the application'],
            };

            setHealthStatus(criticalStatus);
            return criticalStatus;
        }
    }, [componentName, enableAlerts, onHealthChange, onCriticalIssue, crashReporting]);

    const startMonitoring = useCallback(() => {
        if (isMonitoring) {
            console.warn(`[JSI Health Monitor] ${componentName} is already monitoring`);
            return;
        }

        console.log(`[JSI Health Monitor] Starting health monitoring for ${componentName}`);
        setIsMonitoring(true);

        // Start the JSI performance monitor if not already started
        JSIPerformanceMonitor.startMonitoring();

        // Initial health check
        refreshHealth();

        // Setup periodic health checks
        monitoringIntervalRef.current = setInterval(() => {
            refreshHealth();
        }, monitoringInterval);
    }, [isMonitoring, componentName, refreshHealth, monitoringInterval]);

    const stopMonitoring = useCallback(() => {
        if (!isMonitoring) {
            return;
        }

        console.log(`[JSI Health Monitor] Stopping health monitoring for ${componentName}`);
        setIsMonitoring(false);

        if (monitoringIntervalRef.current) {
            clearInterval(monitoringIntervalRef.current);
            monitoringIntervalRef.current = null;
        }
    }, [isMonitoring, componentName]);

    const registerAnimation = useCallback((animationId: string) => {
        const fullAnimationId = `${componentName}-${animationId}`;
        JSIPerformanceMonitor.registerAnimation(fullAnimationId);

        // Trigger immediate health check after registering animation
        setTimeout(() => {
            refreshHealth();
        }, 100);
    }, [componentName, refreshHealth]);

    const unregisterAnimation = useCallback((animationId: string) => {
        const fullAnimationId = `${componentName}-${animationId}`;
        JSIPerformanceMonitor.unregisterAnimation(fullAnimationId);

        // Trigger immediate health check after unregistering animation
        setTimeout(() => {
            refreshHealth();
        }, 100);
    }, [componentName, refreshHealth]);

    const shouldTriggerAlert = useCallback((health: JSIHealthStatus): boolean => {
        const now = Date.now();

        // Prevent alert spam (max 1 alert per minute)
        if (now - lastAlertTimeRef.current < 60000) {
            return false;
        }

        // Check alert threshold
        if (alertThreshold === 'warning' && (health.status === 'warning' || health.status === 'critical')) {
            return true;
        }

        if (alertThreshold === 'critical' && health.status === 'critical') {
            return true;
        }

        return false;
    }, [alertThreshold]);

    const triggerHealthAlert = useCallback((health: JSIHealthStatus) => {
        lastAlertTimeRef.current = Date.now();

        const alertTitle = `JSI Health Alert - ${componentName}`;
        const alertMessage = `Status: ${health.status.toUpperCase()}\nScore: ${health.score}/100\n\nIssues:\n${health.issues.join('\n')}\n\nRecommendations:\n${health.recommendations.join('\n')}`;

        console.warn(`[JSI Health Monitor] ${alertTitle}`, alertMessage);

        // Show native alert for critical issues
        if (health.status === 'critical') {
            Alert.alert(
                alertTitle,
                alertMessage,
                [
                    {
                        text: 'Dismiss',
                        style: 'cancel',
                    },
                    {
                        text: 'View Details',
                        onPress: () => {
                            console.log('[JSI Health Monitor] Full health status:', health);
                        },
                    },
                ]
            );
        }
    }, [componentName]);

    return {
        healthStatus,
        isMonitoring,
        startMonitoring,
        stopMonitoring,
        refreshHealth,
        registerAnimation,
        unregisterAnimation,
    };
};

/**
 * Higher-order component that adds JSI health monitoring
 */
export function withJSIHealthMonitoring<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    componentName: string,
    config?: Partial<HealthMonitoringConfig>
) {
    return function JSIHealthMonitoringWrapper(props: P) {
        const healthMonitoring = useJSIHealthMonitoring({
            componentName,
            enableRealTimeMonitoring: true,
            enableAlerts: true,
            alertThreshold: 'critical',
            ...config,
        });

        // Add health monitoring props to the wrapped component
        const enhancedProps = {
            ...props,
            jsiHealthStatus: healthMonitoring.healthStatus,
            jsiIsMonitoring: healthMonitoring.isMonitoring,
            jsiRegisterAnimation: healthMonitoring.registerAnimation,
            jsiUnregisterAnimation: healthMonitoring.unregisterAnimation,
        } as P & {
            jsiHealthStatus?: JSIHealthStatus | null;
            jsiIsMonitoring?: boolean;
            jsiRegisterAnimation?: (animationId: string) => void;
            jsiUnregisterAnimation?: (animationId: string) => void;
        };

        return React.createElement(WrappedComponent, enhancedProps);
    };
}

/**
 * Custom hook for components that need to report their animation lifecycle
 */
export const useJSIAnimationLifecycle = (
    componentName: string,
    animationId: string,
    isActive: boolean
) => {
    const healthMonitoring = useJSIHealthMonitoring({
        componentName,
        enableRealTimeMonitoring: false, // Don't start full monitoring, just use for registration
        enableAlerts: false,
    });

    useEffect(() => {
        if (isActive) {
            healthMonitoring.registerAnimation(animationId);
        } else {
            healthMonitoring.unregisterAnimation(animationId);
        }

        // Cleanup on unmount
        return () => {
            healthMonitoring.unregisterAnimation(animationId);
        };
    }, [isActive, animationId, healthMonitoring]);

    return healthMonitoring.healthStatus;
};

export default useJSIHealthMonitoring;
