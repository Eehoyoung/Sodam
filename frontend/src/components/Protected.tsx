import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';

interface Props {
  children: React.ReactNode;
}

const Protected: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigation = useNavigation<RootNavigationProp>();

  useEffect(() => {
    if (!loading && !user) {
      // 인증이 없으면 Auth 스택으로 이동
      navigation.navigate('Auth', { screen: 'Login' });
    }
  }, [loading, user, navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) return null;

  return <>{children}</>;
};

export default Protected;
