import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {ENABLE_ANIMATIONS, stageAtLeast, ANIMATION_RECOVERY_STAGE} from '../../../../navigation/config';

// Conditionally import Reanimated components only when needed
let Easing: any;

try {
  if (ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE)) {
    const reanimated = require('react-native-reanimated');
    Easing = reanimated.Easing;
  }
} catch (error) {
  console.warn('[RECOVERY] SalaryCalculatorDemo: Reanimated import failed, using fallback', error);
}
import {useJSISafeDimensions} from '../../../../hooks/useJSISafeDimensions';
import {CombinedAnimation, NumberCountAnimation, ProgressAnimation} from '../../../../common/components/animations';

interface SalaryCalculation {
    hours: number;
    hourlyRate: number;
    grossPay: number;
    taxDeduction: number;
    socialInsurance: number;
    netPay: number;
}

interface DemoResult {
    success: boolean;
    message: string;
    timestamp: number;
    calculation?: SalaryCalculation;
}

interface SalaryCalculatorDemoProps {
    onDemoComplete: (result: DemoResult) => void;
    isVisible: boolean;
}

const SalaryCalculatorDemo: React.FC<SalaryCalculatorDemoProps> = ({
                                                                       onDemoComplete,
                                                                       isVisible
                                                                   }) => {
    const [demoStep, setDemoStep] = useState<'input' | 'calculating' | 'result' | 'complete'>('input');
    const [hours, setHours] = useState('40');
    const [hourlyRate, setHourlyRate] = useState('10000');
    const [calculation, setCalculation] = useState<SalaryCalculation | null>(null);
    const [calculationProgress, setCalculationProgress] = useState(0);

    // Use JSI-safe dimensions hook
    let dimensions;
    try {
        const hookResult = useJSISafeDimensions();
        dimensions = hookResult.dimensions;
    } catch (error) {
        console.error('SalaryCalculatorDemo: Failed to get dimensions:', error);
        throw error;
    }

    // Animation logic is now handled by standardized animation components

    useEffect(() => {
        if (demoStep === 'calculating') {
            // 진행률 업데이트
            const progressInterval = setInterval(() => {
                setCalculationProgress(prev => {
                    const newProgress = prev + 4;
                    if (newProgress >= 100) {
                        clearInterval(progressInterval);
                        setDemoStep('result');
                        setTimeout(() => {
                            setDemoStep('complete');
                            onDemoComplete({
                                success: true,
                                message: '급여 계산 체험이 완료되었습니다!',
                                timestamp: Date.now(),
                                calculation: calculation!
                            });
                        }, 3500); // Allow time for number count animation
                        return 100;
                    }
                    return newProgress;
                });
            }, 100);

            return () => {
                clearInterval(progressInterval);
            };
        }
    }, [demoStep, calculation, onDemoComplete]);

    const calculateSalary = () => {
        const hoursNum = parseFloat(hours) || 0;
        const rateNum = parseFloat(hourlyRate) || 0;
        const grossPay = hoursNum * rateNum;

        // 한국 세금 계산 (간소화된 버전)
        const taxRate = 0.033; // 소득세 3.3%
        const socialInsuranceRate = 0.089; // 사회보험료 8.9%

        const taxDeduction = grossPay * taxRate;
        const socialInsurance = grossPay * socialInsuranceRate;
        const netPay = grossPay - taxDeduction - socialInsurance;

        const calculationResult: SalaryCalculation = {
            hours: hoursNum,
            hourlyRate: rateNum,
            grossPay,
            taxDeduction,
            socialInsurance,
            netPay
        };

        setCalculation(calculationResult);
        setDemoStep('calculating');
        setCalculationProgress(0);
    };

    const closeDemo = () => {
        onDemoComplete({
            success: false,
            message: '데모가 취소되었습니다.',
            timestamp: Date.now()
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Animation styles are now handled by standardized animation components

    const AnimatedNumber: React.FC<{ value: number; prefix?: string }> = ({value, prefix = ''}) => {
        return (
            <NumberCountAnimation
                targetValue={value}
                startValue={0}
                config={{duration: 1500, easing: Easing.out(Easing.cubic)}}
                formatter={(val) => `${prefix}${formatCurrency(val)}`}
            />
        );
    };

    const renderCalculator = () => (
        <View style={styles.calculator}>
            <View style={styles.calculatorIcon}>
                <Text style={styles.calculatorEmoji}>💰</Text>
            </View>

            {demoStep === 'calculating' && (
                <View style={styles.calculatingIndicator}>
                    <ProgressAnimation
                        progress={calculationProgress / 100}
                        config={{duration: 100, easing: Easing.linear}}
                        style={styles.calculatingBar}
                    >
                        <View/>
                    </ProgressAnimation>
                </View>
            )}

            {demoStep === 'result' && calculation && (
                <View style={styles.resultDisplay}>
                    <Text style={styles.resultTitle}>계산 완료!</Text>
                    <AnimatedNumber value={calculation.netPay}/>
                </View>
            )}
        </View>
    );

    const renderDemoContent = () => {
        switch (demoStep) {
            case 'input':
                return (
                    <View style={styles.demoContent}>
                        <Text style={styles.demoTitle}>급여 자동계산 체험하기</Text>
                        <Text style={styles.demoDescription}>
                            근무 시간과 시급을 입력하면{'\n'}
                            세금과 공제액까지 자동으로 계산됩니다!
                        </Text>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>근무 시간</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={hours}
                                        onChangeText={setHours}
                                        keyboardType="numeric"
                                        placeholder="40"
                                    />
                                    <Text style={styles.inputUnit}>시간</Text>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>시급</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={hourlyRate}
                                        onChangeText={setHourlyRate}
                                        keyboardType="numeric"
                                        placeholder="10000"
                                    />
                                    <Text style={styles.inputUnit}>원</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.calculateButton} onPress={calculateSalary}>
                            <Text style={styles.calculateButtonText}>💰 계산하기</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'calculating':
                return (
                    <View style={styles.demoContent}>
                        <Text style={styles.demoTitle}>급여 계산 중...</Text>
                        <Text style={styles.progressText}>{calculationProgress}%</Text>
                        <View style={styles.calculationSteps}>
                            <Text style={styles.stepText}>📊 기본급 계산 중...</Text>
                            <Text style={styles.stepText}>🏛️ 소득세 계산 중...</Text>
                            <Text style={styles.stepText}>🛡️ 사회보험료 계산 중...</Text>
                            <Text style={styles.stepText}>💵 실수령액 계산 중...</Text>
                        </View>
                    </View>
                );

            case 'result':
                return (
                    <View style={styles.demoContent}>
                        <Text style={styles.successTitle}>✅ 계산 완료!</Text>
                        {calculation && (
                            <View style={styles.resultCard}>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resultLabel}>근무 시간:</Text>
                                    <Text style={styles.resultValue}>{calculation.hours}시간</Text>
                                </View>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resultLabel}>시급:</Text>
                                    <Text style={styles.resultValue}>{formatCurrency(calculation.hourlyRate)}</Text>
                                </View>
                                <View style={styles.divider}/>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resultLabel}>기본급:</Text>
                                    <AnimatedNumber value={calculation.grossPay}/>
                                </View>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resultLabel}>소득세:</Text>
                                    <AnimatedNumber value={calculation.taxDeduction} prefix="-"/>
                                </View>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resultLabel}>사회보험료:</Text>
                                    <AnimatedNumber value={calculation.socialInsurance} prefix="-"/>
                                </View>
                                <View style={styles.divider}/>
                                <View style={styles.resultRow}>
                                    <Text style={styles.finalLabel}>실수령액:</Text>
                                    <AnimatedNumber value={calculation.netPay}/>
                                </View>
                            </View>
                        )}
                    </View>
                );

            case 'complete':
                return (
                    <View style={styles.demoContent}>
                        <Text style={styles.completeTitle}>🎉 체험 완료!</Text>
                        <Text style={styles.completeDescription}>
                            실제 앱에서는 더 정확한 계산을 제공합니다:
                        </Text>
                        <View style={styles.featureList}>
                            <Text style={styles.featureItem}>• 정확한 세율 적용</Text>
                            <Text style={styles.featureItem}>• 야간/휴일 수당 계산</Text>
                            <Text style={styles.featureItem}>• 급여명세서 자동 생성</Text>
                            <Text style={styles.featureItem}>• 연말정산 지원</Text>
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    if (!isVisible) return null;

    return (
        <CombinedAnimation
            isVisible={isVisible}
            fadeConfig={{duration: 300, easing: Easing.out(Easing.cubic)}}
            scaleConfig={{damping: 15, stiffness: 150}}
            style={styles.overlay}
        >
            <View style={styles.demoModal}>
                <TouchableOpacity style={styles.closeButton} onPress={closeDemo}>
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>

                {renderCalculator()}
                {renderDemoContent()}
            </View>
        </CombinedAnimation>
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
    demoModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
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
    calculator: {
        marginBottom: 24,
        alignItems: 'center',
    },
    calculatorIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F5E8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    calculatorEmoji: {
        fontSize: 40,
    },
    calculatingIndicator: {
        width: 200,
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    calculatingBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    resultDisplay: {
        alignItems: 'center',
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#4CAF50',
        marginBottom: 8,
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
        marginBottom: 24,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F8F8F8',
    },
    textInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333333',
    },
    inputUnit: {
        fontSize: 14,
        color: '#666666',
        marginLeft: 8,
    },
    calculateButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        shadowColor: '#4CAF50',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    calculateButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    progressText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#4CAF50',
        marginBottom: 16,
    },
    calculationSteps: {
        alignItems: 'flex-start',
        width: '100%',
    },
    stepText: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 8,
        lineHeight: 20,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#4CAF50',
        marginBottom: 20,
        textAlign: 'center',
    },
    resultCard: {
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        padding: 16,
        width: '100%',
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    resultLabel: {
        fontSize: 14,
        color: '#666666',
    },
    resultValue: {
        fontSize: 14,
        color: '#333333',
        fontWeight: '600',
    },
    calculationValue: {
        fontSize: 14,
        color: '#333333',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 8,
    },
    finalLabel: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '700',
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

export default SalaryCalculatorDemo;
