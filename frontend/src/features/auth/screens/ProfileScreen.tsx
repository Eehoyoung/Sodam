import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button, Alert } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useCurrentUser } from '../hooks/useAuthQueries';

const ProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const currentUserQuery = useCurrentUser();

  const displayedUser = user ?? currentUserQuery.data ?? null;
  const loading = currentUserQuery.isLoading;

  const handleRefresh = async () => {
    try {
      await currentUserQuery.refetch();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.message || '프로필을 새로고침하는 중 오류가 발생했습니다.');
    }
  };

  if (loading && !displayedUser) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>프로필 불러오는 중...</Text>
      </View>
    );
  }

  if (!displayedUser) {
    return (
      <View style={styles.center}>
        <Text>로그인이 필요합니다.</Text>
      </View>
    );
  }

  const roles = displayedUser.role ?? '-';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 프로필</Text>
      <View style={styles.row}><Text style={styles.label}>ID</Text><Text style={styles.value}>{String(displayedUser.id)}</Text></View>
      <View style={styles.row}><Text style={styles.label}>이름</Text><Text style={styles.value}>{displayedUser.name || '-'}</Text></View>
      <View style={styles.row}><Text style={styles.label}>이메일</Text><Text style={styles.value}>{displayedUser.email || '-'}</Text></View>
      <View style={styles.row}><Text style={styles.label}>역할</Text><Text style={styles.value}>{roles}</Text></View>

      <View style={{ height: 16 }} />
      <Button title={currentUserQuery.isFetching ? '새로고침 중...' : '새로고침'} onPress={handleRefresh} disabled={currentUserQuery.isFetching} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  label: { width: 80, color: '#64748B' },
  value: { flex: 1, fontWeight: '600' },
});

export default ProfileScreen;
