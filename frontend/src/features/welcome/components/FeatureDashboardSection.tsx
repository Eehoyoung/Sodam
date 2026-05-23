import React, {useEffect, useState} from 'react';
import {Dimensions, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ENABLE_ANIMATIONS, stageAtLeast, ANIMATION_RECOVERY_STAGE} from '../../../navigation/config';

// Conditionally import Reanimated components only when needed
let Animated: any;
let useAnimatedStyle: any;
let useSharedValue: any;
let withTiming: any;
let withDelay: any;
let interpolate: any;
let Easing: any;

try {
  if (ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE)) {
    const reanimated = require('react-native-reanimated');
    Animated = reanimated.default;
    useAnimatedStyle = reanimated.useAnimatedStyle;
    useSharedValue = reanimated.useSharedValue;
    withTiming = reanimated.withTiming;
    withDelay = reanimated.withDelay;
    interpolate = reanimated.interpolate;
    Easing = reanimated.Easing;
  }
} catch (error) {
  console.warn('[RECOVERY] FeatureDashboardSection: Reanimated import failed, using fallback', error);
}
import NFCDemo from './demos/NFCDemo';
import SalaryCalculatorDemo from './demos/SalaryCalculatorDemo';
import StoreManagementDemo from './demos/StoreManagementDemo';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

interface Feature {
    id: string;
    icon: string;
    title: string;
    benefits: string[];
    demoAction: string;
    color: string;
}

interface Stat {
    value: string;
    label: string;
    icon: string;
}

interface FeatureDashboardSectionProps {
    isVisible: boolean;
    onFeatureTest: (featureId: string) => void;
}

const FeatureDashboardSection: React.FC<FeatureDashboardSectionProps> = ({
                                                                             isVisible,
                                                                             onFeatureTest
                                                                         }) => {
    const shouldUseAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    // Only use animated values when animations are enabled
    const fadeAnim = shouldUseAnimations && useSharedValue ? useSharedValue(0) : null;
    const slideAnim1 = shouldUseAnimations && useSharedValue ? useSharedValue(50) : null;
    const slideAnim2 = shouldUseAnimations && useSharedValue ? useSharedValue(50) : null;
    const slideAnim3 = shouldUseAnimations && useSharedValue ? useSharedValue(50) : null;
    const statsAnim = shouldUseAnimations && useSharedValue ? useSharedValue(0) : null;

    // Demo state management
    const [activeDemo, setActiveDemo] = useState<string | null>(null);

    const features: Feature[] = [
        {
            id: 'nfc-attendance',
            icon: '📱📡',
            title: 'NFC 출퇴근',
            benefits: [
                '1초만에 출퇴근 완료',
                'GPS 위치 자동 확인',
                '실시간 알림 발송'
            ],
            demoAction: '체험해보기',
            color: '#4CAF50'
        },
        {
            id: 'auto-salary',
            icon: '💰',
            title: '급여 자동계산',
            benefits: [
                '시급 자동 계산',
                '세금 공제 자동 처리',
                '급여명세서 자동 생성'
            ],
            demoAction: '계산해보기',
            color: '#4CAF50'
        },
        {
            id: 'store-management',
            icon: '🏪',
            title: '매장 통합관리',
            benefits: [
                '여러 매장 한번에 관리',
                '직원별 권한 설정',
                '실시간 현황 모니터링'
            ],
            demoAction: '관리해보기',
            color: '#FF9800'
        }
    ];

    const stats: Stat[] = [
        {value: '30%', label: '시간 단축', icon: '⏰'},
        {value: '0%', label: '실수 감소', icon: '📊'},
        {value: '10K+', label: '매장 이용', icon: '🏆'}
    ];

    useEffect(() => {
        if (!shouldUseAnimations) {
            // No animations - just trigger any completion callbacks
            return;
        }

        if (isVisible && fadeAnim && slideAnim1 && slideAnim2 && slideAnim3 && statsAnim) {
            // 섹션 전체 페이드인 (Reanimated 3)
            fadeAnim.value = withTiming(1, {
                duration: 500,
                easing: Easing.out(Easing.cubic),
            });

            // 기능 카드들 순차적 애니메이션 (Reanimated 3)
            slideAnim1.value = withDelay(200, withTiming(0, {
                duration: 600,
                easing: Easing.out(Easing.back(1.2)),
            }));

            slideAnim2.value = withDelay(400, withTiming(0, {
                duration: 600,
                easing: Easing.out(Easing.back(1.2)),
            }));

            slideAnim3.value = withDelay(600, withTiming(0, {
                duration: 600,
                easing: Easing.out(Easing.back(1.2)),
            }));

            // 통계 애니메이션 (Reanimated 3)
            statsAnim.value = withDelay(800, withTiming(1, {
                duration: 2000,
                easing: Easing.out(Easing.quad),
            }));
        }
    }, [isVisible, shouldUseAnimations]);

    const getFeatureAnimationStyle = (index: number) => {
        const anims = [slideAnim1, slideAnim2, slideAnim3];
        return {
            transform: [{translateY: anims[index]}],
            opacity: fadeAnim,
        };
    };

    const handleDemoStart = (featureId: string) => {
        setActiveDemo(featureId);
        onFeatureTest(featureId);
    };

    const handleDemoComplete = (result: any) => {
        setActiveDemo(null);
    };

    const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({feature, index}) => {
        // Only use animated values when animations are enabled
        const cardScaleAnim = shouldUseAnimations && useSharedValue ? useSharedValue(1) : null;
        const buttonScaleAnim = shouldUseAnimations && useSharedValue ? useSharedValue(1) : null;
        const shadowAnim = shouldUseAnimations && useSharedValue ? useSharedValue(0.1) : null;

        const handleCardPressIn = () => {
            if (shouldUseAnimations && cardScaleAnim && shadowAnim && withTiming) {
                cardScaleAnim.value = withTiming(0.98, {duration: 150});
                shadowAnim.value = withTiming(0.2, {duration: 150});
            }
        };

        const handleCardPressOut = () => {
            if (shouldUseAnimations && cardScaleAnim && shadowAnim && withTiming) {
                cardScaleAnim.value = withTiming(1, {duration: 150});
                shadowAnim.value = withTiming(0.1, {duration: 150});
            }
        };

        const handleButtonPressIn = () => {
            if (shouldUseAnimations && buttonScaleAnim && withTiming) {
                buttonScaleAnim.value = withTiming(0.95, {duration: 100});
            }
        };

        const handleButtonPressOut = () => {
            if (shouldUseAnimations && buttonScaleAnim && withTiming) {
                buttonScaleAnim.value = withTiming(1, {duration: 100});
            }
        };

        // Conditionally create animated styles only when animations are enabled
        const cardAnimatedStyle = shouldUseAnimations && useAnimatedStyle && cardScaleAnim && shadowAnim ? useAnimatedStyle(() => ({
            transform: [{scale: cardScaleAnim.value}],
            shadowOpacity: interpolate(
                shadowAnim.value,
                [0.1, 0.2],
                [0.1, 0.2]
            ),
        })) : null;

        const buttonAnimatedStyle = shouldUseAnimations && useAnimatedStyle && buttonScaleAnim ? useAnimatedStyle(() => ({
            transform: [{scale: buttonScaleAnim.value}],
        })) : null;

        return (
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={handleCardPressIn}
                onPressOut={handleCardPressOut}
                onPress={() => {
                }}
            >
                <Animated.View style={[
                    styles.featureCard,
                    getFeatureAnimationStyle(index),
                    cardAnimatedStyle,
                ]}>
                    <View style={styles.featureHeader}>
                        <Text style={styles.featureIcon}>{feature.icon}</Text>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                    </View>

                    <View style={styles.benefitsContainer}>
                        {feature.benefits.map((benefit, idx) => (
                            <View key={idx} style={styles.benefitRow}>
                                <Text style={styles.checkIcon}>✓</Text>
                                <Text style={styles.benefitText}>{benefit}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.demoButton, {backgroundColor: feature.color}]}
                        onPress={() => handleDemoStart(feature.id)}
                        onPressIn={handleButtonPressIn}
                        onPressOut={handleButtonPressOut}
                        activeOpacity={1}
                    >
                        <Animated.View style={buttonAnimatedStyle}>
                            <Text style={styles.demoButtonText}>{feature.demoAction} →</Text>
                        </Animated.View>
                    </TouchableOpacity>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const StatCard: React.FC<{ stat: Stat; index: number }> = ({stat, index}) => {
        const [displayValue, setDisplayValue] = useState('0');
        const scaleAnim = useSharedValue(0.8);

        const animatedValue = interpolate(
            statsAnim.value,
            [0, 1],
            [0, 1]
        );

        const animatedStyle = useAnimatedStyle(() => {
            return {
                opacity: animatedValue,
                transform: [{scale: scaleAnim.value}]
            };
        });

        useEffect(() => {
            if (isVisible) {
                // Scale animation for card entrance using Reanimated v3
                scaleAnim.value = withDelay(
                    800 + (index * 200),
                    withTiming(1, {
                        duration: 600,
                        easing: Easing.out(Easing.back(1.2)),
                    })
                );

                // Counter animation for numeric values
                const timeout = setTimeout(() => {
                    animateCounter(stat.value, setDisplayValue);
                }, 1000 + (index * 200));

                return () => clearTimeout(timeout);
            }
        }, [isVisible, index]);

        const animateCounter = (targetValue: string, setValue: (value: string) => void) => {
            if (targetValue.includes('%')) {
                const numericValue = parseInt(targetValue.replace('%', ''));
                let current = 0;
                const increment = numericValue / 30; // 30 frames for smooth animation

                const timer = setInterval(() => {
                    current += increment;
                    if (current >= numericValue) {
                        setValue(targetValue);
                        clearInterval(timer);
                    } else {
                        setValue(Math.floor(current) + '%');
                    }
                }, 50);
            } else if (targetValue.includes('K+')) {
                const numericValue = parseInt(targetValue.replace('K+', ''));
                let current = 0;
                const increment = numericValue / 20;

                const timer = setInterval(() => {
                    current += increment;
                    if (current >= numericValue) {
                        setValue(targetValue);
                        clearInterval(timer);
                    } else {
                        setValue(Math.floor(current) + 'K+');
                    }
                }, 80);
            } else {
                setValue(targetValue);
            }
        };

        return (
            <Animated.View style={[styles.statCard, animatedStyle]}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Animated.Text style={styles.statValue}>
                    {displayValue}
                </Animated.Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
        );
    };

    return (
        <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
            <View style={styles.content}>
                <Text style={styles.sectionTitle}>
                    Sodam이 모든 걱정을 해결해드려요!
                </Text>

                <View style={styles.featuresContainer}>
                    {features.map((feature, index) => (
                        <FeatureCard
                            key={feature.id}
                            feature={feature}
                            index={index}
                        />
                    ))}
                </View>

                <View style={styles.statsSection}>
                    <Text style={styles.statsTitle}>📊 실시간 효과 통계</Text>
                    <View style={styles.statsGrid}>
                        {stats.map((stat, index) => (
                            <StatCard key={index} stat={stat} index={index}/>
                        ))}
                    </View>
                </View>
            </View>

            {/* Interactive Demos */}
            <NFCDemo
                isVisible={activeDemo === 'nfc-attendance'}
                onDemoComplete={handleDemoComplete}
            />
            <SalaryCalculatorDemo
                isVisible={activeDemo === 'auto-salary'}
                onDemoComplete={handleDemoComplete}
            />
            <StoreManagementDemo
                isVisible={activeDemo === 'store-management'}
                onDemoComplete={handleDemoComplete}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: screenHeight * 1.2,
        backgroundColor: '#F8FAFF',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    content: {
        flex: 1,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#2196F3',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 34,
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 60,
    },
    featureCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    featureHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    featureIcon: {
        fontSize: 28,
        marginRight: 12,
    },
    featureTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333333',
        flex: 1,
    },
    benefitsContainer: {
        marginBottom: 20,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkIcon: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginRight: 8,
        width: 20,
    },
    benefitText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555555',
        flex: 1,
    },
    demoButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    demoButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    statsSection: {
        width: '100%',
        alignItems: 'center',
    },
    statsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333333',
        marginBottom: 24,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    statCard: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        minWidth: 80,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    statIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#2196F3',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#666666',
        textAlign: 'center',
    },
});

export default FeatureDashboardSection;
