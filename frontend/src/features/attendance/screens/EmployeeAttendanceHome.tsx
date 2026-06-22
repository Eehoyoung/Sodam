import {AppToast, ConfirmSheet, AppCard, AppHeader, AppListItem, AppText, AmountText, LoadingState, PunchButton, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {spacing} from '../../../theme/tokens';
import {formatTimer, formatWage} from '../../../common/utils/format';
import {useAuth} from '../../../contexts/AuthContext';
import {useResponsive} from '../../../common/hooks/useResponsive';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
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
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {user} = useAuth();
    const r = useResponsive();
    const c = useThemeColors();
    // PunchButton 은 이미 자체 반응형이므로 화면은 주변 여백·바깥 카드만 조절.
    // compactHeight(<700, iPhone SE/Mini 풍): 원형 CTA 가 화면을 더 차지하므로 사이 gap·marginVertical 을 줄여 quickLinks 가 안 잘리도록.
    const bodyGap = r.pick({compact: spacing.md, default: spacing.lg});
    const punchMargin = r.isCompactHeight ? 0 : spacing.sm;
    const quickLinksGap = r.pick({compact: spacing.xs, default: spacing.sm});
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

    const proceed = (_storeId: number) => {
        // 출근/퇴근 모두 AttendanceScreen 이 NFC/GPS 검증과 함께 처리한다.
        // (구 코드의 AttendanceCheckIn/AttendanceCheckOut 라우트는 미구현 — 진입 시 크래시였음)
        if (state === 'IDLE' || state === 'WORKING') {
            navigation.navigate('Attendance');
        } else if (state === 'DONE') {
            AppToast.show('오늘은 이미 퇴근 완료했어요.');
        }
    };

    const handleAction = async () => {
        if (!selectedStore) {
            AppToast.show('먼저 매장을 선택해 주세요.');
            return;
        }
        const now = new Date();
        const isLikelyOutside = now.getHours() < 5 || now.getHours() > 23;
        if (state === 'IDLE' && isLikelyOutside) {
            ConfirmSheet.confirm({
                title: '운영시간 외 출근',
                description: '지금은 운영시간이 아닐 수 있어요. 그래도 출근하시겠어요?',
                primary: {label: '출근하기', onPress: () => proceed(selectedStore.id)},
                secondary: {label: '취소'},
            });
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
                    actions={[{label: '내역', icon: <Ionicons name="calendar-outline" size={20} color={c.brandPrimary} />, accessibilityLabel: '근무 내역', onPress: () => navigation.navigate('AttendanceCalendar')}]}
                />
            }>
            <View style={[styles.body, {gap: bodyGap}]}>
                <AppText variant="caption" tone="secondary" center>{formatToday()}</AppText>

                <PunchButton
                    title={punchTitle}
                    subtitle={punchSubtitle}
                    state={state === 'WORKING' ? 'working' : 'idle'}
                    disabled={state === 'DONE'}
                    onPress={handleAction}
                    style={[styles.punch, {marginVertical: punchMargin}]}
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
                        <AppText variant="caption" tone="secondary">오늘 누적 근무</AppText>
                        <AmountText size={30} tone="brand">
                            {todayRecord ? formatTimer((todayRecord.workingMinutes ?? 0) * 60) : '00:00:00'}
                        </AmountText>
                    </AppCard>
                ) : null}

                <View style={[styles.quickLinks, {gap: quickLinksGap}]}>
                    <AppListItem title="이번 달 급여" left={<Ionicons name="wallet-outline" size={24} color={c.brandPrimary} />} right="›" onPress={() => navigation.navigate('SalaryList')} />
                    <AppListItem title="출근 기록" left={<Ionicons name="calendar-outline" size={24} color={c.brandPrimary} />} right="›" onPress={() => navigation.navigate('AttendanceCalendar')} />
                    <AppListItem title="매장 코드 입력" left={<Ionicons name="key-outline" size={24} color={c.brandPrimary} />} right="›" onPress={() => navigation.navigate('JoinStoreByCode')} />
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
    body: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    punch: {},
    todayCard: {alignSelf: 'stretch', alignItems: 'center'},
    quickLinks: {alignSelf: 'stretch', marginTop: spacing.sm},
});

export default EmployeeAttendanceHome;
