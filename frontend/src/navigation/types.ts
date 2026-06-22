import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AuthPurpose, OnboardingRole} from './authFlow';
// HomeStackParamList 는 HomeNavigator(실 네비게이터에 배선된 정의)를 단일 출처로 재노출한다.
// 과거 이 파일에 있던 부분 복제본은 실 정의와 어긋나 라우트 누락/타입 구멍을 만들었음 → 제거.
import type {HomeStackParamList} from './HomeNavigator';

export type {HomeStackParamList};

export type RootStackParamList = {
    Welcome: {selectedRole?: OnboardingRole; selectedPurpose?: AuthPurpose} | undefined;
    WelcomeMain: {selectedRole?: OnboardingRole; selectedPurpose?: AuthPurpose} | undefined;
    Auth: {screen?: keyof AuthStackParamList; params?: AuthStackParamList[keyof AuthStackParamList]};
    HomeRoot: {screen?: keyof HomeStackParamList; params?: any} | undefined;
    SessionExpired: undefined;
    PermissionDenied: {kind?: string; secondaryLabel?: string} | undefined;
    PaymentFailed: undefined;
    SubscriptionGate: {mode?: string; featureName?: string} | undefined;
};

export type AuthStackParamList = {
    Login: {selectedPurpose?: AuthPurpose; fromSignup?: boolean} | undefined;
    Signup: {selectedPurpose?: AuthPurpose} | undefined;
    PasswordReset: undefined;
    OnboardingCarousel: undefined;
    KakaoLogin: {selectedPurpose?: AuthPurpose} | undefined;
    Consent: {selectedPurpose?: AuthPurpose} | undefined;
    ProfileBasics: {selectedPurpose?: AuthPurpose} | undefined;
};

export type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
export type SignupScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
export type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
