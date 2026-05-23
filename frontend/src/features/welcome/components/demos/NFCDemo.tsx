import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useJSISafeDimensions} from '../../../../hooks/useJSISafeDimensions';
import {ProgressAnimation, PulseAnimation} from '../../../../common/components/animations';

interface DemoResult {
    success: boolean;
    message: string;
    timestamp: number;
}

interface NFCDemoProps {
    onDemoComplete: (result: DemoResult) => void;
    isVisible: boolean;
}

const NFCDemo: React.FC<NFCDemoProps> = ({onDemoComplete, isVisible}) => {
    const [demoStep, setDemoStep] = useState<'idle' | 'reading' | 'success' | 'complete'>('idle');
    const [readProgress, setReadProgress] = useState(0);

    // Use JSI-safe dimensions hook
    let dimensions;
    try {
        const hookResult = useJSISafeDimensions();
        dimensions = hookResult.dimensions;
    } catch (error) {
        console.error('NFCDemo: Failed to get dimensions:', error);
        throw error;
    }

    // Animation logic is now handled by standardized animation components

    useEffect(() => {
        if (demoStep === 'reading') {
            // 진행률 업데이트
            const progressInterval = setInterval(() => {
                setReadProgress(prev => {
                    const newProgress = prev + 8;
                    if (newProgress >= 100) {
                        clearInterval(progressInterval);
                        setDemoStep('success');
                        setTimeout(() => {
                            setDemoStep('complete');
                            onDemoComplete({
                                success: true,
                                message: 'NFC 출퇴근 체험이 완료되었습니다!',
                                timestamp: Date.now()
                            });
                        }, 1500);
                        return 100;
                    }
                    return newProgress;
                });
            }, 80);

            return () => {
                clearInterval(progressInterval);
            };
        }
    }, [demoStep, onDemoComplete]);

    const startDemo = () => {
        setDemoStep('reading');
        setReadProgress(0);
    };

    const closeDemo = () => {
        onDemoComplete({
            success: false,
            message: '데모가 취소되었습니다.',
            timestamp: Date.now()
        });
    };

    // Animation styles are now handled by standardized animation components

    const renderNFCReader = () => (
        <PulseAnimation
            isActive={demoStep === 'reading'}
            style={styles.nfcReader}
            config={{minScale: 1, maxScale: 1.15, duration: 800}}
        >
            <View style={styles.nfcFrame}>
                <View style={styles.nfcIcon}>
                    <Text style={styles.nfcIconText}>NFC</Text>
                </View>

                {demoStep === 'reading' && (
                    <View style={styles.nfcWaves}>
                        <View style={[styles.wave, styles.wave1]}/>
                        <View style={[styles.wave, styles.wave2]}/>
                        <View style={[styles.wave, styles.wave3]}/>
                    </View>
                )}

                {demoStep === 'success' && (
                    <View style={styles.successIcon}>
                        <Text style={styles.successText}>✓</Text>
                    </View>
                )}
            </View>
        </PulseAnimation>
    );

    const renderProgressBar = () => (
        <ProgressAnimation
            progress={readProgress}
            style={styles.progressContainer}
        >
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, {width: `${readProgress}%`}]} />
            </View>
        </ProgressAnimation>
    );

    const renderInstructions = () => {
        switch (demoStep) {
            case 'idle':
                return (
                    <View style={styles.instructionsContainer}>
                        <Text style={styles.instructionTitle}>NFC 출퇴근 체험</Text>
                        <Text style={styles.instructionText}>
                            NFC 태그를 기기에 가까이 대는 것처럼{'\n'}
                            아래 버튼을 눌러보세요
                        </Text>
                    </View>
                );
            case 'reading':
                return (
                    <View style={styles.instructionsContainer}>
                        <Text style={styles.instructionTitle}>NFC 태그 읽는 중...</Text>
                        <Text style={styles.instructionText}>
                            태그 정보를 읽고 있습니다{'\n'}
                            기기를 움직이지 마세요
                        </Text>
                        {renderProgressBar()}
                        <Text style={styles.progressText}>{readProgress}%</Text>
                    </View>
                );
            case 'success':
                return (
                    <View style={styles.instructionsContainer}>
                        <Text style={styles.successTitle}>출근 완료!</Text>
                        <Text style={styles.successMessage}>
                            NFC 태그 인증이 성공했습니다{'\n'}
                            출근 처리가 완료되었습니다
                        </Text>
                    </View>
                );
            default:
                return null;
        }
    };

    const renderActionButton = () => {
        if (demoStep === 'idle') {
            return (
                <TouchableOpacity style={styles.startButton} onPress={startDemo}>
                    <Text style={styles.startButtonText}>NFC 태그 터치 체험</Text>
                </TouchableOpacity>
            );
        }
        return null;
    };

    if (!isVisible) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>NFC 출퇴근 데모</Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeDemo}>
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.demoArea}>
                {renderNFCReader()}
                {renderInstructions()}
            </View>

            <View style={styles.footer}>
                {renderActionButton()}
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.infoTitle}>💡 NFC 출퇴근의 장점</Text>
                <View style={styles.infoList}>
                    <Text style={styles.infoItem}>• 빠른 인증 (1초 이내)</Text>
                    <Text style={styles.infoItem}>• 카메라 불필요</Text>
                    <Text style={styles.infoItem}>• 어두운 곳에서도 사용 가능</Text>
                    <Text style={styles.infoItem}>• 배터리 소모 최소화</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#4CAF50',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    demoArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    nfcReader: {
        marginBottom: 40,
    },
    nfcFrame: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        position: 'relative',
    },
    nfcIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nfcIconText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    nfcWaves: {
        position: 'absolute',
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    wave: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderRadius: 100,
        opacity: 0.6,
    },
    wave1: {
        width: 120,
        height: 120,
    },
    wave2: {
        width: 160,
        height: 160,
    },
    wave3: {
        width: 200,
        height: 200,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successText: {
        color: '#fff',
        fontSize: 40,
        fontWeight: 'bold',
    },
    instructionsContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    instructionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    instructionText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 10,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        lineHeight: 24,
    },
    progressContainer: {
        width: 200,
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        marginTop: 20,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBar: {
        width: '100%',
        height: '100%',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    footer: {
        padding: 20,
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoContainer: {
        backgroundColor: '#fff',
        margin: 20,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    infoList: {
        gap: 8,
    },
    infoItem: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
});

export default NFCDemo;
