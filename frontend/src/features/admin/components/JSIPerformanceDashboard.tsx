/**
 * JSI Performance Dashboard Component
 * Real-time visualization of JSI performance metrics and health monitoring
 */

import React, {useCallback, useEffect, useState} from 'react';
import {Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {useJSISafeDimensions} from '../../../hooks/useJSISafeDimensions';
import JSIPerformanceMonitor, {
    JSICrashReport,
    JSIHealthStatus,
    JSIMetrics,
} from '../../../services/JSIPerformanceMonitor';
import {FadeAnimation, ScaleAnimation} from '../../../common/components/animations';
import {logger} from '../../../utils/logger';

interface DashboardProps {
    isVisible: boolean;
    onClose: () => void;
}

export const JSIPerformanceDashboard: React.FC<DashboardProps> = ({
                                                                      isVisible,
                                                                      onClose,
                                                                  }) => {
    logger.debug('[DEBUG_LOG] JSIPerformanceDashboard: Component initialization started');
    logger.debug('[DEBUG_LOG] JSIPerformanceDashboard: Props received:', {isVisible});

    // Use JSI-safe dimensions hook
    logger.debug('[DEBUG_LOG] JSIPerformanceDashboard: About to call useJSISafeDimensions hook');
    let dimensions;
    try {
        const hookResult = useJSISafeDimensions();
        dimensions = hookResult.dimensions;
        logger.debug('[DEBUG_LOG] JSIPerformanceDashboard: useJSISafeDimensions hook called successfully');
        logger.debug('[DEBUG_LOG] JSIPerformanceDashboard: Received dimensions:', dimensions);
        logger.debug('[DEBUG_LOG] JSIPerformanceDashboard: Full hook result:', hookResult);
    } catch (error) {
        logger.error('[DEBUG_LOG] JSIPerformanceDashboard: ERROR calling useJSISafeDimensions:', error);
        if (error instanceof Error) {
            logger.error('[DEBUG_LOG] JSIPerformanceDashboard: Error stack:', error.stack);
        }
        throw error;
    }

    const [metrics, setMetrics] = useState<JSIMetrics[]>([]);
    const [crashReports, setCrashReports] = useState<JSICrashReport[]>([]);
    const [healthStatus, setHealthStatus] = useState<JSIHealthStatus | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'overview' | 'metrics' | 'crashes'>('overview');

    // Auto-refresh data every 5 seconds
    useEffect(() => {
        if (!isVisible) {return;}

        const refreshData = () => {
            setMetrics(JSIPerformanceMonitor.getRecentMetrics(20));
            setCrashReports(JSIPerformanceMonitor.getCrashReports());
            setHealthStatus(JSIPerformanceMonitor.getHealthStatus());
        };

        refreshData();
        const interval = setInterval(refreshData, 5000);

        return () => clearInterval(interval);
    }, [isVisible]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);

        // Simulate refresh delay
        await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));

        setMetrics(JSIPerformanceMonitor.getRecentMetrics(20));
        setCrashReports(JSIPerformanceMonitor.getCrashReports());
        setHealthStatus(JSIPerformanceMonitor.getHealthStatus());

        setIsRefreshing(false);
    }, []);

    const handleStartMonitoring = () => {
        JSIPerformanceMonitor.startMonitoring();
        Alert.alert('JSI Monitoring', 'Performance monitoring started');
    };

    const handleStopMonitoring = () => {
        JSIPerformanceMonitor.stopMonitoring();
        Alert.alert('JSI Monitoring', 'Performance monitoring stopped');
    };

    const handleClearData = () => {
        Alert.alert(
            'Clear Data',
            'Are you sure you want to clear all metrics and crash reports?',
            [
                {text: 'Cancel', style: 'cancel'},
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        JSIPerformanceMonitor.clearData();
                        setMetrics([]);
                        setCrashReports([]);
                        setHealthStatus(null);
                    },
                },
            ]
        );
    };

    const handleExportData = () => {
        const exportData = JSIPerformanceMonitor.exportMetrics();
        logger.debug('Exported JSI Performance Data:', exportData);
        Alert.alert('Export Complete', 'Data exported to console');
    };

    const getHealthStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return DASH.good;
            case 'warning':
                return DASH.warn;
            case 'critical':
                return DASH.bad;
            default:
                return DASH.muted;
        }
    };

    const renderHealthOverview = () => {
        if (!healthStatus) {
            return (
                <View style={styles.healthCard}>
                    <Text style={styles.healthTitle}>JSI Health Status</Text>
                    <Text style={styles.noDataText}>No health data available</Text>
                </View>
            );
        }

        return (
            <ScaleAnimation isVisible={true} style={styles.healthCard}>
                <Text style={styles.healthTitle}>JSI Health Status</Text>
                <View style={styles.healthStatusContainer}>
                    <View
                        style={[
                            styles.healthIndicator,
                            {backgroundColor: getHealthStatusColor(healthStatus.status)},
                        ]}
                    />
                    <Text style={[styles.healthStatus, {color: getHealthStatusColor(healthStatus.status)}]}>
                        {healthStatus.status.toUpperCase()}
                    </Text>
                    <Text style={styles.healthScore}>Score: {healthStatus.score}/100</Text>
                </View>

                {healthStatus.issues.length > 0 && (
                    <View style={styles.issuesContainer}>
                        <Text style={styles.issuesTitle}>Issues:</Text>
                        {healthStatus.issues.map((issue, index) => (
                            <Text key={index} style={styles.issueText}>
                                • {issue}
                            </Text>
                        ))}
                    </View>
                )}

                {healthStatus.recommendations.length > 0 && (
                    <View style={styles.recommendationsContainer}>
                        <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                        {healthStatus.recommendations.map((rec, index) => (
                            <Text key={index} style={styles.recommendationText}>
                                • {rec}
                            </Text>
                        ))}
                    </View>
                )}
            </ScaleAnimation>
        );
    };

    const renderMetricsChart = () => {
        if (metrics.length === 0) {
            return (
                <View style={styles.chartContainer}>
                    <Text style={styles.noDataText}>No metrics data available</Text>
                </View>
            );
        }

        const chartData = {
            labels: metrics.slice(-10).map((_, index) => `${index + 1}`),
            datasets: [
                {
                    data: metrics.slice(-10).map(m => m.frameRate),
                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                    strokeWidth: 2,
                },
            ],
        };

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Frame Rate (FPS)</Text>
                <LineChart
                    data={chartData}
                    width={dimensions.screenWidth - 40}
                    height={200}
                    chartConfig={{
                        backgroundColor: DASH.white,
                        backgroundGradientFrom: DASH.white,
                        backgroundGradientTo: DASH.white,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                            borderRadius: 16,
                        },
                    }}
                    style={styles.chart}
                />
            </View>
        );
    };

    const renderMemoryChart = () => {
        if (metrics.length === 0) {
            return null;
        }

        const chartData = {
            labels: metrics.slice(-10).map((_, index) => `${index + 1}`),
            datasets: [
                {
                    data: metrics.slice(-10).map(m => m.memoryUsage),
                    color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                    strokeWidth: 2,
                },
            ],
        };

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Memory Usage (%)</Text>
                <LineChart
                    data={chartData}
                    width={dimensions.screenWidth - 40}
                    height={200}
                    chartConfig={{
                        backgroundColor: DASH.white,
                        backgroundGradientFrom: DASH.white,
                        backgroundGradientTo: DASH.white,
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: {
                            borderRadius: 16,
                        },
                    }}
                    style={styles.chart}
                />
            </View>
        );
    };

    const renderCrashReports = () => {
        if (crashReports.length === 0) {
            return (
                <View style={styles.crashContainer}>
                    <Text style={styles.noDataText}>No crash reports</Text>
                </View>
            );
        }

        return (
            <View style={styles.crashContainer}>
                <Text style={styles.crashTitle}>Recent Crashes ({crashReports.length})</Text>
                {crashReports.slice(-5).map((crash, _index) => (
                    <View key={crash.id} style={styles.crashItem}>
                        <Text style={styles.crashTimestamp}>
                            {new Date(crash.timestamp).toLocaleString()}
                        </Text>
                        <Text style={styles.crashComponent}>Component: {crash.component}</Text>
                        <Text style={styles.crashError} numberOfLines={2}>
                            {crash.error}
                        </Text>
                        <Text style={styles.crashPlatform}>Platform: {crash.platform}</Text>
                    </View>
                ))}
            </View>
        );
    };

    const renderTabContent = () => {
        switch (selectedTab) {
            case 'overview':
                return (
                    <View>
                        {renderHealthOverview()}
                        <View style={styles.quickStats}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{metrics.length}</Text>
                                <Text style={styles.statLabel}>Metrics</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{crashReports.length}</Text>
                                <Text style={styles.statLabel}>Crashes</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>
                                    {metrics.length > 0 ? metrics[metrics.length - 1].animationCount : 0}
                                </Text>
                                <Text style={styles.statLabel}>Active Animations</Text>
                            </View>
                        </View>
                    </View>
                );
            case 'metrics':
                return (
                    <View>
                        {renderMetricsChart()}
                        {renderMemoryChart()}
                    </View>
                );
            case 'crashes':
                return renderCrashReports();
            default:
                return null;
        }
    };

    if (!isVisible) {return null;}

    return (
        <FadeAnimation isVisible={isVisible} style={styles.overlay}>
            <View style={styles.dashboard}>
                <View style={styles.header}>
                    <Text style={styles.title}>JSI Performance Dashboard</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity style={styles.controlButton} onPress={handleStartMonitoring}>
                        <Text style={styles.controlButtonText}>Start</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlButton} onPress={handleStopMonitoring}>
                        <Text style={styles.controlButtonText}>Stop</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlButton} onPress={handleClearData}>
                        <Text style={styles.controlButtonText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlButton} onPress={handleExportData}>
                        <Text style={styles.controlButtonText}>Export</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tabs}>
                    {['overview', 'metrics', 'crashes'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, selectedTab === tab && styles.activeTab]}
                            onPress={() => setSelectedTab(tab as any)}
                        >
                            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh}/>
                    }
                >
                    {renderTabContent()}
                </ScrollView>
            </View>
        </FadeAnimation>
    );
};

/**
 * JSI 성능 대시보드(개발·관리자 전용) 팔레트.
 *
 * <p>계측값을 읽는 디버그 UI라 v3 디자인 시스템의 적용 대상이 아니다 — 상태색(정상/경고/오류)이
 * 제품 브랜드색과 섞이면 오히려 판독을 방해한다. 흩어져 있던 리터럴을 이름으로 모으기만 한다.</p>
 */
const DASH = {
    info: '#2196F3',
    good: '#4CAF50',
    warn: '#FF9800',
    bad: '#F44336',
    muted: '#9E9E9E',
    textPrimary: '#333333',
    textSecondary: '#666666',
    white: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceWarm: '#F1EEE9',
    border: '#E0E0E0',
    overlay: 'rgba(0, 0, 0, 0.8)',
} as const;

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: DASH.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    dashboard: {
        backgroundColor: DASH.white,
        borderRadius: 20,
        width: '95%',
        height: '90%',
        maxWidth: 800,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: DASH.border,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: DASH.textPrimary,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: DASH.surfaceWarm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: DASH.textSecondary,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: DASH.border,
    },
    controlButton: {
        backgroundColor: DASH.info,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    controlButtonText: {
        color: DASH.white,
        fontWeight: 'bold',
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: DASH.border,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: DASH.info,
    },
    tabText: {
        fontSize: 16,
        color: DASH.textSecondary,
    },
    activeTabText: {
        color: DASH.info,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    healthCard: {
        backgroundColor: DASH.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    healthTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: DASH.textPrimary,
    },
    healthStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    healthIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    healthStatus: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 12,
    },
    healthScore: {
        fontSize: 14,
        color: DASH.textSecondary,
    },
    issuesContainer: {
        marginTop: 12,
    },
    issuesTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: DASH.bad,
        marginBottom: 4,
    },
    issueText: {
        fontSize: 12,
        color: DASH.bad,
        marginBottom: 2,
    },
    recommendationsContainer: {
        marginTop: 12,
    },
    recommendationsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: DASH.info,
        marginBottom: 4,
    },
    recommendationText: {
        fontSize: 12,
        color: DASH.info,
        marginBottom: 2,
    },
    quickStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: DASH.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: DASH.info,
    },
    statLabel: {
        fontSize: 12,
        color: DASH.textSecondary,
        marginTop: 4,
    },
    chartContainer: {
        backgroundColor: DASH.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: DASH.textPrimary,
    },
    chart: {
        borderRadius: 16,
    },
    crashContainer: {
        backgroundColor: DASH.surface,
        borderRadius: 12,
        padding: 16,
    },
    crashTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: DASH.textPrimary,
    },
    crashItem: {
        backgroundColor: DASH.white,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: DASH.bad,
    },
    crashTimestamp: {
        fontSize: 12,
        color: DASH.textSecondary,
        marginBottom: 4,
    },
    crashComponent: {
        fontSize: 14,
        fontWeight: 'bold',
        color: DASH.textPrimary,
        marginBottom: 4,
    },
    crashError: {
        fontSize: 12,
        color: DASH.bad,
        marginBottom: 4,
    },
    crashPlatform: {
        fontSize: 12,
        color: DASH.textSecondary,
    },
    noDataText: {
        fontSize: 14,
        color: DASH.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default JSIPerformanceDashboard;
