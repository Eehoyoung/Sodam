import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import payrollService, { PayrollDetails } from '../services/payrollService';

interface RouteParams {
  payrollId?: number | null;
}

interface Props {
  route?: { params?: RouteParams };
}

const SalaryDetailScreen: React.FC<Props> = ({ route }) => {
  const payrollId = route?.params?.payrollId ?? null;

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<PayrollDetails | null>(null);

  useEffect(() => {
    if (!payrollId || typeof payrollId !== 'number' || payrollId <= 0) {
      Alert.alert('오류', '잘못된 접근입니다. 급여 ID가 필요합니다.');
      setError('INVALID_PARAM');
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await payrollService.getDetails(payrollId);
        if (!mounted) return;
        setDetails(res ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError('LOAD_ERROR');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [payrollId]);

  if (loading) {
    return (
      <View style={styles.centered} testID="salary-detail-loading">
        <ActivityIndicator />
        <Text style={styles.muted}>불러오는 중…</Text>
      </View>
    );
  }

  if (error === 'INVALID_PARAM') {
    return (
      <View style={styles.centered} testID="salary-detail-invalid">
        <Text style={styles.error}>잘못된 접근입니다.</Text>
      </View>
    );
  }

  if (error === 'LOAD_ERROR') {
    return (
      <View style={styles.centered} testID="salary-detail-error">
        <Text style={styles.error}>급여 상세를 불러오지 못했습니다.</Text>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.centered} testID="salary-detail-empty">
        <Text style={styles.muted}>표시할 데이터가 없습니다.</Text>
      </View>
    );
  }

  const items = details.items ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container} testID="salary-detail-success">
      <Text style={styles.title}>급여 상세</Text>
      <View style={styles.card}>
        <Row label="근로자" value={`${details.employeeId}`} />
        <Row label="매장" value={`${details.storeId}`} />
        {details.totalHours != null && <Row label="총 근무시간" value={`${details.totalHours}h`} />}
        {details.totalPay != null && <Row label="총 급여" value={`${details.totalPay}원`} />}
        {details.period && <Row label="기간" value={`${details.period.from} ~ ${details.period.to}`} />}
      </View>

      <Text style={styles.subtitle}>상세 항목</Text>
      {items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>상세 항목이 없습니다.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((it, idx) => (
            <View key={idx} style={styles.item}>
              <Text style={styles.itemDate}>{it.date}</Text>
              <Text style={styles.itemHours}>{it.hours}h</Text>
              <Text style={styles.itemPay}>{it.pay}원</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  card: { padding: 12, backgroundColor: '#fff', borderRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#666' },
  value: { color: '#111', fontWeight: '600' },
  muted: { color: '#777', marginTop: 8 },
  error: { color: '#c00', fontWeight: '600' },
  list: { marginTop: 8 },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  itemDate: { color: '#333', width: 120 },
  itemHours: { color: '#333', width: 60, textAlign: 'right' },
  itemPay: { color: '#333', width: 100, textAlign: 'right' },
});

export default SalaryDetailScreen;
