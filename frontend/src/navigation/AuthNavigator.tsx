import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList, RootNavigationProp } from './types';
import LoginScreen from '../features/auth/screens/LoginScreen';
import SignupScreen from '../features/auth/screens/SignupScreen';
import PasswordResetScreen from '../features/auth/screens/PasswordResetScreen';
import OnboardingCarouselScreen from '../features/welcome/screens/OnboardingCarouselScreen';
import KakaoLoginScreen from '../features/auth/screens/KakaoLoginScreen';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import appHeaderOptions from './appHeaderOptions';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<RootNavigationProp>();

  useEffect(() => {
    if (user) {
      // 이미 로그인된 사용자는 Auth 스택으로 돌아갈 수 없도록 루트 리셋
      navigation.reset({ index: 0, routes: [{ name: 'HomeRoot' as never }] as any });
    }
  }, [user, navigation]);

  return (
    <Stack.Navigator screenOptions={appHeaderOptions}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: '회원가입' }} />
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} options={{ title: '비밀번호 찾기' }} />
      <Stack.Screen name="OnboardingCarousel" component={OnboardingCarouselScreen} options={{ headerShown: false }} />
      <Stack.Screen name="KakaoLogin" component={KakaoLoginScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
