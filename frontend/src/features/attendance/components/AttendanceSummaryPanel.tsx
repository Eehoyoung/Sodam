import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../../common/components/logo/Colors';
import useAttendance, { CheckMethod } from '../hooks/useAttendance';

interface Props {
  workplaceId?: string;
  onPressViewDetails?: () => void; // Navigate to AttendanceScreen
}

const MethodChip: React.FC<{ label: string; active: boolean; onPress: () => void }>
  = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.methodChip, active && styles.methodChipActive]} onPress={onPress}>
    <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export const AttendanceSummaryPanel: React.FC<Props> = ({ workplaceId, onPressViewDetails }) => {
  const { method, setMethod, currentAttendance, loading, actions } = useAttendance({ workplaceId });

  const onChangeMethod = (m: CheckMethod) => setMethod(m);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>출퇴근 요약</Text>

      <View style={styles.statusBox}>
        {currentAttendance ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.statusLabel}>상태</Text>
              <Text style={[styles.statusValue, { color: COLORS.SUCCESS }]}>근무중</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.statusLabel}>출근 시간</Text>
              <Text style={styles.statusValue}>{new Date(currentAttendance.checkInTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.notWorking}>현재 근무 중이 아닙니다</Text>
        )}
      </View>

      <View style={styles.methodRow}>
        <MethodChip label="기본" active={method==='standard'} onPress={() => onChangeMethod('standard')} />
        <MethodChip label="위치" active={method==='location'} onPress={() => onChangeMethod('location')} />
        <MethodChip label="NFC" active={method==='nfc'} onPress={() => onChangeMethod('nfc')} />
      </View>

      <View style={styles.actions}>
        {!currentAttendance ? (
          <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} disabled={loading} onPress={actions.checkIn}>
            {loading ? <ActivityIndicator color={COLORS.WHITE}/> : <Text style={styles.primaryBtnText}>
              {method === 'standard' && '출근하기'}
              {method === 'location' && '위치 기반 출근하기'}
              {method === 'nfc' && 'NFC로 출근하기 (상세에서 스캔)'}
            </Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.secondaryBtn, loading && styles.btnDisabled]} disabled={loading} onPress={actions.checkOut}>
            {loading ? <ActivityIndicator color={COLORS.WHITE}/> : <Text style={styles.secondaryBtnText}>
              {method === 'standard' && '퇴근하기'}
              {method === 'location' && '위치 기반 퇴근하기'}
              {method === 'nfc' && 'NFC로 퇴근하기 (상세에서 스캔)'}
            </Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.linkBtn} onPress={onPressViewDetails}>
          <Text style={styles.linkText}>자세히 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.GRAY_800,
    marginBottom: 12,
  },
  statusBox: {
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.GRAY_600,
  },
  statusValue: {
    fontSize: 14,
    color: COLORS.GRAY_800,
    fontWeight: '600',
  },
  notWorking: {
    fontSize: 14,
    color: COLORS.GRAY_600,
    fontStyle: 'italic',
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  methodChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: COLORS.GRAY_100,
  },
  methodChipActive: {
    backgroundColor: COLORS.SODAM_ORANGE,
  },
  methodChipText: {
    color: COLORS.GRAY_600,
    fontWeight: '500',
  },
  methodChipTextActive: {
    color: COLORS.WHITE,
  },
  actions: {
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.SODAM_ORANGE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: COLORS.SODAM_BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  linkBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.SODAM_BLUE,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.7,
  }
});

export default AttendanceSummaryPanel;
