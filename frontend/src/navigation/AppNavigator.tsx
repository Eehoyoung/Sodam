import React from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {authQueryKeys} from '../common/auth/queryKeys';
import AuthNavigator from './AuthNavigator';
import HomeNavigator from './HomeNavigator';
import Protected from '../components/Protected';
import SodamLandingScreen from '../features/welcome/screens/SodamLandingScreen';
import SplashScreen from '../features/welcome/screens/SplashScreen';
import appHeaderOptions from './appHeaderOptions';
import {navigationRef} from './navigationRef';
import {RootStackParamList} from './types';
import {resolveInitialRootRoute} from './authFlow';
import {useAuth} from '../contexts/AuthContext';
import {
    SessionExpiredScreen,
    PermissionDeniedScreen,
    PaymentFailedScreen,
    SubscriptionGateScreen,
} from '../features/system/screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

const SessionExpiredRoute: React.FC<any> = ({navigation}) => {
    const queryClient = useQueryClient();
    return (
        <SessionExpiredScreen
            onRelogin={() => {
                // 인증 캐시를 비운 뒤 Login 으로 reset 한다. 안 비우면 stale 한 user 때문에
                // AuthNavigator 가 곧장 홈으로 되튕긴다(= 사용자 신고 라우팅 결함).
                queryClient.setQueryData(authQueryKeys.currentUser(), null);
                queryClient.setQueryData(authQueryKeys.all, false);
                navigation.reset({index: 0, routes: [{name: 'Auth', params: {screen: 'Login'}}]});
            }}
            onSupport={() => navigation.navigate('HomeRoot', {screen: 'QnA'})}
        />
    );
};

const PermissionDeniedRoute: React.FC<any> = ({navigation, route}) => (
    <PermissionDeniedScreen
        kind={route?.params?.kind ?? 'location'}
        onSecondary={() => navigation.goBack()}
        secondaryLabel={route?.params?.secondaryLabel}
    />
);

const PaymentFailedRoute: React.FC<any> = ({navigation}) => (
    <PaymentFailedScreen
        onRetry={() => navigation.goBack()}
        onChangeMethod={() => navigation.goBack()}
        onSupport={() => navigation.navigate('HomeRoot', {screen: 'QnA'})}
    />
);

const SubscriptionGateRoute: React.FC<any> = ({navigation, route}) => (
    <SubscriptionGateScreen
        mode={route?.params?.mode ?? 'gate'}
        featureName={route?.params?.featureName}
        onPrimary={() => navigation.navigate('HomeRoot', {screen: 'Subscribe'})}
        onSecondary={() => navigation.goBack()}
    />
);

interface Props {
    appReady?: boolean;
}

const HomeProtectedWrapper: React.FC<any> = ({route}) => (
    <Protected>
        <HomeNavigator initialScreen={route?.params?.screen} />
    </Protected>
);

const AppNavigator: React.FC<Props> = ({appReady = true}) => {
    const {user, isAuthenticated, loading} = useAuth();
    const initialRoute = resolveInitialRootRoute(user, isAuthenticated);

    if (!appReady || loading) {
        // v3 "링 & 패스"(docs/260720) — 부트 스피너 대신 브랜드 스플래시(이미 구현되어 있었으나
        // 어느 네비게이터에도 연결되지 않았던 컴포넌트, WP-02). onReady 콜백 없이 표시만 담당하고,
        // 실제 화면 전환은 이 조건(appReady/loading)이 바뀌면서 그대로 처리된다 — 라우팅 로직 불변.
        return <SplashScreen />;
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                initialRouteName={initialRoute.name}
                screenOptions={appHeaderOptions}>
                <Stack.Screen
                    name="SodamLanding"
                    component={SodamLandingScreen}
                    initialParams={initialRoute.name === 'SodamLanding' ? initialRoute.params : undefined}
                    options={{headerShown: false}}
                />
                <Stack.Screen
                    name="Auth"
                    component={AuthNavigator}
                    initialParams={initialRoute.name === 'Auth' ? initialRoute.params : undefined}
                    options={{headerShown: false}}
                />
                <Stack.Screen
                    name="HomeRoot"
                    component={HomeProtectedWrapper}
                    initialParams={initialRoute.name === 'HomeRoot' ? initialRoute.params : undefined}
                    options={{headerShown: false}}
                />
                <Stack.Screen name="SessionExpired" component={SessionExpiredRoute} options={{headerShown: false}} />
                <Stack.Screen name="PermissionDenied" component={PermissionDeniedRoute} options={{title: '권한 안내'}} />
                <Stack.Screen name="PaymentFailed" component={PaymentFailedRoute} options={{title: '결제'}} />
                <Stack.Screen name="SubscriptionGate" component={SubscriptionGateRoute} options={{title: '구독'}} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
