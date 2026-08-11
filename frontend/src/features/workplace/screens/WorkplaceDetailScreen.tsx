import React, {useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {useFocusEffect, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    AppToast,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useAuth} from '../../../contexts/AuthContext';
import attendanceService, {AttendanceWorkLogResponse} from '../../attendance/services/attendanceService';
import {logger} from '../../../utils/logger';

/** 개발용 시각 검증 전용 — getMonthlyWorkLog 조회를 고정 데이터로 대체한다. */
export interface WorkplaceDetailVisualFixture {
    data: AttendanceWorkLogResponse;
}

interface Props {
    visualFixture?: WorkplaceDetailVisualFixture;
}

/**
 * 16 WorkplaceDetail — 신규 화면(v3 §4.1).
 * 15 WorkplaceList 와 동일 근거로 "내가 직원으로 소속된 매장"만 다룬다(개인 근무지 갭은 15 참조).
 * GET /api/attendance/employee/{employeeId}/work-log (getMonthlyWorkLog) 로 이번 달 요약 + 최근 기록을 채운다.
 */
const WorkplaceDetailScreen: React.FC<Props> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'WorkplaceDetail'>>();
    const {user} = useAuth();
    const {storeId, storeName} = route.params;

    const [data, setData] = useState<AttendanceWorkLogResponse | null>(visualFixture?.data ?? null);
    const [loading, setLoading] = useState(!visualFixture);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (visualFixture) {
            return;
        }
        if (!user?.id) {
            setLoading(false);
            return;
        }
        try {
            setError(false);
            const now = new Date();
            const res = await attendanceService.getMonthlyWorkLog(user.id, storeId, now.getFullYear(), now.getMonth() + 1);
            setData(res);
        } catch (e) {
            logger.warn('[WorkplaceDetail] load failed', e);
            setError(true);
            AppToast.error('근무지 정보를 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [user?.id, storeId, visualFixture]);

    useFocusEffect(useCallback(() => {
        if (visualFixture) {
            return;
        }
        load();
    }, [load, visualFixture]));

    const header = <AppHeader title="근무지 상세" onBack={() => navigation.goBack()} />;

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="근무지 정보를 불러오는 중" description="잠시만 기다려 주세요." />
            </ScreenContainer>
        );
    }

    if (error || !data) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="근무지 정보를 불러오지 못했어요" description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}} />
            </ScreenContainer>
        );
    }

    const latest = data.rows[data.rows.length - 1];
    const latestWage = latest?.appliedHourlyWage ?? data.rows.find(r => !!r.appliedHourlyWage)?.appliedHourlyWage ?? 0;

    return (
        <ScreenContainer scroll header={header}>
            <AppCard variant="spot" style={styles.spotCard}>
                <AppText variant="titleMd" weight="800">{storeName ?? data.storeName ?? '근무지'}</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.spotSub}>직원으로 소속된 근무지예요.</AppText>
            </AppCard>

            <AppCard variant="outlined" style={styles.moneyCard}>
                <AppText variant="caption" tone="tertiary">기본 시급</AppText>
                <AppText variant="headingMd" weight="800" style={styles.moneyValue}>
                    {latestWage ? `${latestWage.toLocaleString('ko-KR')}원` : '정보 없음'}
                </AppText>
                <AppText variant="caption" tone="secondary" style={styles.moneySub}>
                    이번 달 {data.summary.attendanceDays}일 · {(data.summary.totalWorkedMinutes / 60).toFixed(1)}h
                </AppText>
            </AppCard>

            <AppListItem
                title="최근 기록"
                subtitle={latest
                    ? `${formatShortDate(latest.date)} · ${((latest.workedMinutes ?? 0) / 60).toFixed(1)}h`
                    : '최근 기록이 없어요.'}
                right="›"
                onPress={() => navigation.navigate('AttendanceCalendar')}
            />
            <AppListItem
                title="월간 요약"
                subtitle={`${(data.summary.totalWorkedMinutes / 60).toFixed(1)}h · ${data.summary.totalGrossWage.toLocaleString('ko-KR')}원`}
                right="›"
                onPress={() => navigation.navigate('EmployeeWorkLog', {storeId})}
            />
        </ScreenContainer>
    );
};

function formatShortDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {return iso;}
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
    spotCard: {gap: spacing.xs, marginBottom: spacing.lg},
    spotSub: {marginTop: 2},
    moneyCard: {gap: 2, marginBottom: spacing.lg},
    moneyValue: {marginTop: 2},
    moneySub: {marginTop: spacing.xs},
});

export default WorkplaceDetailScreen;
