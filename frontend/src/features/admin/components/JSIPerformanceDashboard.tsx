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

interface DashboardProps {
    isVisible: boolean;
    onClose: () => void;
}

export const JSIPerformanceDashboard: React.FC<DashboardProps> = ({
                                                                      isVisible,
                                                                      onClose,
                                                                  }) => {
    console.log('[DEBUG_LOG] JSIPerformanceDashboard: Component initialization started');
    console.log('[DEBUG_LOG] JSIPerformanceDashboard: Props received:', {isVisible});

    // Use JSI-safe dimensions hook
    console.log('[DEBUG_LOG] JSIPerformanceDashboard: About to call useJSISafeDimensions hook');
    let dimensions;
    try {
        const hookResult = useJSISafeDimensions();
        dimensions = hookResult.dimensions;
        console.log('[DEBUG_LOG] JSIPerformanceDashboard: useJSISafeDimensions hook called successfully');
        console.log('[DEBUG_LOG] JSIPerformanceDashboard: Received dimensions:', dimensions);
        console.log('[DEBUG_LOG] JSIPerformanceDashboard: Full hook result:', hookResult);
    } catch (error) {
        console.error('[DEBUG_LOG] JSIPerformanceDashboard: ERROR calling useJSISafeDimensions:', error);
        if (error instanceof Error) {
            console.error('[DEBUG_LOG] JSIPerformanceDashboard: Error stack:', error.stack);
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
        if (!isVisible) return;

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
        console.log('Exported JSI Performance Data:', exportData);
        Alert.alert('Export Complete', 'Data exported to console');
    };

    const getHealthStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return '#4CAF50';
            case 'warning':
                return '#FF9800';
            case 'critical':
                return '#F44336';
            default:
                return '#9E9E9E';
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
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
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
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
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
                {crashReports.slice(-5).map((crash, index) => (
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

    if (!isVisible) return null;

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

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    dashboard: {
        backgroundColor: '#FFFFFF',
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
        borderBottomColor: '#E0E0E0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333333',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666666',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    controlButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    controlButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#2196F3',
    },
    tabText: {
        fontSize: 16,
        color: '#666666',
    },
    activeTabText: {
        color: '#2196F3',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    healthCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    healthTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333333',
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
        color: '#666666',
    },
    issuesContainer: {
        marginTop: 12,
    },
    issuesTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F44336',
        marginBottom: 4,
    },
    issueText: {
        fontSize: 12,
        color: '#F44336',
        marginBottom: 2,
    },
    recommendationsContainer: {
        marginTop: 12,
    },
    recommendationsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 4,
    },
    recommendationText: {
        fontSize: 12,
        color: '#2196F3',
        marginBottom: 2,
    },
    quickStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#F8F9FA',
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
        color: '#2196F3',
    },
    statLabel: {
        fontSize: 12,
        color: '#666666',
        marginTop: 4,
    },
    chartContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333333',
    },
    chart: {
        borderRadius: 16,
    },
    crashContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
    },
    crashTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333333',
    },
    crashItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#F44336',
    },
    crashTimestamp: {
        fontSize: 12,
        color: '#666666',
        marginBottom: 4,
    },
    crashComponent: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 4,
    },
    crashError: {
        fontSize: 12,
        color: '#F44336',
        marginBottom: 4,
    },
    crashPlatform: {
        fontSize: 12,
        color: '#666666',
    },
    noDataText: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default JSIPerformanceDashboard;
