import React, {useState} from 'react';
import {Alert, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Button from '../../../common/components/form/Button';
import authApi from '../services/authApi';

/**
 * 카카오 로그인 단독 화면 (PRD_GUEST G-008).
 *
 * 흐름:
 *  - 카카오 OAuth WebView 또는 시스템 브라우저 호출
 *  - 콜백은 BE `/kakao/auth/proc` 처리
 *
 * TODO[CONFIRM-C-7]: 실 카카오 키 발급 후 SDK(@react-native-seoul/kakao-login) 도입으로 교체.
 */
const KakaoLoginScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);

    const startKakao = async () => {
        setLoading(true);
        try {
            await authApi.openKakaoLogin();
            // openKakaoLogin 이 외부 브라우저를 열거나 WebView 를 띄움
            // 콜백 후 AuthContext가 자동으로 user 를 설정하면 navigation reset 됨
        } catch (e: any) {
            Alert.alert('카카오 로그인 실패', '잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <LinearGradient
                colors={tokens.gradient.brand}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.gradient}
            >
                <View style={styles.center}>
                    <Text style={styles.brand}>소담</Text>
                    <Text style={styles.slogan}>1초만에 시작해요</Text>
                </View>

                <View style={styles.footer}>
                    <Pressable
                        onPress={startKakao}
                        style={({pressed}) => [styles.kakaoBtn, pressed && {opacity: 0.85}]}
                    >
                        <Text style={styles.kakaoEmoji}>💬</Text>
                        <Text style={styles.kakaoText}>카카오로 시작하기</Text>
                    </Pressable>

                    <Button
                        title="이메일로 로그인"
                        onPress={() => navigation.navigate('Login')}
                        variant="ghost"
                        size="md"
                        fullWidth
                        textStyle={{color: tokens.colors.textInverse}}
                    />
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {flex: 1},
    gradient: {flex: 1, padding: tokens.spacing.lg, justifyContent: 'space-between'},
    center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    brand: {
        fontSize: 56,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textInverse,
        letterSpacing: 4,
    },
    slogan: {
        marginTop: tokens.spacing.md,
        fontSize: tokens.typography.sizes.lg,
        color: tokens.colors.textInverse,
        opacity: 0.85,
    },
    footer: {paddingBottom: tokens.spacing.lg},
    kakaoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEE500',
        paddingVertical: tokens.spacing.lg,
        borderRadius: tokens.radius.lg,
        gap: tokens.spacing.md,
        marginBottom: tokens.spacing.md,
    },
    kakaoEmoji: {fontSize: 24},
    kakaoText: {color: '#3C1E1E', fontSize: tokens.typography.sizes.md, fontWeight: '700'},
});

export default KakaoLoginScreen;
