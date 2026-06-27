/* eslint-disable react-native/no-color-literals -- 브랜드 히어로 위 흰 오버레이 고정(레거시 화면, P2 재디자인 대상) */
/* eslint-disable react-native/no-unused-styles -- styles built via createStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import {AppToast, AppButton, AppCard, AppText, AmountText} from '../../../common/components/ds';
import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
    View,
    ScrollView,
    TextInput,
    Modal,
    StyleSheet,
    StatusBar,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {radius, shadow, spacing} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import AuthContext from '../../../contexts/AuthContext';
import storeService from '../../store/services/storeService';

// 타입 정의
interface Store {
    id: string;
    name: string;
    color: string;
    hourlyWage: number;
}

interface WorkRecord {
    id: string;
    storeId: string;
    storeName: string;
    type: '출근' | '퇴근' | '휴게시작' | '휴게종료';
    time: string;
    date: string;
    timestamp: number;
}

interface WorkSession {
    storeId: string;
    storeName: string;
    startTime: Date | null;
    breakStartTime: Date | null;
    isWorking: boolean;
    isOnBreak: boolean;
    totalWorkTime: number; // 초 단위
    totalBreakTime: number; // 초 단위
}

interface DailyWorkSummary {
    date: string;
    stores: {
        [storeId: string]: {
            storeName: string;
            workTime: number;
            records: WorkRecord[];
            earnings: number;
        };
    };
    totalWorkTime: number;
    totalEarnings: number;
}

interface MonthlyStats {
    month: string;
    totalWorkTime: number;
    totalEarnings: number;
    workDays: number;
    storeBreakdown: {
        [storeId: string]: {
            storeName: string;
            workTime: number;
            earnings: number;
            days: number;
        };
    };
}

const MultiStoreWorkScreen: React.FC = () => {
    const c = useThemeColors();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(c), [c]);

    // AuthContext에서 사용자 정보 가져오기
    const { user } = useContext(AuthContext);

    // 매장 데이터 - API 연동
    const [stores, setStores] = useState<Store[]>([]);
    const [, setLoadingStores] = useState<boolean>(true);

    // 상태 관리
    const [currentTime, setCurrentTime] = useState<string>('');
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [workSessions, setWorkSessions] = useState<{ [storeId: string]: WorkSession }>({});
    const [allRecords, setAllRecords] = useState<WorkRecord[]>([]);
    const [showStoreSelector, setShowStoreSelector] = useState<boolean>(false);
    const [showManualModal, setShowManualModal] = useState<boolean>(false);
    const [showMonthlyView, setShowMonthlyView] = useState<boolean>(false);
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

    const [manualRecord, setManualRecord] = useState({
        type: '출근' as WorkRecord['type'],
        hour: '',
        minute: '',
        storeId: '',
    });

    // 현재 선택된 매장 정보
    const currentStore = useMemo(() => {
        if (stores.length === 0) {
            return { id: '', name: '매장 없음', color: c.brandSecondary, hourlyWage: 0 };
        }
        return stores.find(store => store.id === selectedStoreId) ?? stores[0];
    }, [selectedStoreId, stores, c.brandSecondary]);

    // 현재 매장의 작업 세션
    const currentSession = useMemo(() =>
            workSessions[selectedStoreId] || {
                storeId: selectedStoreId,
                storeName: currentStore.name,
                startTime: null,
                breakStartTime: null,
                isWorking: false,
                isOnBreak: false,
                totalWorkTime: 0,
                totalBreakTime: 0,
            },
        [workSessions, selectedStoreId, currentStore]
    );

    // 오늘 날짜
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // 오늘의 기록들 (매장별로 그룹화)
    const todayRecords = useMemo(() => {
        return allRecords.filter(record => record.date === today);
    }, [allRecords, today]);

    // 오늘의 작업 요약
    const todayWorkSummary = useMemo((): DailyWorkSummary => {
        const summary: DailyWorkSummary = {
            date: today,
            stores: {},
            totalWorkTime: 0,
            totalEarnings: 0,
        };

        const storeRecords: { [storeId: string]: WorkRecord[] } = {};

        // 매장별로 기록 그룹화
        todayRecords.forEach(record => {
            if (!storeRecords[record.storeId]) {
                storeRecords[record.storeId] = [];
            }
            storeRecords[record.storeId].push(record);
        });

        // 각 매장별 근무시간 계산
        Object.entries(storeRecords).forEach(([storeId, records]) => {
            const store = stores.find(s => s.id === storeId);
            if (!store) {return;}

            let workTime = 0;
            let clockInTime: Date | null = null;
            let breakStartTime: Date | null = null;

            records.forEach(record => {
                const recordTime = new Date(`${record.date}T${record.time}:00`);

                switch (record.type) {
                    case '출근':
                        clockInTime = recordTime;
                        break;
                    case '퇴근':
                        if (clockInTime) {
                            workTime += (recordTime.getTime() - clockInTime.getTime()) / 1000;
                            clockInTime = null;
                        }
                        break;
                    case '휴게시작':
                        if (clockInTime) {
                            workTime += (recordTime.getTime() - clockInTime.getTime()) / 1000;
                            breakStartTime = recordTime;
                        }
                        break;
                    case '휴게종료':
                        if (breakStartTime) {
                            clockInTime = recordTime;
                            breakStartTime = null;
                        }
                        break;
                }
            });

            // 현재 진행 중인 근무시간 추가
            const session = workSessions[storeId];
            if (session?.isWorking && session.startTime && !session.isOnBreak) {
                workTime += (new Date().getTime() - session.startTime.getTime()) / 1000;
            }
            workTime += session?.totalWorkTime || 0;

            const earnings = Math.floor((workTime / 3600) * store.hourlyWage);

            summary.stores[storeId] = {
                storeName: store.name,
                workTime,
                records,
                earnings,
            };

            summary.totalWorkTime += workTime;
            summary.totalEarnings += earnings;
        });

        return summary;
    }, [todayRecords, workSessions, stores, today]);

    // 월별 통계
    const monthlyStats = useMemo((): MonthlyStats => {
        const monthRecords = allRecords.filter(record =>
            record.date.startsWith(selectedMonth)
        );

        const stats: MonthlyStats = {
            month: selectedMonth,
            totalWorkTime: 0,
            totalEarnings: 0,
            workDays: 0,
            storeBreakdown: {},
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const dailySummaries: { [date: string]: DailyWorkSummary } = {};

        // 날짜별로 그룹화
        const dateGroups: { [date: string]: WorkRecord[] } = {};
        monthRecords.forEach(record => {
            if (!dateGroups[record.date]) {
                dateGroups[record.date] = [];
            }
            dateGroups[record.date].push(record);
        });


        // 각 날짜별 계산
        Object.entries(dateGroups).forEach(([_date, records]) => {
            const storeRecords: { [storeId: string]: WorkRecord[] } = {};

            records.forEach(record => {
                if (!storeRecords[record.storeId]) {
                    storeRecords[record.storeId] = [];
                }
                storeRecords[record.storeId].push(record);
            });

            let dayTotalWorkTime = 0;
            let dayTotalEarnings = 0;

            Object.entries(storeRecords).forEach(([storeId, storeRecordsForDay]) => {
                const store = stores.find(s => s.id === storeId);
                if (!store) {return;}

                let workTime = 0;
                let clockInTime: Date | null = null;
                let breakStartTime: Date | null = null;

                storeRecordsForDay.forEach(record => {
                    const recordTime = new Date(`${record.date}T${record.time}:00`);

                    switch (record.type) {
                        case '출근':
                            clockInTime = recordTime;
                            break;
                        case '퇴근':
                            if (clockInTime) {
                                workTime += (recordTime.getTime() - clockInTime.getTime()) / 1000;
                                clockInTime = null;
                            }
                            break;
                        case '휴게시작':
                            if (clockInTime) {
                                workTime += (recordTime.getTime() - clockInTime.getTime()) / 1000;
                                breakStartTime = recordTime;
                            }
                            break;
                        case '휴게종료':
                            if (breakStartTime) {
                                clockInTime = recordTime;
                                breakStartTime = null;
                            }
                            break;
                    }
                });

                const earnings = Math.floor((workTime / 3600) * store.hourlyWage);

                if (!stats.storeBreakdown[storeId]) {
                    stats.storeBreakdown[storeId] = {
                        storeName: store.name,
                        workTime: 0,
                        earnings: 0,
                        days: 0,
                    };
                }

                if (workTime > 0) {
                    stats.storeBreakdown[storeId].workTime += workTime;
                    stats.storeBreakdown[storeId].earnings += earnings;
                    stats.storeBreakdown[storeId].days += 1;
                }

                dayTotalWorkTime += workTime;
                dayTotalEarnings += earnings;
            });

            if (dayTotalWorkTime > 0) {
                stats.workDays += 1;
            }

            stats.totalWorkTime += dayTotalWorkTime;
            stats.totalEarnings += dayTotalEarnings;
        });

        return stats;
    }, [allRecords, selectedMonth, stores]);

    // 매장 데이터 로딩 (API 연동)
    useEffect(() => {
        const loadStores = async () => {
            if (!user?.id) {
                setLoadingStores(false);
                return;
            }

            try {
                setLoadingStores(true);
                // storeService.getMasterStores()는 Store[] 타입 반환 예상
                const storesData = await storeService.getMasterStores(user.id);

                // API 응답을 Store 인터페이스에 맞게 변환
                const mappedStores: Store[] = storesData.map((store: any) => ({
                    id: String(store.id),
                    name: store.storeName,
                    color: store.color || '#FF6B35', // 기본 색상
                    hourlyWage: store.storeStandardHourWage || 10000,
                }));

                setStores(mappedStores);

                // 첫 번째 매장을 기본 선택
                if (mappedStores.length > 0) {
                    setSelectedStoreId(mappedStores[0].id);
                    setManualRecord(prev => ({ ...prev, storeId: mappedStores[0].id }));
                }
            } catch (error) {
                console.error('매장 로딩 실패:', error);
                AppToast.error('매장 정보를 불러올 수 없어요.');
            } finally {
                setLoadingStores(false);
            }
        };

        loadStores();
    }, [user?.id]);

    // 현재 시간 업데이트
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
            });
            setCurrentTime(timeString);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // 실시간 근무시간 업데이트
    useEffect(() => {
        const interval = setInterval(() => {
            setWorkSessions(prev => ({ ...prev })); // 강제 리렌더링
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // 현재 근무시간 계산
    const getCurrentWorkTime = (session: WorkSession): string => {
        if (!session.isWorking || !session.startTime || session.isOnBreak) {
            const totalSeconds = session.totalWorkTime;
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        const now = new Date();
        const workDuration = Math.floor((now.getTime() - session.startTime.getTime()) / 1000) + session.totalWorkTime;
        const hours = Math.floor(workDuration / 3600);
        const minutes = Math.floor((workDuration % 3600) / 60);
        const seconds = workDuration % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // 예상 급여 계산
    const getExpectedPay = (session: WorkSession): number => {
        if (!session.isWorking || !session.startTime || session.isOnBreak) {
            return Math.floor((session.totalWorkTime / 3600) * currentStore.hourlyWage);
        }

        const now = new Date();
        const workDuration = Math.floor((now.getTime() - session.startTime.getTime()) / 1000) + session.totalWorkTime;
        return Math.floor((workDuration / 3600) * currentStore.hourlyWage);
    };

    // 출근
    const clockIn = () => {
        if (!currentSession.isWorking) {
            const now = new Date();
            const newSession: WorkSession = {
                ...currentSession,
                startTime: now,
                isWorking: true,
                isOnBreak: false,
            };

            setWorkSessions(prev => ({
                ...prev,
                [selectedStoreId]: newSession,
            }));

            const timeString = now.toTimeString().slice(0, 5);
            addRecord('출근', timeString, selectedStoreId);

            AppToast.success(`${currentStore.name}에 출근이 기록됐어요!`);
        }
    };

    // 퇴근
    const clockOut = () => {
        if (currentSession.isWorking) {
            const now = new Date();
            const timeString = now.toTimeString().slice(0, 5);
            addRecord('퇴근', timeString, selectedStoreId);

            // 총 근무시간 계산
            let additionalWorkTime = 0;
            if (currentSession.startTime) {
                additionalWorkTime = Math.floor((now.getTime() - currentSession.startTime.getTime()) / 1000);
            }

            const newSession: WorkSession = {
                ...currentSession,
                totalWorkTime: currentSession.totalWorkTime + additionalWorkTime,
                isWorking: false,
                isOnBreak: false,
                startTime: null,
                breakStartTime: null,
            };

            setWorkSessions(prev => ({
                ...prev,
                [selectedStoreId]: newSession,
            }));

            AppToast.success(`${currentStore.name}에서 퇴근이 기록됐어요! 수고하셨어요!`);
        }
    };

    // 휴게시작
    const breakStart = () => {
        if (currentSession.isWorking && !currentSession.isOnBreak) {
            const now = new Date();

            // 현재까지의 근무시간을 누적
            let additionalWorkTime = 0;
            if (currentSession.startTime) {
                additionalWorkTime = Math.floor((now.getTime() - currentSession.startTime.getTime()) / 1000);
            }

            const newSession: WorkSession = {
                ...currentSession,
                totalWorkTime: currentSession.totalWorkTime + additionalWorkTime,
                breakStartTime: now,
                isOnBreak: true,
            };

            setWorkSessions(prev => ({
                ...prev,
                [selectedStoreId]: newSession,
            }));

            const timeString = now.toTimeString().slice(0, 5);
            addRecord('휴게시작', timeString, selectedStoreId);

            AppToast.success(`${currentStore.name}에서 휴게시간이 시작됐어요!`);
        }
    };

    // 휴게종료
    const breakEnd = () => {
        if (currentSession.isWorking && currentSession.isOnBreak) {
            const now = new Date();

            // 휴게시간 계산
            let breakTime = 0;
            if (currentSession.breakStartTime) {
                breakTime = Math.floor((now.getTime() - currentSession.breakStartTime.getTime()) / 1000);
            }

            const newSession: WorkSession = {
                ...currentSession,
                totalBreakTime: currentSession.totalBreakTime + breakTime,
                startTime: now, // 새로운 근무 시작시간으로 설정
                breakStartTime: null,
                isOnBreak: false,
            };

            setWorkSessions(prev => ({
                ...prev,
                [selectedStoreId]: newSession,
            }));

            const timeString = now.toTimeString().slice(0, 5);
            addRecord('휴게종료', timeString, selectedStoreId);

            AppToast.success(`${currentStore.name}에서 휴게시간이 종료됐어요! 화이팅!`);
        }
    };

    // 기록 추가
    const addRecord = (type: WorkRecord['type'], time: string, storeId: string) => {
        const store = stores.find(s => s.id === storeId);
        if (!store) {return;}

        const newRecord: WorkRecord = {
            id: Date.now().toString(),
            storeId,
            storeName: store.name,
            type,
            time,
            date: today,
            timestamp: Date.now(),
        };

        setAllRecords(prev => [...prev, newRecord]);
    };

    // 수동 기록 추가
    const addManualRecord = () => {
        if (manualRecord.hour && manualRecord.minute) {
            const time = `${manualRecord.hour.padStart(2, '0')}:${manualRecord.minute.padStart(2, '0')}`;
            addRecord(manualRecord.type, time, manualRecord.storeId);
            setShowManualModal(false);
            setManualRecord({ type: '출근', hour: '', minute: '', storeId: stores[0].id });

            const store = stores.find(s => s.id === manualRecord.storeId);
            AppToast.success(`${store?.name}에 ${manualRecord.type} 기록이 추가됐어요!`);
        } else {
            AppToast.warn('시간과 분을 모두 입력해 주세요.');
        }
    };

    // 매장 선택
    const selectStore = (storeId: string) => {
        setSelectedStoreId(storeId);
        setShowStoreSelector(false);
    };

    // 현재 상태 텍스트
    const getWorkStatusText = (): string => {
        if (!currentSession.isWorking) {return '미출근';}
        if (currentSession.isOnBreak) {return '휴게중';}
        return '근무중';
    };

    // 시간 포맷팅
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}시간 ${minutes}분`;
    };

    // 월 목록 생성
    const generateMonthOptions = (): string[] => {
        const months = [];
        const currentDate = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            months.push(date.toISOString().slice(0, 7));
        }
        return months;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* 헤더 */}
            <LinearGradient
                colors={[currentStore.color, c.brandSecondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <AppText variant="headingMd" tone="inverse">{user?.name ?? '회원'}님</AppText>
                <AppText variant="bodyMd" tone="inverse" style={styles.currentTime}>{currentTime}</AppText>

                {/* 매장 선택 버튼 */}
                <TouchableOpacity
                    style={styles.storeSelector}
                    onPress={() => setShowStoreSelector(true)}
                >
                    <AppText variant="headingSm" tone="inverse" numberOfLines={1}>{currentStore.name}</AppText>
                    <View style={styles.storeChangeRow}>
                        <AppText variant="caption" tone="inverse" style={styles.storeChangeText}>매장 변경</AppText>
                        <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.85)" />
                    </View>
                </TouchableOpacity>

                <View style={styles.workStatus}>
                    <View style={styles.workStatusItem}>
                        <AppText variant="caption" tone="inverse" style={styles.statusLabel}>근무 상태</AppText>
                        <AppText variant="headingSm" tone="inverse">{getWorkStatusText()}</AppText>
                    </View>
                    <View style={styles.workStatusItem}>
                        <AppText variant="caption" tone="inverse" style={styles.statusLabel}>오늘 총 근무시간</AppText>
                        <AppText variant="headingSm" tone="inverse">{formatTime(todayWorkSummary.totalWorkTime)}</AppText>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
                {/* 실시간 근무 현황 */}
                <AppCard variant="hero" style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="time-outline" size={20} color={c.brandPrimary} style={styles.cardIcon} />
                        <AppText variant="headingSm">현재 매장 근무 현황</AppText>
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <AppText variant="caption" tone="secondary" style={styles.statLabel}>현재 근무시간</AppText>
                            <AppText variant="headingMd" tone="brand">{getCurrentWorkTime(currentSession)}</AppText>
                        </View>
                        <View style={styles.statBox}>
                            <AppText variant="caption" tone="secondary" style={styles.statLabel}>예상 급여</AppText>
                            <AmountText size={24}>₩{getExpectedPay(currentSession).toLocaleString()}</AmountText>
                        </View>
                    </View>

                    {/* 원터치 근태 기록 버튼들 */}
                    <View style={styles.actionButtons}>
                        <View style={styles.actionHalf}>
                            <AppButton
                                label="출근"
                                size="md"
                                onPress={clockIn}
                                disabled={currentSession.isWorking}
                                leftIcon={<Ionicons name="enter-outline" size={18} color={c.textInverse} />}
                            />
                        </View>
                        <View style={styles.actionHalf}>
                            <AppButton
                                label="퇴근"
                                size="md"
                                variant="secondary"
                                onPress={clockOut}
                                disabled={!currentSession.isWorking}
                                leftIcon={<Ionicons name="exit-outline" size={18} color={c.brandSecondary} />}
                            />
                        </View>
                        <View style={styles.actionHalf}>
                            <AppButton
                                label="휴게시작"
                                size="md"
                                variant="outline"
                                onPress={breakStart}
                                disabled={!currentSession.isWorking || currentSession.isOnBreak}
                                leftIcon={<Ionicons name="cafe-outline" size={18} color={c.brandPrimary} />}
                            />
                        </View>
                        <View style={styles.actionHalf}>
                            <AppButton
                                label="휴게종료"
                                size="md"
                                variant="outline"
                                onPress={breakEnd}
                                disabled={!currentSession.isWorking || !currentSession.isOnBreak}
                                leftIcon={<Ionicons name="play-outline" size={18} color={c.brandPrimary} />}
                            />
                        </View>
                    </View>

                    <AppButton
                        label="수동 시간 입력"
                        size="md"
                        variant="ghost"
                        onPress={() => setShowManualModal(true)}
                        leftIcon={<Ionicons name="create-outline" size={18} color={c.brandPrimary} />}
                    />
                </AppCard>

                {/* 오늘의 매장별 근무 기록 */}
                <AppCard variant="plain" style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="document-text-outline" size={20} color={c.brandPrimary} style={styles.cardIcon} />
                        <AppText variant="headingSm">오늘의 매장별 근무 기록</AppText>
                    </View>

                    {Object.entries(todayWorkSummary.stores).map(([storeId, storeData]) => {
                        const store = stores.find(s => s.id === storeId);
                        return (
                            <View key={storeId} style={styles.storeWorkSection}>
                                <View style={styles.storeHeader}>
                                    <View style={[styles.storeColorDot, { backgroundColor: store?.color ?? c.brandPrimary }]} />
                                    <AppText variant="titleMd" numberOfLines={1} style={styles.storeWorkTitle}>{storeData.storeName}</AppText>
                                    <AppText variant="titleMd" tone="secondary">{formatTime(storeData.workTime)}</AppText>
                                </View>

                                <View style={styles.recordList}>
                                    {storeData.records.map((record, index) => (
                                        <View key={index} style={styles.recordItem}>
                                            <AppText variant="caption" weight="600">{record.type}</AppText>
                                            <AppText variant="caption" tone="secondary">{record.time}</AppText>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.storeEarnings}>
                                    <AppText variant="caption" tone="secondary" weight="600">예상 급여: ₩{storeData.earnings.toLocaleString()}</AppText>
                                </View>
                            </View>
                        );
                    })}

                    {Object.keys(todayWorkSummary.stores).length === 0 && (
                        <AppText variant="bodyMd" tone="secondary" center style={styles.noRecordsText}>오늘 근무 기록이 없어요.</AppText>
                    )}
                </AppCard>

                {/* 오늘 총 요약 */}
                <AppCard variant="plain" style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="bar-chart-outline" size={20} color={c.brandPrimary} style={styles.cardIcon} />
                        <AppText variant="headingSm">오늘 총 요약</AppText>
                    </View>

                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <AppText variant="caption" tone="secondary" style={styles.summaryLabel}>총 근무시간</AppText>
                            <AppText variant="titleMd">{formatTime(todayWorkSummary.totalWorkTime)}</AppText>
                        </View>
                        <View style={styles.summaryItem}>
                            <AppText variant="caption" tone="secondary" style={styles.summaryLabel}>총 예상급여</AppText>
                            <AppText variant="titleMd" numberOfLines={1} adjustsFontSizeToFit>₩{todayWorkSummary.totalEarnings.toLocaleString()}</AppText>
                        </View>
                        <View style={styles.summaryItem}>
                            <AppText variant="caption" tone="secondary" style={styles.summaryLabel}>근무 매장수</AppText>
                            <AppText variant="titleMd">{Object.keys(todayWorkSummary.stores).length}개</AppText>
                        </View>
                        <View style={styles.summaryItem}>
                            <AppText variant="caption" tone="secondary" style={styles.summaryLabel}>평균 시급</AppText>
                            <AppText variant="titleMd" numberOfLines={1} adjustsFontSizeToFit>
                                ₩{todayWorkSummary.totalWorkTime > 0
                                ? Math.round(todayWorkSummary.totalEarnings / (todayWorkSummary.totalWorkTime / 3600)).toLocaleString()
                                : '0'}
                            </AppText>
                        </View>
                    </View>
                </AppCard>

                {/* 월별 기록 보기 버튼 */}
                <AppButton
                  label="월별 근무 기록 보기"
                  onPress={() => setShowMonthlyView(true)}
                  testID="btnMonthlyRecords"
                  leftIcon={<Ionicons name="calendar-outline" size={18} color={c.textInverse} />}
                />
            </ScrollView>

            {/* 매장 선택 모달 */}
            <Modal
                visible={showStoreSelector}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowStoreSelector(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <AppText variant="headingSm">근무할 매장 선택</AppText>
                            <TouchableOpacity onPress={() => setShowStoreSelector(false)} hitSlop={8}>
                                <Ionicons name="close" size={22} color={c.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={stores}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.storeOption,
                                        selectedStoreId === item.id && styles.storeOptionSelected
                                    ]}
                                    onPress={() => selectStore(item.id)}
                                >
                                    <View style={[styles.storeColorDot, { backgroundColor: item.color }]} />
                                    <View style={styles.storeOptionInfo}>
                                        <AppText variant="titleMd" numberOfLines={1}>{item.name}</AppText>
                                        <AppText variant="caption" tone="secondary">시급: ₩{item.hourlyWage.toLocaleString()}</AppText>
                                    </View>
                                    {selectedStoreId === item.id && (
                                        <Ionicons name="checkmark" size={20} color={c.brandPrimary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* 수동 시간 입력 모달 */}
            <Modal
                visible={showManualModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowManualModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <AppText variant="headingSm">수동 시간 입력</AppText>
                            <TouchableOpacity onPress={() => setShowManualModal(false)} hitSlop={8}>
                                <Ionicons name="close" size={22} color={c.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <AppText variant="caption" weight="600" tone="secondary" style={styles.inputLabel}>매장 선택</AppText>
                            <View style={styles.pickerContainer}>
                                {stores.map((store) => (
                                    <TouchableOpacity
                                        key={store.id}
                                        style={[
                                            styles.pickerItem,
                                            manualRecord.storeId === store.id && styles.pickerItemSelected
                                        ]}
                                        onPress={() => setManualRecord(prev => ({ ...prev, storeId: store.id }))}
                                    >
                                        <View style={[styles.storeColorDot, { backgroundColor: store.color }]} />
                                        <AppText
                                            variant="caption"
                                            weight={manualRecord.storeId === store.id ? '700' : '400'}
                                            tone={manualRecord.storeId === store.id ? 'inverse' : 'secondary'}
                                            numberOfLines={1}>
                                            {store.name}
                                        </AppText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <AppText variant="caption" weight="600" tone="secondary" style={styles.inputLabel}>기록 유형</AppText>
                            <View style={styles.pickerContainer}>
                                {['출근', '퇴근', '휴게시작', '휴게종료'].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.pickerItem,
                                            manualRecord.type === type && styles.pickerItemSelected
                                        ]}
                                        onPress={() => setManualRecord(prev => ({ ...prev, type: type as WorkRecord['type'] }))}
                                    >
                                        <AppText
                                            variant="caption"
                                            weight={manualRecord.type === type ? '700' : '400'}
                                            tone={manualRecord.type === type ? 'inverse' : 'secondary'}>
                                            {type}
                                        </AppText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.timeInputGrid}>
                            <View style={styles.inputGroup}>
                                <AppText variant="caption" weight="600" tone="secondary" style={styles.inputLabel}>시간</AppText>
                                <TextInput
                                    style={styles.inputField}
                                    value={manualRecord.hour}
                                    onChangeText={(text) => setManualRecord(prev => ({ ...prev, hour: text }))}
                                    placeholder="시"
                                    placeholderTextColor={c.textTertiary}
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <AppText variant="caption" weight="600" tone="secondary" style={styles.inputLabel}>분</AppText>
                                <TextInput
                                    style={styles.inputField}
                                    value={manualRecord.minute}
                                    onChangeText={(text) => setManualRecord(prev => ({ ...prev, minute: text }))}
                                    placeholder="분"
                                    placeholderTextColor={c.textTertiary}
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>
                        </View>

                        <AppButton
                            label="기록 추가"
                            onPress={addManualRecord}
                            leftIcon={<Ionicons name="checkmark-circle-outline" size={18} color={c.textInverse} />}
                        />
                    </View>
                </View>
            </Modal>

            {/* 월별 기록 모달 */}
            <Modal
                visible={showMonthlyView}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowMonthlyView(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.monthlyModalContent]}>
                        <View style={styles.modalHeader}>
                            <AppText variant="headingSm">월별 근무 기록</AppText>
                            <TouchableOpacity onPress={() => setShowMonthlyView(false)} hitSlop={8}>
                                <Ionicons name="close" size={22} color={c.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* 월 선택 */}
                        <View style={styles.monthSelector}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {generateMonthOptions().map((month) => (
                                    <TouchableOpacity
                                        key={month}
                                        style={[
                                            styles.monthOption,
                                            selectedMonth === month && styles.monthOptionSelected
                                        ]}
                                        onPress={() => setSelectedMonth(month)}
                                    >
                                        <AppText
                                            variant="caption"
                                            weight={selectedMonth === month ? '700' : '400'}
                                            tone={selectedMonth === month ? 'inverse' : 'secondary'}>
                                            {new Date(month + '-01').toLocaleDateString('ko-KR', {
                                                year: 'numeric',
                                                month: 'long'
                                            })}
                                        </AppText>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* 월별 통계 */}
                        <ScrollView style={styles.monthlyContent}>
                            <View style={styles.monthlyStatsCard}>
                                <AppText variant="headingSm" center style={styles.monthlyStatsTitle}>
                                    {new Date(selectedMonth + '-01').toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long'
                                    })} 통계
                                </AppText>

                                <View style={styles.monthlyStatsGrid}>
                                    <View style={styles.monthlyStatItem}>
                                        <AppText variant="caption" tone="secondary" style={styles.monthlyStatLabel}>총 근무시간</AppText>
                                        <AppText variant="titleMd">{formatTime(monthlyStats.totalWorkTime)}</AppText>
                                    </View>
                                    <View style={styles.monthlyStatItem}>
                                        <AppText variant="caption" tone="secondary" style={styles.monthlyStatLabel}>총 급여</AppText>
                                        <AppText variant="titleMd" numberOfLines={1} adjustsFontSizeToFit>₩{monthlyStats.totalEarnings.toLocaleString()}</AppText>
                                    </View>
                                    <View style={styles.monthlyStatItem}>
                                        <AppText variant="caption" tone="secondary" style={styles.monthlyStatLabel}>근무일수</AppText>
                                        <AppText variant="titleMd">{monthlyStats.workDays}일</AppText>
                                    </View>
                                    <View style={styles.monthlyStatItem}>
                                        <AppText variant="caption" tone="secondary" style={styles.monthlyStatLabel}>평균 일급</AppText>
                                        <AppText variant="titleMd" numberOfLines={1} adjustsFontSizeToFit>
                                            ₩{monthlyStats.workDays > 0
                                            ? Math.round(monthlyStats.totalEarnings / monthlyStats.workDays).toLocaleString()
                                            : '0'}
                                        </AppText>
                                    </View>
                                </View>
                            </View>

                            {/* 매장별 통계 */}
                            <View style={styles.storeBreakdownCard}>
                                <AppText variant="headingSm" style={styles.storeBreakdownTitle}>매장별 상세 통계</AppText>

                                {Object.entries(monthlyStats.storeBreakdown).map(([storeId, storeStats]) => {
                                    const store = stores.find(s => s.id === storeId);
                                    return (
                                        <View key={storeId} style={styles.storeBreakdownItem}>
                                            <View style={styles.storeBreakdownHeader}>
                                                <View style={[styles.storeColorDot, { backgroundColor: store?.color ?? c.brandPrimary }]} />
                                                <AppText variant="titleMd" numberOfLines={1} style={styles.flex}>{storeStats.storeName}</AppText>
                                            </View>

                                            <View style={styles.storeBreakdownStats}>
                                                <View style={styles.storeBreakdownStat}>
                                                    <AppText variant="caption" tone="secondary" style={styles.storeBreakdownStatLabel}>근무시간</AppText>
                                                    <AppText variant="caption" weight="700">{formatTime(storeStats.workTime)}</AppText>
                                                </View>
                                                <View style={styles.storeBreakdownStat}>
                                                    <AppText variant="caption" tone="secondary" style={styles.storeBreakdownStatLabel}>급여</AppText>
                                                    <AppText variant="caption" weight="700">₩{storeStats.earnings.toLocaleString()}</AppText>
                                                </View>
                                                <View style={styles.storeBreakdownStat}>
                                                    <AppText variant="caption" tone="secondary" style={styles.storeBreakdownStatLabel}>근무일</AppText>
                                                    <AppText variant="caption" weight="700">{storeStats.days}일</AppText>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}

                                {Object.keys(monthlyStats.storeBreakdown).length === 0 && (
                                    <AppText variant="bodyMd" tone="secondary" center style={styles.noRecordsText}>해당 월에 근무 기록이 없어요.</AppText>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* 플로팅 타이머 — absolute top:100(노치 침범) 대신 안전영역 기준 inset 배치 */}
            {currentSession.isWorking && (
                <View style={[styles.floatingTimer, { backgroundColor: currentStore.color, top: insets.top + spacing.sm }]}>
                    <Ionicons name="timer-outline" size={14} color={c.textInverse} />
                    <AppText variant="caption" weight="700" tone="inverse" numberOfLines={1} style={styles.floatingTimerText}>
                        {currentStore.name.split(' ')[0]} {getCurrentWorkTime(currentSession)}
                    </AppText>
                </View>
            )}
        </SafeAreaView>
    );
};

const createStyles = (c: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: c.surfaceCanvas,
    },
    header: {
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xxl,
        alignItems: 'center',
    },
    currentTime: {
        opacity: 0.9,
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
    },
    storeSelector: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: radius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        alignItems: 'center',
        width: '100%',
    },
    storeChangeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    storeChangeText: {
        opacity: 0.85,
    },
    workStatus: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        gap: spacing.lg,
    },
    workStatusItem: {
        flex: 1,
        minWidth: 0,
    },
    statusLabel: {
        opacity: 0.85,
        marginBottom: spacing.xs,
    },
    content: {
        flex: 1,
    },
    contentInner: {
        padding: spacing.xxl,
        gap: spacing.xxl,
    },
    card: {
        marginBottom: 0,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    cardIcon: {
        marginRight: spacing.sm,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.xl,
    },
    statBox: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: c.surfaceCanvas,
        borderRadius: radius.lg,
    },
    statLabel: {
        marginBottom: spacing.xs,
    },
    actionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    actionHalf: {
        width: '47%',
        flexGrow: 1,
    },
    storeWorkSection: {
        marginBottom: spacing.lg,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: c.surfaceCanvas,
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        gap: spacing.sm,
    },
    storeColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    storeWorkTitle: {
        flex: 1,
    },
    recordList: {
        paddingHorizontal: spacing.md,
    },
    recordItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: c.background,
        marginBottom: spacing.xs,
        borderRadius: radius.md,
    },
    storeEarnings: {
        padding: spacing.md,
        backgroundColor: c.divider,
        alignItems: 'center',
    },
    noRecordsText: {
        padding: spacing.xl,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    summaryItem: {
        width: '47%',
        flexGrow: 1,
        backgroundColor: c.surfaceCanvas,
        padding: spacing.lg,
        borderRadius: radius.lg,
        alignItems: 'center',
    },
    summaryLabel: {
        marginBottom: spacing.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: c.overlayDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: c.background,
        borderRadius: radius.xxl,
        width: '90%',
        maxWidth: 400,
        padding: spacing.xl,
        maxHeight: '80%',
    },
    monthlyModalContent: {
        maxHeight: '90%',
        height: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    storeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.sm,
        backgroundColor: c.surfaceCanvas,
        gap: spacing.sm,
    },
    storeOptionSelected: {
        backgroundColor: c.brandPrimarySoft,
        borderWidth: 2,
        borderColor: c.brandPrimary,
    },
    storeOptionInfo: {
        flex: 1,
        minWidth: 0,
    },
    inputGroup: {
        marginBottom: spacing.lg,
        flex: 1,
    },
    inputLabel: {
        marginBottom: spacing.sm,
    },
    inputField: {
        width: '100%',
        padding: spacing.md,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: radius.md,
        fontSize: 16,
        color: c.textPrimary,
        backgroundColor: c.background,
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    pickerItem: {
        flexGrow: 1,
        minWidth: '45%',
        padding: spacing.md,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: radius.md,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    pickerItemSelected: {
        backgroundColor: c.brandPrimary,
        borderColor: c.brandPrimary,
    },
    timeInputGrid: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    monthSelector: {
        marginBottom: spacing.xl,
    },
    monthOption: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        marginRight: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: c.surfaceMuted,
    },
    monthOptionSelected: {
        backgroundColor: c.brandSecondary,
    },
    monthlyContent: {
        flex: 1,
    },
    monthlyStatsCard: {
        backgroundColor: c.surfaceCanvas,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    monthlyStatsTitle: {
        marginBottom: spacing.lg,
    },
    monthlyStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    monthlyStatItem: {
        flexGrow: 1,
        minWidth: '45%',
        backgroundColor: c.background,
        padding: spacing.md,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    monthlyStatLabel: {
        marginBottom: spacing.xs,
    },
    storeBreakdownCard: {
        backgroundColor: c.background,
        borderRadius: radius.lg,
        padding: spacing.lg,
    },
    storeBreakdownTitle: {
        marginBottom: spacing.lg,
    },
    storeBreakdownItem: {
        marginBottom: spacing.lg,
        padding: spacing.md,
        backgroundColor: c.surfaceCanvas,
        borderRadius: radius.md,
    },
    storeBreakdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    flex: {
        flex: 1,
    },
    storeBreakdownStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    storeBreakdownStat: {
        alignItems: 'center',
    },
    storeBreakdownStatLabel: {
        marginBottom: spacing.xs,
    },
    floatingTimer: {
        position: 'absolute',
        right: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        ...shadow.lg,
    },
    floatingTimerText: {
        maxWidth: 160,
    },
});

export default MultiStoreWorkScreen;
