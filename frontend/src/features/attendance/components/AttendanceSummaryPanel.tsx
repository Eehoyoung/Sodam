import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { shadow } from '../../../theme/tokens';
import { useThemeColors, ThemeColors } from '../../../common/hooks/useThemeColors';
import useAttendance, { CheckMethod } from '../hooks/useAttendance';
import { requestApproval } from '../services/attendanceApprovalService';
import {getErrorMessage} from '../../../common/api/error';

interface Props {
  workplaceId?: string;
  onPressViewDetails?: () => void; // Navigate to AttendanceScreen
}

const MethodChip: React.FC<{ label: string; active: boolean; onPress: () => void; c: ThemeColors }>
  = ({ label, active, onPress, c }) => (
  <TouchableOpacity
    style={[
      styles.methodChip,
      { backgroundColor: active ? c.brandPrimary : c.surfaceMuted },
    ]}
    onPress={onPress}>
    <Text style={[styles.methodChipText, { color: active ? c.textInverse : c.textSecondary }]}>{label}</Text>
  </TouchableOpacity>
);

export const AttendanceSummaryPanel: React.FC<Props> = ({ workplaceId, onPressViewDetails }) => {
  const c = useThemeColors();
  const { method, setMethod, workplaceId: resolvedWorkplaceId, currentAttendance, loading, actions } = useAttendance({ workplaceId });

  // 근무 중 = 출근 기록 있고 아직 퇴근 안 함. (today 조회는 퇴근 후에도 기록을 주므로
  // 존재만 보면 퇴근 후에도 '근무중'·'퇴근하기' 가 남는다.)
  const isWorking = !!currentAttendance && !currentAttendance.checkOutTime;

  const onChangeMethod = (m: CheckMethod) => setMethod(m);

  // 위치/NFC 없이 사장 승인으로 출퇴근 — 요청 버튼. 누르면 사장에게 알림이 가고, 승인 시 요청 시각으로 처리된다.
  const [approvalBusy, setApprovalBusy] = React.useState(false);
  const [approvalMsg, setApprovalMsg] = React.useState<string | null>(null);
  const onRequestApproval = async () => {
    const storeIdStr = workplaceId ?? resolvedWorkplaceId;
    if (!storeIdStr) { setApprovalMsg('매장 정보가 없어요. 먼저 매장에 합류해 주세요.'); return; }
    const type = isWorking ? 'CHECK_OUT' : 'CHECK_IN';
    setApprovalBusy(true);
    setApprovalMsg(null);
    try {
      await requestApproval(Number(storeIdStr), type);
      setApprovalMsg(type === 'CHECK_IN'
        ? '출근 승인을 요청했어요. 사장님 승인 대기 중…'
        : '퇴근 승인을 요청했어요. 사장님 승인 대기 중…');
    } catch (e: unknown) {
      setApprovalMsg(getErrorMessage(e) || '요청에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setApprovalBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: c.background }, shadow.sm]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>출퇴근 요약</Text>

      <View style={styles.statusBox}>
        {isWorking && currentAttendance ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={[styles.statusLabel, { color: c.textSecondary }]}>상태</Text>
              <Text style={[styles.statusValue, { color: c.success }]}>근무중</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={[styles.statusLabel, { color: c.textSecondary }]}>출근 시간</Text>
              <Text style={[styles.statusValue, { color: c.textPrimary }]}>{new Date(currentAttendance.checkInTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </>
        ) : (
          <Text style={[styles.notWorking, { color: c.textSecondary }]}>현재 근무 중이 아닙니다</Text>
        )}
      </View>

      <View style={styles.methodRow}>
        <MethodChip label="기본" active={method==='standard'} onPress={() => onChangeMethod('standard')} c={c} />
        <MethodChip label="위치" active={method==='location'} onPress={() => onChangeMethod('location')} c={c} />
        {/* iOS는 CoreNFC 제약으로 1차 출시에서 NFC 출퇴근 제외 — GPS·사장승인 방식으로 대체 */}
        {Platform.OS !== 'ios' && (
          <MethodChip label="NFC" active={method==='nfc'} onPress={() => onChangeMethod('nfc')} c={c} />
        )}
        {/* QR(WP-C)은 두 플랫폼 모두 지원 — iOS는 NFC가 없어 GPS만 남으면 실내 오차를 감당할 수단이 없다 */}
        <MethodChip label="QR" active={method==='qr'} onPress={() => onChangeMethod('qr')} c={c} />
      </View>

      <View style={styles.actions}>
        {!isWorking ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: c.brandPrimary }, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={actions.checkIn}>
            {loading ? <ActivityIndicator color={c.textInverse}/> : <Text style={[styles.primaryBtnText, { color: c.textInverse }]}>
              {method === 'standard' && '출근하기'}
              {method === 'location' && '위치 기반 출근하기'}
              {method === 'nfc' && 'NFC로 출근하기 (상세에서 스캔)'}
              {method === 'qr' && 'QR로 출근하기 (상세에서 스캔)'}
            </Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: c.brandSecondary }, loading && styles.btnDisabled]}
            disabled={loading}
            onPress={actions.checkOut}>
            {loading ? <ActivityIndicator color={c.textInverse}/> : <Text style={[styles.secondaryBtnText, { color: c.textInverse }]}>
              {method === 'standard' && '퇴근하기'}
              {method === 'location' && '위치 기반 퇴근하기'}
              {method === 'nfc' && 'NFC로 퇴근하기 (상세에서 스캔)'}
              {method === 'qr' && 'QR로 퇴근하기 (상세에서 스캔)'}
            </Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.approvalBtn, { borderColor: c.brandSecondary }, approvalBusy && styles.btnDisabled]}
          disabled={approvalBusy}
          onPress={onRequestApproval}>
          {approvalBusy ? <ActivityIndicator color={c.brandSecondary}/> : (
            <Text style={[styles.approvalBtnText, { color: c.brandSecondary }]}>
              {isWorking ? '사장님 승인으로 퇴근 요청' : '사장님 승인으로 출근 요청'}
            </Text>
          )}
        </TouchableOpacity>
        {approvalMsg ? <Text style={[styles.approvalMsg, { color: c.textSecondary }]}>{approvalMsg}</Text> : null}

        <TouchableOpacity style={styles.linkBtn} onPress={onPressViewDetails}>
          <Text style={[styles.linkText, { color: c.brandSecondary }]}>자세히 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
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
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  notWorking: {
    fontSize: 14,
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
  },
  methodChipText: {
    fontWeight: '500',
  },
  actions: {
    marginTop: 8,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  approvalBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  approvalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  approvalMsg: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
  },
  linkBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.7,
  }
});

export default AttendanceSummaryPanel;
