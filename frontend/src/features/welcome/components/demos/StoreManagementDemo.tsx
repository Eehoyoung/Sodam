import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ENABLE_ANIMATIONS, stageAtLeast, ANIMATION_RECOVERY_STAGE} from '../../../../navigation/config';

// Conditionally import Reanimated components only when needed
let Animated: any;
let Easing: any;
let runOnJS: any;
let useAnimatedStyle: any;
let useSharedValue: any;
let withDelay: any;
let withSpring: any;
let withTiming: any;

try {
  if (ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE)) {
    const reanimated = require('react-native-reanimated');
    Animated = reanimated.default;
    Easing = reanimated.Easing;
    runOnJS = reanimated.runOnJS;
    useAnimatedStyle = reanimated.useAnimatedStyle;
    useSharedValue = reanimated.useSharedValue;
    withDelay = reanimated.withDelay;
    withSpring = reanimated.withSpring;
    withTiming = reanimated.withTiming;
  }
} catch (error) {
  console.warn('[RECOVERY] StoreManagementDemo: Reanimated import failed, using fallback', error);
}
import {useJSISafeDimensions} from '../../../../hooks/useJSISafeDimensions';

interface Store {
    id: string;
    name: string;
    location: string;
    employees: number;
    status: 'active' | 'busy' | 'closed';
    todayRevenue: number;
    workingEmployees: number;
}

interface Employee {
    id: string;
    name: string;
    role: string;
    status: 'working' | 'break' | 'off';
    checkInTime: string;
}

interface ManagementResult {
    success: boolean;
    message: string;
    timestamp: number;
    storesManaged?: number;
}

interface DemoResult {
    success: boolean;
    message: string;
    timestamp: number;
    management?: ManagementResult;
}

interface StoreManagementDemoProps {
    onDemoComplete: (result: DemoResult) => void;
    isVisible: boolean;
}

const StoreManagementDemo: React.FC<StoreManagementDemoProps> = ({
                                                                     onDemoComplete,
                                                                     isVisible
                                                                 }) => {
    const [demoStep, setDemoStep] = useState<'overview' | 'details' | 'management' | 'complete'>('overview');
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [managementProgress, setManagementProgress] = useState(0);

    const fadeAnim = useSharedValue(0);
    const scaleAnim = useSharedValue(0.8);
    const progressAnim = useSharedValue(0);
    const storeAnim1 = useSharedValue(0);
    const storeAnim2 = useSharedValue(0);
    const storeAnim3 = useSharedValue(0);

    // Use JSI-safe dimensions hook
    let dimensions;
    try {
        const hookResult = useJSISafeDimensions();
        dimensions = hookResult.dimensions;
    } catch (error) {
        console.error('StoreManagementDemo: Failed to get dimensions:', error);
        throw error;
    }

    // Create dynamic styles that depend on dimensions (moved from StyleSheet.create)
    const dynamicStyles = useMemo(() => ({
        demoModal: {
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            width: dimensions.screenWidth * 0.9,  // ✅ Safe access to dimensions
            maxWidth: 400,
            alignItems: 'center' as const,
            maxHeight: dimensions.screenHeight * 0.85,  // Use numeric value instead of string percentage
        },
    }), [dimensions.screenWidth, dimensions.screenHeight]);

    const stores: Store[] = [
        {
            id: '1',
            name: '강남 본점',
            location: '강남구 테헤란로',
            employees: 8,
            status: 'active',
            todayRevenue: 1250000,
            workingEmployees: 6
        },
        {
            id: '2',
            name: '홍대 지점',
            location: '마포구 홍익로',
            employees: 5,
            status: 'busy',
            todayRevenue: 890000,
            workingEmployees: 5
        },
        {
            id: '3',
            name: '신촌 지점',
            location: '서대문구 신촌로',
            employees: 6,
            status: 'active',
            todayRevenue: 720000,
            workingEmployees: 4
        }
    ];

    const employees: Employee[] = [
        {id: '1', name: '김민수', role: '매니저', status: 'working', checkInTime: '09:00'},
        {id: '2', name: '이지은', role: '직원', status: 'working', checkInTime: '09:30'},
        {id: '3', name: '박준호', role: '직원', status: 'break', checkInTime: '10:00'},
        {id: '4', name: '최유진', role: '직원', status: 'working', checkInTime: '09:15'},
        {id: '5', name: '정민재', role: '직원', status: 'working', checkInTime: '09:45'},
        {id: '6', name: '한소영', role: '직원', status: 'working', checkInTime: '10:30'}
    ];

    useEffect(() => {
        if (isVisible) {
            // 데모 모달 등장 애니메이션 (Reanimated 3)
            fadeAnim.value = withTiming(1, {
                duration: 300,
                easing: Easing.out(Easing.cubic),
            });
            scaleAnim.value = withSpring(1, {
                damping: 15,
                stiffness: 150,
            });

            // 매장 카드들 순차 애니메이션 (Reanimated 3)
            storeAnim1.value = withDelay(300, withTiming(1, {
                duration: 600,
                easing: Easing.out(Easing.back(1.1)),
            }));

            storeAnim2.value = withDelay(500, withTiming(1, {
                duration: 600,
                easing: Easing.out(Easing.back(1.1)),
            }));

            storeAnim3.value = withDelay(700, withTiming(1, {
                duration: 600,
                easing: Easing.out(Easing.back(1.1)),
            }));
        }
    }, [isVisible]);

    useEffect(() => {
        if (demoStep === 'management') {
            // 관리 작업 시뮬레이션 (Reanimated 3)
            progressAnim.value = withTiming(1, {
                duration: 3000,
                easing: Easing.out(Easing.quad),
            }, (finished: boolean) => {
                'worklet';
                if (finished) {
                    runOnJS(() => {
                        setDemoStep('complete');
                        onDemoComplete({
                            success: true,
                            message: '매장 통합관리 체험이 완료되었습니다!',
                            timestamp: Date.now(),
                            management: {
                                success: true,
                                message: '3개 매장 관리 완료',
                                timestamp: Date.now(),
                                storesManaged: 3
                            }
                        });
                    })();
                }
            });

            // 진행률 업데이트
            const progressInterval = setInterval(() => {
                setManagementProgress(prev => {
                    const newProgress = prev + 3;
                    if (newProgress >= 100) {
                        clearInterval(progressInterval);
                        return 100;
                    }
                    return newProgress;
                });
            }, 90);

            return () => {
                clearInterval(progressInterval);
                // Reanimated 3에서는 자동으로 애니메이션이 정리됨
            };
        }
    }, [demoStep]);

    const closeDemo = () => {
        // Reanimated 3 parallel animations
        fadeAnim.value = withTiming(0, {duration: 200});
        scaleAnim.value = withTiming(0.8, {duration: 200}, (finished: boolean) => {
            'worklet';
            if (finished) {
                runOnJS(() => {
                    onDemoComplete({
                        success: false,
                        message: '데모가 취소되었습니다.',
                        timestamp: Date.now()
                    });
                })();
            }
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Animated styles using Reanimated 3
    const containerStyle = useAnimatedStyle(() => ({
        opacity: fadeAnim.value,
        transform: [{scale: scaleAnim.value}],
    }));

    const progressBarStyle = useAnimatedStyle(() => ({
        width: `${progressAnim.value * 100}%`,
    }));

    const store1Style = useAnimatedStyle(() => ({
        opacity: storeAnim1.value,
        transform: [{scale: storeAnim1.value}],
    }));

    const store2Style = useAnimatedStyle(() => ({
        opacity: storeAnim2.value,
        transform: [{scale: storeAnim2.value}],
    }));

    const store3Style = useAnimatedStyle(() => ({
        opacity: storeAnim3.value,
        transform: [{scale: storeAnim3.value}],
    }));

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return '#4CAF50';
            case 'busy':
                return '#FF9800';
            case 'closed':
                return '#F44336';
            case 'working':
                return '#4CAF50';
            case 'break':
                return '#FF9800';
            case 'off':
                return '#9E9E9E';
            default:
                return '#9E9E9E';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active':
                return '정상 운영';
            case 'busy':
                return '바쁨';
            case 'closed':
                return '영업 종료';
            case 'working':
                return '근무중';
            case 'break':
                return '휴식중';
            case 'off':
                return '퇴근';
            default:
                return status;
        }
    };

    const handleStoreSelect = (store: Store) => {
        setSelectedStore(store);
        setDemoStep('details');
    };

    const startManagement = () => {
        setDemoStep('management');
        setManagementProgress(0);
        progressAnim.value = 0;
    };

    const StoreCard: React.FC<{ store: Store; index: number }> = ({store, index}) => {
        const storeStyles = [store1Style, store2Style, store3Style];

        return (
            <Animated.View style={storeStyles[index]}>
                <TouchableOpacity
                    style={styles.storeCard}
                    onPress={() => handleStoreSelect(store)}
                    activeOpacity={0.8}
                >
                    <View style={styles.storeHeader}>
                        <Text style={styles.storeName}>{store.name}</Text>
                        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(store.status)}]}>
                            <Text style={styles.statusText}>{getStatusText(store.status)}</Text>
                        </View>
                    </View>
                    <Text style={styles.storeLocation}>{store.location}</Text>
                    <View style={styles.storeStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{store.workingEmployees}/{store.employees}</Text>
                            <Text style={styles.statLabel}>근무중</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{formatCurrency(store.todayRevenue)}</Text>
                            <Text style={styles.statLabel}>오늘 매출</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderDashboard = () => (
        <View style={styles.dashboard}>
            <View style={styles.dashboardHeader}>
                <Text style={styles.dashboardTitle}>🏪 매장 현황</Text>
                <Text style={styles.dashboardSubtitle}>실시간 모니터링</Text>
            </View>

            <ScrollView style={styles.storesContainer} showsVerticalScrollIndicator={false}>
                {stores.map((store, index) => (
                    <StoreCard key={store.id} store={store} index={index}/>
                ))}
            </ScrollView>
        </View>
    );

    const renderDemoContent = () => {
        switch (demoStep) {
            case 'overview':
                return (
                    <View style={styles.demoContent}>
                        <Text style={styles.demoTitle}>매장 통합관리 체험하기</Text>
                        <Text style={styles.demoDescription}>
                            여러 매장을 한 번에 관리하고{'\n'}
                            실시간으로 현황을 모니터링해보세요!
                        </Text>
                        <Text style={styles.instructionText}>
                            👆 매장을 선택하여 상세 정보를 확인하세요
                        </Text>
                    </View>
                );

            case 'details':
                return (
                    <View style={styles.demoContent}>
                        <Text style={styles.demoTitle}>{selectedStore?.name} 상세 정보</Text>
                        {selectedStore && (
                            <View style={styles.detailsContainer}>
                                <View style={styles.employeeSection}>
                                    <Text style={styles.sectionTitle}>👥 직원 현황</Text>
                                    {employees.slice(0, selectedStore.employees).map((employee) => (
                                        <View key={employee.id} style={styles.employeeRow}>
                                            <Text style={styles.employeeName}>{employee.name}</Text>
                                            <Text style={styles.employeeRole}>{employee.role}</Text>
                                            <View
                                                style={[styles.employeeStatus, {backgroundColor: getStatusColor(employee.status)}]}>
                                                <Text
                                                    style={styles.employeeStatusText}>{getStatusText(employee.status)}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity style={styles.manageButton} onPress={startManagement}>
                                    <Text style={styles.manageButtonText}>🏪 통합 관리 시작</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );

            case 'management':
                return (
                    <View style={styles.demoContent}>
                        <Text style={styles.demoTitle}>통합 관리 실행 중...</Text>
                        <Text style={styles.progressText}>{managementProgress}%</Text>
                        <View style={styles.progressBar}>
                            <Animated.View style={[styles.progressFill, progressBarStyle]}/>
                        </View>
                        <View style={styles.managementSteps}>
                            <Text style={styles.stepText}>📊 매장별 현황 분석 중...</Text>
                            <Text style={styles.stepText}>👥 직원 권한 설정 중...</Text>
                            <Text style={styles.stepText}>📈 실시간 데이터 동기화 중...</Text>
                            <Text style={styles.stepText}>🔔 알림 설정 업데이트 중...</Text>
                        </View>
                    </View>
                );

            case 'complete':
                return (
                    <View style={styles.demoContent}>
                        <Text style={styles.completeTitle}>🎉 관리 완료!</Text>
                        <Text style={styles.completeDescription}>
                            실제 앱에서는 더 강력한 관리 기능을 제공합니다:
                        </Text>
                        <View style={styles.featureList}>
                            <Text style={styles.featureItem}>• 실시간 매출 모니터링</Text>
                            <Text style={styles.featureItem}>• 직원별 세부 권한 관리</Text>
                            <Text style={styles.featureItem}>• 자동 보고서 생성</Text>
                            <Text style={styles.featureItem}>• 매장간 데이터 비교 분석</Text>
                            <Text style={styles.featureItem}>• 모바일 푸시 알림</Text>
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    if (!isVisible) return null;

    return (
        <Animated.View style={[styles.overlay, containerStyle]}>
            <View style={dynamicStyles.demoModal}>
                <TouchableOpacity style={styles.closeButton} onPress={closeDemo}>
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>

                {demoStep === 'overview' && renderDashboard()}
                {renderDemoContent()}
            </View>
        </Animated.View>
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
    demoModalBase: {
        // Removed dimensions-dependent width - now handled by dynamicStyles
        // backgroundColor, borderRadius, padding, maxWidth, alignItems, maxHeight moved to dynamicStyles
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1001,
    },
    closeButtonText: {
        fontSize: 16,
        color: '#666666',
        fontWeight: 'bold',
    },
    dashboard: {
        width: '100%',
        marginBottom: 20,
    },
    dashboardHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    dashboardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333333',
        marginBottom: 4,
    },
    dashboardSubtitle: {
        fontSize: 14,
        color: '#666666',
    },
    storesContainer: {
        maxHeight: 200,
    },
    storeCard: {
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    storeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    storeLocation: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 12,
    },
    storeStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333333',
    },
    statLabel: {
        fontSize: 12,
        color: '#666666',
        marginTop: 2,
    },
    demoContent: {
        alignItems: 'center',
        width: '100%',
    },
    demoTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333333',
        marginBottom: 12,
        textAlign: 'center',
    },
    demoDescription: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    instructionText: {
        fontSize: 14,
        color: '#FF9800',
        textAlign: 'center',
        fontWeight: '600',
    },
    detailsContainer: {
        width: '100%',
    },
    employeeSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 12,
    },
    employeeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    employeeName: {
        fontSize: 14,
        color: '#333333',
        flex: 1,
    },
    employeeRole: {
        fontSize: 12,
        color: '#666666',
        marginRight: 8,
    },
    employeeStatus: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    employeeStatusText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    manageButton: {
        backgroundColor: '#FF9800',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#FF9800',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    manageButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    progressText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FF9800',
        marginBottom: 16,
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FF9800',
        borderRadius: 4,
    },
    managementSteps: {
        alignItems: 'flex-start',
        width: '100%',
    },
    stepText: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 8,
        lineHeight: 20,
    },
    completeTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FF4081',
        marginBottom: 16,
        textAlign: 'center',
    },
    completeDescription: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    featureList: {
        alignItems: 'flex-start',
        width: '100%',
    },
    featureItem: {
        fontSize: 14,
        color: '#333333',
        marginBottom: 8,
        lineHeight: 20,
    },
});

export default StoreManagementDemo;
