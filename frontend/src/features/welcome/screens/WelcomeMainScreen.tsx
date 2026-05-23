import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native';
import SodamLogo from '../../../common/components/logo/SodamLogo';
import { COLORS } from '../../../common/components/logo/Colors';

interface WelcomeMainScreenProps {
    navigation: NavigationProp<any>;
}

Dimensions.get('window');

export default function WelcomeMainScreen({ navigation }: WelcomeMainScreenProps) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(50)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleLogin = () => {
        navigation.navigate('Auth', { screen: 'Login' });
    };

    const handleSignup = () => {
        navigation.navigate('Auth', { screen: 'Signup' });
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={[COLORS.SODAM_ORANGE, '#FF8A65', '#42A5F5', COLORS.SODAM_BLUE]}
                style={styles.container}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.content}>
                        {/* 로고 섹션 */}
                        <Animated.View
                            style={[
                                styles.logoSection,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }]
                                }
                            ]}
                        >
                            <View style={styles.logoContainer}>
                                <SodamLogo size={120} variant="white" />
                            </View>

                            <Text style={styles.brandName}>소담</Text>
                            <Text style={styles.brandSubtitle}>소상공인을 담다</Text>
                            <Text style={styles.brandDescription}>디지털과 연결하다</Text>
                        </Animated.View>

                        {/* 버튼 섹션 */}
                        <Animated.View
                            style={[
                                styles.buttonSection,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }]
                                }
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.loginButton}
                                onPress={handleLogin}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.loginButtonText}>로그인</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.signupButton}
                                onPress={handleSignup}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.signupButtonText}>회원가입</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* 하단 텍스트 */}
                        <Animated.View
                            style={[
                                styles.bottomSection,
                                { opacity: fadeAnim }
                            ]}
                        >
                            <Text style={styles.bottomText}>
                                이미 계정이 있으신가요?{' '}
                                <Text style={styles.bottomLink} onPress={handleLogin}>
                                    로그인하기
                                </Text>
                            </Text>
                        </Animated.View>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logoContainer: {
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    brandName: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.WHITE,
        marginBottom: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    brandSubtitle: {
        fontSize: 20,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 4,
    },
    brandDescription: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    buttonSection: {
        width: '100%',
        maxWidth: 320,
    },
    loginButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    loginButtonText: {
        color: COLORS.SODAM_ORANGE,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    signupButton: {
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    signupButtonText: {
        color: COLORS.WHITE,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    bottomSection: {
        position: 'absolute',
        bottom: 40,
        alignItems: 'center',
    },
    bottomText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
    },
    bottomLink: {
        color: COLORS.WHITE,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
