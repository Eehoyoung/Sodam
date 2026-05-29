import {AppToast} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import AttendanceSummaryPanel from '../../attendance/components/AttendanceSummaryPanel';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import policyService from '../../info/services/policyService';
import laborInfoService from '../../../services/laborInfoService';
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
                        {label: '설정', onPress: () => navigation.navigate('AccountSettings' as never)},
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
                </ActionsSlot>

                {policies.length > 0 ? (
                    <InfoSlot testID="slotInfoPolicies">
                        <AppText variant="titleMd" style={styles.sectionTitle}>정부 지원 정책</AppText>
                        <View style={styles.list}>
                            {policies.map(p => (
                                <AppListItem
                                    key={String(p.id)}
                                    title={p.title}
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
