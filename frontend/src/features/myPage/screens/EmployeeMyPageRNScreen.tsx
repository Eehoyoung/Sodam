import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { COLORS } from '../../../common/components/logo/Colors';
import AttendanceSummaryPanel from '../../attendance/components/AttendanceSummaryPanel';
import type { HomeStackParamList } from '../../../navigation/HomeNavigator';
import policyService from '../../info/services/policyService';
import laborInfoService from '../../../services/laborInfoService';
import SectionCard from '../../../common/components/sections/SectionCard';
import SectionHeader from '../../../common/components/sections/SectionHeader';
import PrimaryButton from '../../../common/components/buttons/PrimaryButton';
import { HeroSlot, SummarySlot, ActionsSlot, InfoSlot } from '../components/RoleSlots';

interface PolicyItem {
  id: number | string;
  title: string;
  deadline?: string;
  description?: string;
  isNew?: boolean;
}

interface LaborInfo {
  minimumWage: number;
  year: number;
  weeklyMaxHours: number;
  overtimeRate: number;
}

const EmployeeMyPageRNScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [laborInfo, setLaborInfo] = useState<LaborInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const goToAttendance = () => {
    navigation.navigate('Attendance');
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const policyDtos: any[] = await policyService.getPoliciesByCategory('ALL');
        const mapped: PolicyItem[] = (policyDtos || []).slice(0, 3).map((dto: any) => {
          const createdAt = dto.publishDate || dto.createdAt || new Date().toISOString();
          const isNew = (() => {
            try { return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000; } catch { return false; }
          })();
          return {
            id: dto.id,
            title: dto.title || '',
            description: (dto.content ? String(dto.content).slice(0, 80) : '').trim(),
            isNew,
          } as PolicyItem;
        });
        setPolicies(mapped);

        // LaborInfo API 호출
        const laborData = await laborInfoService.getCurrentLaborInfo();
        const laborInfo: LaborInfo = {
          minimumWage: laborData.minimumWage,
          year: laborData.year,
          weeklyMaxHours: laborData.weeklyMaxHours,
          overtimeRate: laborData.overtimeRate,
        };
        setLaborInfo(laborInfo);
      } catch (e) {
        Alert.alert('오류', '정보를 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handlePolicyPress = (policy: PolicyItem) => {
    // 정책 상세로 이동 (정책 ID가 숫자일 경우 문자열 변환)
    try {
      navigation.navigate('PolicyDetail', { policyId: Number(policy.id) });
    } catch (_) {
      // 안전 장치: 네비게이션 라우트가 없을 경우 무시
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR').format(amount);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <HeroSlot testID="slotHero">
        <View style={styles.header}>
          <Text style={styles.greeting}>안녕하세요, 김알바님</Text>
          <Text style={styles.subGreeting}>오늘도 수고하세요! 💪</Text>
        </View>
        </HeroSlot>

        {/* 출퇴근 요약 패널 */}
        <SummarySlot testID="slotSummary">
        <View style={styles.section}>
          <AttendanceSummaryPanel onPressViewDetails={goToAttendance} />
        </View>
        </SummarySlot>

        {/* 빠른 액션 */}
        <ActionsSlot testID="slotActions">
        <View style={styles.section}>
          <PrimaryButton
            title="출퇴근 기록 자세히 보기"
            onPress={goToAttendance}
            testID="btnViewAttendanceDetails"
            accessibilityLabel="출퇴근 기록 자세히 보기"
          />
        </View>
        </ActionsSlot>

        {/* 정부 정책 정보 */}
        {policies.length > 0 && (
          <InfoSlot testID="slotInfoPolicies">
          <View style={styles.section}>
            <SectionCard>
              <SectionHeader title="정부 지원 정책" />
              <View>
                {policies.map(p => (
                  <TouchableOpacity key={String(p.id)} style={styles.policyCard} onPress={() => handlePolicyPress(p)}>
                    <Text style={styles.policyTitle} numberOfLines={1}>{p.title}</Text>
                    {!!p.description && <Text style={styles.policyDesc} numberOfLines={2}>{p.description}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </SectionCard>
          </View>
          </InfoSlot>
        )}

        {/* 노무 핵심 정보 */}
        {laborInfo && (
          <InfoSlot testID="slotInfoLabor">
          <View style={styles.section}>
            <SectionCard>
              <SectionHeader title={`${laborInfo.year}년 노무 정보`} />
              <View style={styles.laborCard}>
              <View style={styles.laborRow}>
                <Text style={styles.laborLabel}>최저임금</Text>
                <Text style={styles.laborValue}>{formatCurrency(laborInfo.minimumWage)}원</Text>
              </View>
              <View style={styles.laborRow}>
                <Text style={styles.laborLabel}>주 최대 근무시간</Text>
                <Text style={styles.laborValue}>{laborInfo.weeklyMaxHours}시간</Text>
              </View>
              <View style={styles.laborRow}>
                <Text style={styles.laborLabel}>연장근무 수당</Text>
                <Text style={styles.laborValue}>{laborInfo.overtimeRate}배</Text>
              </View>
            </View>
            </SectionCard>
          </View>
          </InfoSlot>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.GRAY_50,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.GRAY_800,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.GRAY_600,
  },
  section: {
    marginBottom: 16,
  },
  quickBtn: {
    backgroundColor: COLORS.SODAM_BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickBtnText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.GRAY_800,
  },
  policyCard: {
    backgroundColor: COLORS.WHITE,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.GRAY_800,
    marginBottom: 6,
  },
  policyDesc: {
    fontSize: 13,
    color: COLORS.GRAY_600,
    lineHeight: 18,
  },
  laborCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  laborRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_100,
  },
  laborLabel: {
    fontSize: 13,
    color: COLORS.GRAY_600,
  },
  laborValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.GRAY_800,
  },
  bottomSpacing: {
    height: 28,
  },
});

export default EmployeeMyPageRNScreen;
