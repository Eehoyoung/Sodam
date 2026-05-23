import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../../../navigation/types';

const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<RootNavigationProp>();

  const handleLogout = async () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: async () => {
          try {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          } catch (e) {
            Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
          }
        } },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>설정</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정</Text>
          <Text style={styles.item}>
              이름: <Text style={styles.bold}>{user?.name ?? '-'}</Text>
          </Text>
          <Text style={styles.item}>
              이메일: <Text style={styles.bold}>{user?.email ?? '-'}</Text>
          </Text>
          <Text style={styles.item}>
              역할: <Text style={styles.bold}>
              {user?.role ?? '-'}
          </Text>
          </Text>
      </View>

      <View style={{ height: 16 }} />
      <Button title="프로필 보기" onPress={() => (navigation as any).navigate('Profile')} />
      <View style={{ height: 12 }} />
      <Button color="#ef4444" title="로그아웃" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  section: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  item: { marginBottom: 6 },
  bold: { fontWeight: '700' },
});

export default SettingsScreen;
