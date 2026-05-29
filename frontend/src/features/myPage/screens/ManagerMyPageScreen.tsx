import {AppToast, ConfirmSheet} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    ScreenContainer,
} from '../../../common/components/ds';
import {layout, spacing} from '../../../theme/tokens';
import {HeroSlot, SummarySlot, ActionsSlot, InfoSlot} from '../components/RoleSlots';

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

/**
 * 46 ManagerHome — 확정 시안.
 * 매니저 마이페이지. RoleSlots/testID/데이터·승인 로직 보존.
 */
const ManagerMyPageScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
    const [storeInfo] = useState({storeName: '소담 카페 강남점', todayAttendance: 6, totalEmployees: 8});

    useEffect(() => {
        loadManagerData();
    }, []);

    const loadManagerData = async () => {
        try {
            setTeamMembers([
                {id: 1, name: '김알바', position: '파트타임', todayStatus: 'working'},
                {id: 2, name: '이직원', position: '파트타임', todayStatus: 'working'},
                {id: 3, name: '박사원', position: '파트타임', todayStatus: 'off'},
                {id: 4, name: '최근무', position: '파트타임', todayStatus: 'pending'},
            ]);
            setPendingApprovals([{id: 1, employeeName: '최근무', type: 'check-in', timestamp: '2025-10-12T09:05:00'}]);
        } catch (error) {
            AppToast.error('데이터를 불러오는데 실패했어요.');
        }
    };

    const handleApproval = (approvalId: number) => {
        ConfirmSheet.confirm({
            title: '이 출퇴근 기록을 승인할까요?',
            description: '승인하면 정상 기록으로 반영되고 직원에게 알림이 가요.',
            primary: {
                label: '승인하기',
                onPress: () => {
                    setPendingApprovals(prev => prev.filter(item => item.id !== approvalId));
                    AppToast.success('출퇴근 기록이 승인됐어요.');
                },
            },
            secondary: {label: '취소'},
        });
    };

    const statusBadge = (status: TeamMember['todayStatus']): {label: string; tone: 'success' | 'neutral' | 'warning'} => {
        switch (status) {
            case 'working':
                return {label: '근무중', tone: 'success'};
            case 'off':
                return {label: '퇴근', tone: 'neutral'};
            case 'pending':
                return {label: '승인대기', tone: 'warning'};
        }
    };

    return (
        <ScreenContainer
            padded={false}
            header={
                <AppHeader
                    title="매니저 홈"
                    actions={[
                        {label: '알림', onPress: () => navigation.navigate('NotificationCenter' as never)},
                        {label: '설정', onPress: () => navigation.navigate('AccountSettings' as never)},
                    ]}
                />
            }>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <HeroSlot testID="slotHero">
                    <AppText variant="headingMd">안녕하세요, 김매니저님</AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.sub}>{storeInfo.storeName} 관리자</AppText>
                </HeroSlot>

                <SummarySlot testID="slotSummary">
                    <AppCard variant="navy" hero style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <Summary label="오늘 출근" value={`${storeInfo.todayAttendance}명`} />
                            <Summary label="전체 팀원" value={`${storeInfo.totalEmployees}명`} />
                            <Summary label="승인 대기" value={`${pendingApprovals.length}건`} />
                        </View>
                    </AppCard>
                </SummarySlot>

                {pendingApprovals.length > 0 ? (
                    <View style={styles.section}>
                        <AppText variant="titleMd" style={styles.sectionTitle}>승인 대기 중</AppText>
                        <View style={styles.list}>
                            {pendingApprovals.map(a => (
                                <AppListItem
                                    key={a.id}
                                    title={a.employeeName}
                                    subtitle={`${a.type === 'check-in' ? '출근' : a.type === 'check-out' ? '퇴근' : '수동 기록'} · ${new Date(a.timestamp).toLocaleString('ko-KR')}`}
                                    right={<AppBadge label="승인" tone="info" />}
                                    onPress={() => handleApproval(a.id)}
                                />
                            ))}
                        </View>
                    </View>
                ) : null}

                <View style={styles.section}>
                    <AppText variant="titleMd" style={styles.sectionTitle}>팀원 현황</AppText>
                    <View style={styles.list}>
                        {teamMembers.map(m => {
                            const b = statusBadge(m.todayStatus);
                            return <AppListItem key={m.id} title={m.name} subtitle={m.position} right={<AppBadge label={b.label} tone={b.tone} />} />;
                        })}
                    </View>
                </View>

                <ActionsSlot testID="slotActions">
                    <View style={styles.section}>
                        <AppButton label="출퇴근 기록 관리" testID="btnManageAttendance" onPress={() => navigation.navigate('Attendance')} />
                    </View>
                </ActionsSlot>

                <InfoSlot testID="slotInfo">
                    <View style={styles.section}>
                        <AppCard variant="warm">
                            <AppText variant="titleMd">관리자 안내</AppText>
                            <AppText variant="caption" tone="secondary" style={styles.infoText}>
                                • 팀원의 출퇴근 기록을 승인하거나 수정할 수 있어요.{'\n'}• 매장 운영 현황을 실시간으로 확인하세요.{'\n'}• 문제가 있을 경우 사장님께 보고해주세요.
                            </AppText>
                        </AppCard>
                    </View>
                </InfoSlot>
            </ScrollView>
        </ScreenContainer>
    );
};

const Summary: React.FC<{label: string; value: string}> = ({label, value}) => (
    <View style={styles.summaryItem}>
        <AppText variant="caption" tone="inverse" style={styles.summaryLabel}>{label}</AppText>
        <AppText variant="headingSm" tone="inverse">{value}</AppText>
    </View>
);

const styles = StyleSheet.create({
    content: {paddingHorizontal: layout.screenPaddingHorizontal, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.md},
    sub: {marginTop: 2},
    summaryCard: {},
    summaryRow: {flexDirection: 'row', justifyContent: 'space-around'},
    summaryItem: {alignItems: 'center', flex: 1},
    summaryLabel: {opacity: 0.85, marginBottom: 4},
    section: {gap: spacing.sm},
    sectionTitle: {},
    list: {gap: spacing.sm},
    infoText: {marginTop: spacing.xs, lineHeight: 22},
});

export default ManagerMyPageScreen;
