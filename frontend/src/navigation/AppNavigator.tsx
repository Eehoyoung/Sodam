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

const Stack = createNativeStackNavigator();

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
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={appHeaderOptions}
      >
        <Stack.Screen name="Welcome" component={UsageSelectionScreen} options={{ title: '소담' }} />
        {/*<Stack.Screen name="Welcome" component={EmployeeMyPageRNScreen} />*/}
        <Stack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="HomeRoot" component={HomeProtectedWrapper} options={{ headerShown: false }} />
        <Stack.Screen name="WelcomeMain" component={WelcomeMainScreen} options={{ title: '웰컴' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
