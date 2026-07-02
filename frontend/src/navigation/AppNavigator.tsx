import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {queryKeys} from '../common/utils/queryClient';
import AuthNavigator from './AuthNavigator';
import HomeNavigator from './HomeNavigator';
import Protected from '../components/Protected';
import SodamLandingScreen from '../features/welcome/screens/SodamLandingScreen';
import UsageSelectionScreen from '../features/welcome/screens/UsageSelectionScreen';
import WelcomeMainScreen from '../features/welcome/screens/WelcomeMainScreen';
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
                queryClient.setQueryData(queryKeys.auth.currentUser(), null);
                queryClient.setQueryData(queryKeys.auth.all, false);
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
        return (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator />
            </View>
        );
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
                    name="Welcome"
                    component={UsageSelectionScreen}
                    initialParams={initialRoute.name === 'Welcome' ? initialRoute.params : undefined}
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
                <Stack.Screen name="WelcomeMain" component={WelcomeMainScreen} options={{headerShown: false}} />
                <Stack.Screen name="SessionExpired" component={SessionExpiredRoute} options={{headerShown: false}} />
                <Stack.Screen name="PermissionDenied" component={PermissionDeniedRoute} options={{title: '권한 안내'}} />
                <Stack.Screen name="PaymentFailed" component={PaymentFailedRoute} options={{title: '결제'}} />
                <Stack.Screen name="SubscriptionGate" component={SubscriptionGateRoute} options={{title: '구독'}} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
