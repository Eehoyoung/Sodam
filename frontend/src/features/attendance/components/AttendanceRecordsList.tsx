import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../../common/components/logo/Colors';
import { AttendanceRecord, AttendanceStatus } from '../types';

interface Props {
  records: AttendanceRecord[];
  emptyText?: string;
}

const statusLabel = (status: AttendanceStatus) => {
  switch (status) {
    case AttendanceStatus.PENDING: return '출근 전';
    case AttendanceStatus.CHECKED_IN: return '출근';
    case AttendanceStatus.CHECKED_OUT: return '퇴근';
    case AttendanceStatus.LATE: return '지각';
    case AttendanceStatus.ABSENT: return '결근';
    case AttendanceStatus.EARLY_LEAVE: return '조퇴';
    case AttendanceStatus.ON_LEAVE: return '휴가';
    default: return '알 수 없음';
  }
};

export const AttendanceRecordsList: React.FC<Props> = ({ records, emptyText = '출퇴근 기록이 없습니다.' }) => {
  if (!records?.length) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <View style={styles.rowBetween}>
            <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('ko-KR')}</Text>
            <Text style={styles.badge}>{statusLabel(item.status)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.meta}>출근 {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
            <Text style={styles.meta}>퇴근 {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</Text>
            <Text style={styles.meta}>근무 {item.workHours ?? '-'}시간</Text>
          </View>
          <Text style={styles.place}>{item.workplaceName}</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  emptyBox: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.GRAY_500,
  },
  listContainer: {
    paddingHorizontal: 4,
  },
  item: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateText: {
    color: COLORS.GRAY_800,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: COLORS.GRAY_100,
    color: COLORS.GRAY_700,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  meta: {
    color: COLORS.GRAY_600,
    fontSize: 12,
  },
  place: {
    color: COLORS.GRAY_600,
    fontSize: 12,
  },
});

export default AttendanceRecordsList;
