import React from 'react';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { COLORS } from '../common/components/logo/Colors';
import SodamHeaderTitle from '../common/components/navigation/SodamHeaderTitle';

export const appHeaderOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: COLORS.SODAM_BLUE,
  },
  headerTintColor: COLORS.WHITE,
  headerTitleAlign: 'center',
  headerBackTitleVisible: false,
  headerTitle: ({ children }: { children?: React.ReactNode }) => (
    <SodamHeaderTitle title={typeof children === 'string' ? children : (children ? String(children) : '')} />
  ),
};

export default appHeaderOptions;
