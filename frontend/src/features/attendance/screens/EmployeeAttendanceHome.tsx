import React, {useEffect, useMemo, useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    LoadingState,
    PunchButton,
    ScreenContainer,
} from '../../../common/components/ds';
import {colors, spacing} from '../../../theme/tokens';
import {formatTimer, formatWage} from '../../../common/utils/format';
import {useAuth} from '../../../contexts/AuthContext';
import api from '../../../common/utils/api';

type AttendanceState = 'IDLE' | 'WORKING' | 'DONE' | 'LOADING';

interface MyStore {
    id: number;
    storeName: string;
    appliedHourlyWage: number;
}

interface TodayAttendance {
    id?: number;
    storeId: number;
    storeName: string;
    checkInTime?: string;
    checkOutTime?: string;
    workingMinutes: number;
    appliedHourlyWage: number;
}

/**
 * 21/22 EmployeeAttendanceHome — 확정 시안.
 * 대형 원형 출근/퇴근 CTA(PunchButton) + 1초 카운트업. 상태머신/네비게이션 로직 보존.
 */
const EmployeeAttendanceHome: React.FC = () => {
    const navigation = useNavigation<any>();
    const {user} = useAuth();
    const [state, setState] = useState<AttendanceState>('LOADING');
    const [, setStores] = useState<MyStore[]>([]);
    const [selectedStore, setSelectedStore] = useState<MyStore | null>(null);
    const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (state !== 'WORKING') {
            return;
        }
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [state]);

    const load = async () => {
        try {
            setState('LOADING');
            if (!user?.id) {
                setState('IDLE');
                return;
            }
            const myStoresRes = await api
                .get<MyStore[]>(`/api/stores/employee/${user.id}`)
                .catch(() => ({data: []}));
            const myStores =
                (myStoresRes.data as any[])?.map(s => ({
                    id: s.id,
                    storeName: s.storeName,
                    appliedHourlyWage: s.storeStandardHourWage ?? 0,
                })) ?? [];
            setStores(myStores);
            const first = myStores[0];
            setSelectedStore(first ?? null);

            if (first) {
                const todayRes = await api
                    .get<TodayAttendance>(`/api/attendance/employee/${user.id}/today`)
                    .catch(() => null);
                const t = todayRes?.data ?? null;
                setTodayRecord(t);
                setState(determineState(t));
            } else {
                setState('IDLE');
            }
        } catch (e) {
            console.warn('[EmployeeAttendance] load failed', e);
            setState('IDLE');
        }
    };

    const proceed = (storeId: number) => {
        if (state === 'IDLE') {
            navigation.navigate('AttendanceCheckIn', {storeId});
        } else if (state === 'WORKING') {
            navigation.navigate('AttendanceCheckOut', {storeId, attendanceId: todayRecord?.id});
        } else if (state === 'DONE') {
            Alert.alert('알림', '오늘은 이미 퇴근 완료했어요.');
        }
    };

    const handleAction = async () => {
        if (!selectedStore) {
            Alert.alert('알림', '먼저 매장을 선택해 주세요.');
            return;
        }
        const now = new Date();
        const isLikelyOutside = now.getHours() < 5 || now.getHours() > 23;
        if (state === 'IDLE' && isLikelyOutside) {
            Alert.alert('운영시간 외 출근', '지금은 운영시간이 아닐 수 있어요. 그래도 출근하시겠어요?', [
                {text: '취소', style: 'cancel'},
                {text: '출근하기', onPress: () => proceed(selectedStore.id)},
            ]);
            return;
        }
        proceed(selectedStore.id);
    };

    const workingDuration = useMemo(() => {
        if (state !== 'WORKING' || !todayRecord?.checkInTime) {
            return '00:00:00';
        }
        const start = new Date(todayRecord.checkInTime).getTime();
        return formatTimer(Math.max(0, Date.now() - start) / 1000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, todayRecord, tick]);

    const completedSummary = useMemo(() => {
        if (state !== 'DONE' || !todayRecord) {
            return '';
        }
        const h = Math.floor(todayRecord.workingMinutes / 60);
        const m = todayRecord.workingMinutes % 60;
        return `오늘 근무 ${h}시간 ${m}분 완료`;
    }, [state, todayRecord]);

    if (state === 'LOADING') {
        return (
            <ScreenContainer header={<AppHeader title={`${user?.name ?? '직원'}님`} />}>
                <LoadingState title="오늘 근무 상태 확인 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }

    const punchTitle = state === 'WORKING' ? workingDuration : state === 'DONE' ? '오늘 근무 완료' : '출근하기';
    const punchSubtitle =
        state === 'WORKING' ? '퇴근하려면 눌러주세요' : state === 'DONE' ? '내일 또 만나요' : 'GPS 정상 · NFC 대기';

    return (
        <ScreenContainer
            header={
                <AppHeader
                    title={`${user?.name ?? '직원'}님`}
                    actions={[{label: '내역', onPress: () => navigation.navigate('AttendanceCalendar')}]}
                />
            }>
            <View style={styles.body}>
                <AppText variant="caption" tone="secondary" center>{formatToday()}</AppText>

                <PunchButton
                    title={punchTitle}
                    subtitle={punchSubtitle}
                    state={state === 'WORKING' ? 'working' : 'idle'}
                    disabled={state === 'DONE'}
                    onPress={handleAction}
                    style={styles.punch}
                />

                <AppText variant="titleMd" tone="secondary" center>
                    {state === 'DONE'
                        ? completedSummary
                        : selectedStore
                            ? `${selectedStore.storeName} · 시급 ${formatWage(selectedStore.appliedHourlyWage)}`
                            : '소속 매장이 아직 없어요.'}
                </AppText>

                {selectedStore ? (
                    <AppCard variant="warm" style={styles.todayCard}>
                        <AppText variant="caption" tone="secondary">오늘</AppText>
                        <AppText variant="numericLg" tone="brand">
                            {todayRecord ? formatTimer((todayRecord.workingMinutes ?? 0) * 60) : '00:00:00'}
                        </AppText>
                    </AppCard>
                ) : null}

                <View style={styles.quickLinks}>
                    <AppListItem title="이번 달 급여" right="›" onPress={() => navigation.navigate('SalaryList')} />
                    <AppListItem title="출근 기록" right="›" onPress={() => navigation.navigate('AttendanceCalendar')} />
                    <AppListItem title="매장 코드 입력" right="›" onPress={() => navigation.navigate('JoinStoreByCode')} />
                </View>
            </View>
        </ScreenContainer>
    );
};

function determineState(t: TodayAttendance | null): AttendanceState {
    if (!t) {
        return 'IDLE';
    }
    if (t.checkInTime && !t.checkOutTime) {
        return 'WORKING';
    }
    if (t.checkInTime && t.checkOutTime) {
        return 'DONE';
    }
    return 'IDLE';
}

function formatToday(): string {
    const d = new Date();
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`;
}

const styles = StyleSheet.create({
    body: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg},
    punch: {marginVertical: spacing.sm},
    todayCard: {alignSelf: 'stretch', alignItems: 'center'},
    quickLinks: {alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm},
});

export default EmployeeAttendanceHome;
