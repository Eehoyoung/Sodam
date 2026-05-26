import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import HomeNavigator from './HomeNavigator';
import Protected from '../components/Protected';
import UsageSelectionScreen from "../features/welcome/screens/UsageSelectionScreen.tsx";
import WelcomeMainScreen from "../features/welcome/screens/WelcomeMainScreen.tsx";
import PersonalUserScreen from "../features/myPage/screens/PersonalUserScreen.tsx";
import MasterMyPageScreen from "../features/myPage/screens/MasterMyPageScreen.tsx";
import EmployeeMyPageRNScreen from "../features/myPage/screens/EmployeeMyPageRNScreen.tsx";
import appHeaderOptions from './appHeaderOptions';
import {navigationRef} from './navigationRef';
import {
    SessionExpiredScreen,
    PermissionDeniedScreen,
    PaymentFailedScreen,
    SubscriptionGateScreen,
} from '../features/system/screens';

const Stack = createNativeStackNavigator();

// 시스템 상태 화면 래퍼 — 라우트 파라미터/네비게이션을 컴포넌트 콜백으로 연결 (갭분석 P0)
const SessionExpiredRoute: React.FC<any> = ({navigation}) => (
    <SessionExpiredScreen
        onRelogin={() => navigation.reset({index: 0, routes: [{name: 'Auth'}]})}
        onSupport={() => navigation.navigate('HomeRoot', {screen: 'QnA'})}
    />
);
const PermissionDeniedRoute: React.FC<any> = ({navigation, route}) => (
    <PermissionDeniedScreen kind={route?.params?.kind ?? 'location'} onSecondary={() => navigation.goBack()} secondaryLabel={route?.params?.secondaryLabel} />
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

// Accept route params to forward initial screen into HomeNavigator
const HomeProtectedWrapper: React.FC<any> = ({ route }) => (
  <Protected>
    <HomeNavigator initialScreen={route?.params?.screen} />
  </Protected>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AppNavigator: React.FC<Props> = ({ appReady = true }) => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={appHeaderOptions}
      >
        <Stack.Screen name="Welcome" component={UsageSelectionScreen} options={{ title: '소담' }} />
        {/*<Stack.Screen name="Welcome" component={EmployeeMyPageRNScreen} />*/}
        <Stack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="HomeRoot" component={HomeProtectedWrapper} options={{ headerShown: false }} />
        <Stack.Screen name="WelcomeMain" component={WelcomeMainScreen} options={{ title: '웰컴' }} />
        {/* 시스템 상태 화면 (갭분석 P0) — 코드에서 navigate 로 진입 */}
        <Stack.Screen name="SessionExpired" component={SessionExpiredRoute} options={{ headerShown: false }} />
        <Stack.Screen name="PermissionDenied" component={PermissionDeniedRoute} options={{ title: '권한 안내' }} />
        <Stack.Screen name="PaymentFailed" component={PaymentFailedRoute} options={{ title: '결제' }} />
        <Stack.Screen name="SubscriptionGate" component={SubscriptionGateRoute} options={{ title: '구독' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
