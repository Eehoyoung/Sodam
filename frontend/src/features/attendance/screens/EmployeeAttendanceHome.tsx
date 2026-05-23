import React, {useEffect, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
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
 * 직원 출퇴근 홈 화면 (PRD_EMPLOYEE E-001).
 *
 * - 중앙 큰 동그라미 버튼: 상태에 따라 출근/근무 중/퇴근 표시
 * - 1초마다 근무 시간 카운트업 (배터리 부담 최소화 — setInterval 1Hz)
 */
const EmployeeAttendanceHome: React.FC = () => {
    const navigation = useNavigation<any>();
    const {user} = useAuth();
    const [state, setState] = useState<AttendanceState>('LOADING');
    const [stores, setStores] = useState<MyStore[]>([]);
    const [selectedStore, setSelectedStore] = useState<MyStore | null>(null);
    const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        load();
    }, []);

    // 근무 중 1초 카운트업
    useEffect(() => {
        if (state !== 'WORKING') return;
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
            const myStores = (myStoresRes.data as any[])?.map(s => ({
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
        // 운영시간 외 경고 — 클라이언트 단순 검사 (서버에서는 isOpenAt 도메인 사용)
        const now = new Date();
        const isLikelyOutside = now.getHours() < 5 || now.getHours() > 23;
        if (state === 'IDLE' && isLikelyOutside) {
            Alert.alert(
                '운영시간 외 출근',
                '지금은 운영시간이 아닐 수 있어요. 그래도 출근하시겠어요?',
                [
                    {text: '취소', style: 'cancel'},
                    {text: '출근하기', onPress: () => proceed(selectedStore.id)},
                ],
            );
            return;
        }
        proceed(selectedStore.id);
    };

    const workingDuration = useMemo(() => {
        if (state !== 'WORKING' || !todayRecord?.checkInTime) return '00:00:00';
        const start = new Date(todayRecord.checkInTime).getTime();
        const diff = Math.max(0, Date.now() - start);
        return formatDuration(diff);
    }, [state, todayRecord, tick]);

    const completedSummary = useMemo(() => {
        if (state !== 'DONE' || !todayRecord) return '';
        const h = Math.floor(todayRecord.workingMinutes / 60);
        const m = todayRecord.workingMinutes % 60;
        return `오늘 근무 ${h}시간 ${m}분 완료`;
    }, [state, todayRecord]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                {/* Greeting */}
                <View style={styles.greeting}>
                    <Text style={styles.greetingText}>
                        {getGreetingByHour()}, {user?.name ?? '직원'}님 👋
                    </Text>
                    <Text style={styles.dateText}>{formatToday()}</Text>
                </View>

                {/* Big circle CTA */}
                <Pressable
                    onPress={handleAction}
                    style={({pressed}) => [
                        styles.circleWrapper,
                        pressed && {transform: [{scale: 0.96}]},
                    ]}
                >
                    <LinearGradient
                        colors={getCircleGradient(state)}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.circle}
                    >
                        {state === 'LOADING' ? (
                            <ActivityIndicator color="#fff" size="large" />
                        ) : (
                            <>
                                <Text style={styles.circleEmoji}>{getCircleEmoji(state)}</Text>
                                <Text style={styles.circleTitle}>{getCircleTitle(state)}</Text>
                                {state === 'WORKING' ? (
                                    <Text style={styles.circleTimer}>{workingDuration}</Text>
                                ) : null}
                            </>
                        )}
                    </LinearGradient>
                </Pressable>

                {/* Status footer */}
                <View style={styles.footer}>
                    {state === 'DONE' ? (
                        <Text style={styles.footerText}>{completedSummary}</Text>
                    ) : selectedStore ? (
                        <Text style={styles.footerText}>
                            {selectedStore.storeName} · 시급{' '}
                            {selectedStore.appliedHourlyWage.toLocaleString('ko-KR')}원
                        </Text>
                    ) : (
                        <Text style={styles.footerText}>소속 매장이 아직 없어요.</Text>
                    )}
                </View>

                {/* Quick links */}
                <View style={styles.quickLinks}>
                    <QuickLink
                        label="이번 달 급여"
                        onPress={() => navigation.navigate('SalaryList')}
                    />
                    <QuickLink
                        label="출근 기록"
                        onPress={() => navigation.navigate('AttendanceCalendar')}
                    />
                    <QuickLink
                        label="매장 코드 입력"
                        onPress={() => navigation.navigate('JoinStoreByCode')}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

const QuickLink: React.FC<{label: string; onPress: () => void}> = ({label, onPress}) => (
    <Pressable onPress={onPress} style={({pressed}) => [styles.quickLink, pressed && {opacity: 0.6}]}>
        <Text style={styles.quickLinkText}>{label}</Text>
        <Text style={styles.quickLinkArrow}>›</Text>
    </Pressable>
);

function determineState(t: TodayAttendance | null): AttendanceState {
    if (!t) return 'IDLE';
    if (t.checkInTime && !t.checkOutTime) return 'WORKING';
    if (t.checkInTime && t.checkOutTime) return 'DONE';
    return 'IDLE';
}

function getCircleGradient(state: AttendanceState): [string, string] {
    if (state === 'IDLE' || state === 'LOADING') return tokens.gradient.brand;
    if (state === 'WORKING') return tokens.gradient.warning;
    return tokens.gradient.success;
}

function getCircleEmoji(state: AttendanceState): string {
    if (state === 'IDLE' || state === 'LOADING') return '👋';
    if (state === 'WORKING') return '⏱';
    return '🌙';
}

function getCircleTitle(state: AttendanceState): string {
    if (state === 'IDLE' || state === 'LOADING') return '출근하기';
    if (state === 'WORKING') return '근무 중';
    return '오늘 근무 완료';
}

function getGreetingByHour(): string {
    const h = new Date().getHours();
    if (h < 6) return '늦은 시간이에요';
    if (h < 12) return '좋은 아침이에요';
    if (h < 18) return '수고하셨어요';
    return '오늘도 고생하셨어요';
}

function formatToday(): string {
    const d = new Date();
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`;
}

function formatDuration(ms: number): string {
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    container: {
        flex: 1,
        padding: tokens.spacing.lg,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    greeting: {
        alignItems: 'center',
        marginTop: tokens.spacing.xl,
    },
    greetingText: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        letterSpacing: -0.5,
    },
    dateText: {
        marginTop: tokens.spacing.xs,
        color: tokens.colors.textSecondary,
        fontSize: tokens.typography.sizes.sm,
    },
    circleWrapper: {
        marginVertical: tokens.spacing.xxxl,
        ...tokens.shadow.brand,
    },
    circle: {
        width: 240,
        height: 240,
        borderRadius: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleEmoji: {fontSize: 56, marginBottom: tokens.spacing.sm},
    circleTitle: {
        color: tokens.colors.textInverse,
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weights.bold,
        letterSpacing: -0.5,
    },
    circleTimer: {
        marginTop: tokens.spacing.sm,
        color: tokens.colors.textInverse,
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        fontVariant: ['tabular-nums'],
    },
    footer: {alignItems: 'center'},
    footerText: {
        color: tokens.colors.textSecondary,
        fontSize: tokens.typography.sizes.md,
        textAlign: 'center',
    },
    quickLinks: {
        width: '100%',
        gap: tokens.spacing.sm,
        marginTop: tokens.spacing.xl,
    },
    quickLink: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: tokens.colors.surface,
        borderColor: tokens.colors.divider,
        borderWidth: 1,
        borderRadius: tokens.radius.lg,
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
    },
    quickLinkText: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textPrimary,
    },
    quickLinkArrow: {
        fontSize: tokens.typography.sizes.lg,
        color: tokens.colors.textTertiary,
    },
});

export default EmployeeAttendanceHome;
