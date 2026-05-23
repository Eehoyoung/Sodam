import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../../common/components/logo/Colors';
import type { HomeStackParamList } from '../../../navigation/HomeNavigator';
import SectionCard from '../../../common/components/sections/SectionCard';
import SectionHeader from '../../../common/components/sections/SectionHeader';
import PrimaryButton from '../../../common/components/buttons/PrimaryButton';
import { HeroSlot, SummarySlot, ActionsSlot, InfoSlot } from '../components/RoleSlots';

/**
 * Manager(매니저) 역할 전용 마이페이지
 * - 담당 매장의 팀원 관리
 * - 출퇴근 기록 승인
 * - 매장 운영 현황 요약
 */

interface TeamMember {
  id: number;
  name: string;
  position: string;
  todayStatus: 'working' | 'off' | 'pending';
}

interface PendingApproval {
  id: number;
  employeeName: string;
  type: 'check-in' | 'check-out' | 'manual';
  timestamp: string;
}

const ManagerMyPageScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [storeInfo, setStoreInfo] = useState({
    storeName: '소담 카페 강남점',
    todayAttendance: 6,
    totalEmployees: 8,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadManagerData();
  }, []);

  const loadManagerData = async () => {
    setIsLoading(true);
    try {
      // Mock 데이터 - 실제로는 API 호출
      const mockTeam: TeamMember[] = [
        { id: 1, name: '김알바', position: '파트타임', todayStatus: 'working' },
        { id: 2, name: '이직원', position: '파트타임', todayStatus: 'working' },
        { id: 3, name: '박사원', position: '파트타임', todayStatus: 'off' },
        { id: 4, name: '최근무', position: '파트타임', todayStatus: 'pending' },
      ];
      setTeamMembers(mockTeam);

      const mockPending: PendingApproval[] = [
        { id: 1, employeeName: '최근무', type: 'check-in', timestamp: '2025-10-12T09:05:00' },
      ];
      setPendingApprovals(mockPending);
    } catch (error) {
      console.error('Manager 데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = (approvalId: number) => {
    Alert.alert(
      '승인 확인',
      '이 출퇴근 기록을 승인하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '승인',
          onPress: () => {
            // 실제로는 API 호출
            setPendingApprovals(prev => prev.filter(item => item.id !== approvalId));
            Alert.alert('완료', '출퇴근 기록이 승인되었습니다.');
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: TeamMember['todayStatus']) => {
    switch (status) {
      case 'working':
        return { label: '근무중', color: COLORS.SUCCESS };
      case 'off':
        return { label: '퇴근', color: COLORS.GRAY_600 };
      case 'pending':
        return { label: '승인대기', color: COLORS.WARNING };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <HeroSlot testID="slotHero">
          <View style={styles.header}>
            <Text style={styles.greeting}>안녕하세요, 김매니저님</Text>
            <Text style={styles.subGreeting}>{storeInfo.storeName} 관리자</Text>
          </View>
        </HeroSlot>

        {/* 매장 요약 */}
        <SummarySlot testID="slotSummary">
          <LinearGradient
            colors={[COLORS.SODAM_BLUE, COLORS.SODAM_GREEN]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="people-outline" size={24} color="#FFFFFF" />
                <Text style={styles.summaryLabel}>오늘 출근</Text>
                <Text style={styles.summaryValue}>{storeInfo.todayAttendance}명</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="person-outline" size={24} color="#FFFFFF" />
                <Text style={styles.summaryLabel}>전체 팀원</Text>
                <Text style={styles.summaryValue}>{storeInfo.totalEmployees}명</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" />
                <Text style={styles.summaryLabel}>승인 대기</Text>
                <Text style={styles.summaryValue}>{pendingApprovals.length}건</Text>
              </View>
            </View>
          </LinearGradient>
        </SummarySlot>

        {/* 승인 대기 목록 */}
        {pendingApprovals.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="승인 대기 중" />
            <SectionCard>
              {pendingApprovals.map(approval => (
                <TouchableOpacity
                  key={approval.id}
                  style={styles.approvalItem}
                  onPress={() => handleApproval(approval.id)}
                >
                  <View style={styles.approvalInfo}>
                    <Text style={styles.approvalName}>{approval.employeeName}</Text>
                    <Text style={styles.approvalType}>
                      {approval.type === 'check-in' ? '출근' : approval.type === 'check-out' ? '퇴근' : '수동 기록'}
                    </Text>
                    <Text style={styles.approvalTime}>
                      {new Date(approval.timestamp).toLocaleString('ko-KR')}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle-outline" size={28} color={COLORS.SUCCESS} />
                </TouchableOpacity>
              ))}
            </SectionCard>
          </View>
        )}

        {/* 팀원 목록 */}
        <View style={styles.section}>
          <SectionHeader title="팀원 현황" />
          <SectionCard>
            {teamMembers.map(member => {
              const statusBadge = getStatusBadge(member.todayStatus);
              return (
                <View key={member.id} style={styles.teamMemberItem}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberPosition}>{member.position}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
                    <Text style={styles.statusText}>{statusBadge.label}</Text>
                  </View>
                </View>
              );
            })}
          </SectionCard>
        </View>

        {/* 빠른 액션 */}
        <ActionsSlot testID="slotActions">
          <View style={styles.section}>
            <PrimaryButton
              title="출퇴근 기록 관리"
              onPress={() => navigation.navigate('Attendance')}
              testID="btnManageAttendance"
            />
          </View>
        </ActionsSlot>

        {/* 정보 슬롯 */}
        <InfoSlot testID="slotInfo">
          <View style={styles.section}>
            <SectionHeader title="관리자 안내" />
            <SectionCard>
              <Text style={styles.infoText}>
                • 팀원의 출퇴근 기록을 승인하거나 수정할 수 있습니다.{'\n'}
                • 매장 운영 현황을 실시간으로 확인하세요.{'\n'}
                • 문제가 있을 경우 사장님께 보고해주세요.
              </Text>
            </SectionCard>
          </View>
        </InfoSlot>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.GRAY_900,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: COLORS.GRAY_600,
  },
  summaryCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.9,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  approvalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  approvalInfo: {
    flex: 1,
  },
  approvalName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY_900,
    marginBottom: 4,
  },
  approvalType: {
    fontSize: 14,
    color: COLORS.GRAY_600,
    marginBottom: 2,
  },
  approvalTime: {
    fontSize: 12,
    color: COLORS.GRAY_600,
  },
  teamMemberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY_900,
    marginBottom: 4,
  },
  memberPosition: {
    fontSize: 14,
    color: COLORS.GRAY_600,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.GRAY_600,
    lineHeight: 22,
  },
});

export default ManagerMyPageScreen;
