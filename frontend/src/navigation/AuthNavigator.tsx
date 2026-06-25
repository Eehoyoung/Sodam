import React, {useEffect} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {AuthStackParamList, RootNavigationProp, RootStackParamList} from './types';
import LoginScreen from '../features/auth/screens/LoginScreen';
import SignupScreen from '../features/auth/screens/SignupScreen';
import PasswordResetScreen from '../features/auth/screens/PasswordResetScreen';
import OnboardingCarouselScreen from '../features/welcome/screens/OnboardingCarouselScreen';
import KakaoLoginScreen from '../features/auth/screens/KakaoLoginScreen';
import ConsentScreen from '../features/auth/screens/ConsentScreen';
import ProfileBasicsScreen from '../features/auth/screens/ProfileBasicsScreen';
import {useAuth} from '../contexts/AuthContext';
import appHeaderOptions from './appHeaderOptions';
import {resolvePostAuthRoute, resetToRootRoute, type AuthGateParams} from './authFlow';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
    const {user} = useAuth();
    const navigation = useNavigation<RootNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'Auth'>>();
    const initialScreen = route.params?.screen ?? 'Login';
    const nestedParams = route.params?.params as AuthGateParams | undefined;

    useEffect(() => {
        if (!user) {
            return;
        }
        resetToRootRoute(navigation, resolvePostAuthRoute(user, nestedParams?.selectedPurpose));
    }, [user, navigation, nestedParams?.selectedPurpose]);

    return (
        <Stack.Navigator initialRouteName={initialScreen} screenOptions={appHeaderOptions}>
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                initialParams={route.params?.screen === 'Login' ? nestedParams : undefined}
                options={{title: '로그인'}}
            />
            <Stack.Screen
                name="Signup"
                component={SignupScreen}
                initialParams={route.params?.screen === 'Signup' ? nestedParams : undefined}
                options={{title: '회원가입'}}
            />
            <Stack.Screen name="PasswordReset" component={PasswordResetScreen} options={{title: '비밀번호 찾기'}} />
            <Stack.Screen name="OnboardingCarousel" component={OnboardingCarouselScreen} options={{headerShown: false}} />
            <Stack.Screen
                name="KakaoLogin"
                component={KakaoLoginScreen}
                initialParams={route.params?.screen === 'KakaoLogin' ? nestedParams : undefined}
                options={{headerShown: false}}
            />
            <Stack.Screen
                name="Consent"
                component={ConsentScreen}
                initialParams={route.params?.screen === 'Consent' ? nestedParams : undefined}
                options={{title: '약관 동의', headerBackVisible: false, gestureEnabled: false}}
            />
            <Stack.Screen
                name="ProfileBasics"
                component={ProfileBasicsScreen}
                initialParams={route.params?.screen === 'ProfileBasics' ? nestedParams : undefined}
                // 화면이 자체 AppHeader("기본 정보")를 렌더 → 네비 헤더 끄기(이중 헤더·레이아웃 측정 충돌 제거)
                options={{headerShown: false, gestureEnabled: false}}
            />
        </Stack.Navigator>
    );
};

export default AuthNavigator;
