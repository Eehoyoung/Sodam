import {AppToast, AppBadge, AppButton, AppCard, AppHeader, AppListItem, AppText, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import AttendanceSummaryPanel from '../../attendance/components/AttendanceSummaryPanel';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import policyService from '../../info/services/policyService';
import laborInfoService from '../../../services/laborInfoService';
import {layout, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {HeroSlot, SummarySlot, ActionsSlot, InfoSlot} from '../components/RoleSlots';

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

/**
 * 41 EmployeeMyPage — 확정 시안.
 * 직원 마이페이지. RoleSlots/testID/load/AttendanceSummaryPanel 로직 보존.
 */
const EmployeeMyPageRNScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const [policies, setPolicies] = useState<PolicyItem[]>([]);
    const [laborInfo, setLaborInfo] = useState<LaborInfo | null>(null);

    const goToAttendance = () => navigation.navigate('Attendance');

    useEffect(() => {
        const load = async () => {
            try {
                const policyDtos: any[] = await policyService.getPoliciesByCategory('ALL');
                const mapped: PolicyItem[] = (policyDtos || []).slice(0, 3).map((dto: any) => {
                    const createdAt = dto.publishDate || dto.createdAt || new Date().toISOString();
                    const isNew = (() => {
                        try {
                            return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
                        } catch {
                            return false;
                        }
                    })();
                    return {
                        id: dto.id,
                        title: dto.title || '',
                        description: (dto.content ? String(dto.content).slice(0, 80) : '').trim(),
                        isNew,
                    } as PolicyItem;
                });
                setPolicies(mapped);

                const laborData = await laborInfoService.getCurrentLaborInfo();
                setLaborInfo({
                    minimumWage: laborData.minimumWage,
                    year: laborData.year,
                    weeklyMaxHours: laborData.weeklyMaxHours,
                    overtimeRate: laborData.overtimeRate,
                });
            } catch (e) {
                AppToast.error('정보를 불러오는 데 실패했어요.');
            }
        };
        load();
    }, []);

    const handlePolicyPress = (policy: PolicyItem) => {
        try {
            navigation.navigate('PolicyDetail', {policyId: Number(policy.id)});
        } catch (_) {/* ignore */}
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR').format(amount);

    return (
        <ScreenContainer
            padded={false}
            header={
                <AppHeader
                    title="내 정보"
                    actions={[
                        {label: '내역', onPress: goToAttendance},
                        {label: '설정', onPress: () => navigation.navigate('AccountSettings')},
                    ]}
                />
            }>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <HeroSlot testID="slotHero">
                    <AppText variant="headingMd">안녕하세요, 김알바님</AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.sub}>오늘도 수고하세요! 💪</AppText>
                </HeroSlot>

                <SummarySlot testID="slotSummary">
                    <AttendanceSummaryPanel onPressViewDetails={goToAttendance} />
                </SummarySlot>

                <ActionsSlot testID="slotActions">
                    <AppButton label="출퇴근 기록 자세히 보기" testID="btnViewAttendanceDetails" onPress={goToAttendance} />
                    {/* 매장 입사 진입점 — 신규/추가 매장 합류. 기존엔 출퇴근 화면 깊숙이 묻혀 발견 불가했음. */}
                    <AppButton
                        label="매장 입사 (코드 입력)"
                        variant="secondary"
                        testID="btnJoinStore"
                        onPress={() => navigation.navigate('JoinStoreByCode')}
                    />
                </ActionsSlot>

                <InfoSlot testID="slotInfoTransparency">
                    <AppText variant="titleMd" style={styles.sectionTitle}>내 급여·휴가</AppText>
                    <View style={styles.list}>
                        <AppListItem
                            title="내 시급 이력"
                            subtitle="현재 시급과 변경 이력을 확인할 수 있어요."
                            right="›"
                            testID="rowMyWageHistory"
                            onPress={() => navigation.navigate('MyWageHistory')}
                        />
                        <AppListItem
                            title="지난 급여명세"
                            subtitle="퇴사·세무 목적의 과거 명세서를 다시 열어봐요."
                            right="›"
                            testID="rowSalaryArchive"
                            onPress={() => navigation.navigate('SalaryArchive')}
                        />
                        <AppListItem
                            title="내 요청"
                            subtitle="정정·휴가 신청의 처리 상태를 확인해요."
                            right="›"
                            testID="rowRequestStatus"
                            onPress={() => navigation.navigate('RequestStatus')}
                        />
                        <AppListItem
                            title="내 연차"
                            subtitle="잔여 연차를 추정해서 보여드려요."
                            right="›"
                            testID="rowMyLeaveBalance"
                            onPress={() => navigation.navigate('MyLeaveBalance')}
                        />
                        <AppListItem
                            title="내 근무 일정"
                            subtitle="이번 주 내 근무 시프트를 확인할 수 있어요."
                            right="›"
                            testID="rowMyShift"
                            onPress={() => navigation.navigate('MyShift')}
                        />
                        <AppListItem
                            title="공지"
                            subtitle="매장 공지를 확인하고 읽음을 남길 수 있어요."
                            right="›"
                            testID="rowMyNotice"
                            onPress={() => navigation.navigate('MyNotice')}
                        />
                        <AppListItem
                            title="내 온보딩"
                            subtitle="계약·시급·첫 출근 진행 상태를 확인해요."
                            right="›"
                            testID="rowMyOnboarding"
                            onPress={() => navigation.navigate('Onboarding')}
                        />
                    </View>
                </InfoSlot>

                <InfoSlot testID="slotInfoContract">
                    <AppText variant="titleMd" style={styles.sectionTitle}>근로계약서</AppText>
                    <AppListItem
                        title="내 근로계약서"
                        subtitle="받은 근로계약서를 확인하고 서명할 수 있어요."
                        right="›"
                        onPress={() => navigation.navigate('MyContract')}
                    />
                </InfoSlot>

                {policies.length > 0 ? (
                    <InfoSlot testID="slotInfoPolicies">
                        <AppText variant="titleMd" style={styles.sectionTitle}>정부 지원 정책</AppText>
                        <View style={styles.list}>
                            {policies.map(p => (
                                <AppListItem
                                    key={String(p.id)}
                                    title={p.title}
                                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- blank description must become undefined (omit subtitle), so ?? would keep the empty string
                                    subtitle={p.description || undefined}
                                    right={p.isNew ? <AppBadge label="NEW" tone="info" /> : '›'}
                                    onPress={() => handlePolicyPress(p)}
                                />
                            ))}
                        </View>
                    </InfoSlot>
                ) : null}

                {laborInfo ? (
                    <InfoSlot testID="slotInfoLabor">
                        <AppText variant="titleMd" style={styles.sectionTitle}>{laborInfo.year}년 노무 정보</AppText>
                        <AppCard variant="flat">
                            <LaborRow label="최저임금" value={`${formatCurrency(laborInfo.minimumWage)}원`} />
                            <LaborRow label="주 최대 근무시간" value={`${laborInfo.weeklyMaxHours}시간`} />
                            <LaborRow label="연장근무 수당" value={`${laborInfo.overtimeRate}배`} last />
                        </AppCard>
                    </InfoSlot>
                ) : null}
            </ScrollView>
        </ScreenContainer>
    );
};

const LaborRow: React.FC<{label: string; value: string; last?: boolean}> = ({label, value, last}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.laborRow, {borderBottomColor: c.divider}, last && styles.laborRowLast]}>
            <AppText variant="caption" tone="secondary">{label}</AppText>
            <AppText variant="titleMd">{value}</AppText>
        </View>
    );
};

const styles = StyleSheet.create({
    content: {paddingHorizontal: layout.screenPaddingHorizontal, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md},
    sub: {marginTop: 2},
    sectionTitle: {marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    laborRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1},
    laborRowLast: {borderBottomWidth: 0},
});

export default EmployeeMyPageRNScreen;
