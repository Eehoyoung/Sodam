/**
 * 45 PersonalHome — v3("링 & 패스") 적용 완료(2026-07-21).
 * 시안: docs/260720/artifacts/sodam-v3-03-employee.html "45 PersonalHome" 카드
 *   (spot-card 현재 매장 근무 현황 + cols3 칩버튼(출근/휴게/퇴근) + money-card 이번 달 요약).
 * 기능(다중 근무지 출퇴근 기록, 수동 시간 입력, 월별 통계 모달 등)은 기존 그대로이며 시각 레이어만 v3 토큰으로 전환.
 * "수동 시간 입력" 버튼은 78 ManualRecordSheet(AttendanceSheets.tsx)로 배선(2026-07-21) —
 *   레거시 자체 모달(매장선택+유형+시/분 피커)을 대체. 제출 로직은 handleManualSave 에 그대로 유지
 *   (서버 API 미사용, 이 화면의 로컬 기록장에만 저장 — 기존 동작 무변경).
 */
/* eslint-disable react-native/no-unused-styles -- styles built via createStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import {AppToast, AppButton, AppCard, AppText, AmountText, MoneyCard} from '../../../common/components/ds';
import {ManualRecordSheet} from '../../attendance/components/AttendanceSheets';
import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import {
    View,
    ScrollView,
    Modal,
    StyleSheet,
    StatusBar,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, radius, shadow, spacing} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import AuthContext from '../../../contexts/AuthContext';
import storeService from '../../store/services/storeService';

// 타입 정의
export interface Store {
    id: string;
    name: string;
    color: string;
    hourlyWage: number;
}

export interface WorkRecord {
    id: string;
    storeId: string;
    storeName: string;
    type: '출근' | '퇴근' | '휴게시작' | '휴게종료';
    time: string;
    date: string;
    timestamp: number;
}

export interface WorkSession {
    storeId: string;
    storeName: string;
    startTime: Date | null;
    breakStartTime: Date | null;
    isWorking: boolean;
    isOnBreak: boolean;
    totalWorkTime: number; // 초 단위
    totalBreakTime: number; // 초 단위
}

/** 개발용 시각 검증 전용 — 실 API(매장 목록) 호출과 초 단위 타이머 리렌더를 우회하고 고정 상태를 표시한다. */
export interface PersonalUserVisualFixture {
    stores: Store[];
    selectedStoreId?: string;
    workSessions?: { [storeId: string]: WorkSession };
    allRecords?: WorkRecord[];
    selectedMonth?: string;
    /** 근무 경과시간·"오늘" 날짜 계산을 고정하는 캡처 시각(ms) — 없으면 Date.now() 사용. */
    nowMs?: number;
}

interface PersonalUserScreenProps {
    visualFixture?: PersonalUserVisualFixture;
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

const MultiStoreWorkScreen: React.FC<PersonalUserScreenProps> = ({visualFixture}) => {
    const c = useThemeColors();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(c), [c]);

    // AuthContext에서 사용자 정보 가져오기
    const { user } = useContext(AuthContext);

    // 개발용 시각 검증 전용 — 캡처 시각을 고정할 수 있게 하는 헬퍼. 실사용(visualFixture 없음)에는 항상 실시간을 그대로 쓴다.
    const getNow = useCallback(
        () => (visualFixture?.nowMs !== undefined ? new Date(visualFixture.nowMs) : new Date()),
        [visualFixture?.nowMs],
    );

    // 매장 데이터 - API 연동
    const [stores, setStores] = useState<Store[]>(visualFixture?.stores ?? []);
    const [, setLoadingStores] = useState<boolean>(!visualFixture);

    // 상태 관리
    const [currentTime, setCurrentTime] = useState<string>('');
    const [selectedStoreId, setSelectedStoreId] = useState<string>(
        visualFixture?.selectedStoreId ?? visualFixture?.stores?.[0]?.id ?? '',
    );
    const [workSessions, setWorkSessions] = useState<{ [storeId: string]: WorkSession }>(visualFixture?.workSessions ?? {});
    const [allRecords, setAllRecords] = useState<WorkRecord[]>(visualFixture?.allRecords ?? []);
    const [showStoreSelector, setShowStoreSelector] = useState<boolean>(false);
    const [showManualModal, setShowManualModal] = useState<boolean>(false);
    const [showMonthlyView, setShowMonthlyView] = useState<boolean>(false);
    const [selectedMonth, setSelectedMonth] = useState<string>(
        visualFixture?.selectedMonth ?? getNow().toISOString().slice(0, 7),
    );

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
    const today = useMemo(() => getNow().toISOString().slice(0, 10), [getNow]);

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
                workTime += (getNow().getTime() - session.startTime.getTime()) / 1000;
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
    }, [todayRecords, workSessions, stores, today, getNow]);

    // 월별 통계 계산기 — monthKey 를 인자로 받아, 모달의 selectedMonth 뿐 아니라
    // 홈 화면 money-card(이번 달 요약)에도 동일 로직을 재사용한다.
    const computeMonthlyStats = useCallback((monthKey: string): MonthlyStats => {
        const monthRecords = allRecords.filter(record =>
            record.date.startsWith(monthKey)
        );

        const stats: MonthlyStats = {
            month: monthKey,
            totalWorkTime: 0,
            totalEarnings: 0,
            workDays: 0,
            storeBreakdown: {},
        };

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
    }, [allRecords, stores]);

    const monthlyStats = useMemo(() => computeMonthlyStats(selectedMonth), [computeMonthlyStats, selectedMonth]);

    // 이번 달(실제 현재 달, 모달의 selectedMonth 와 독립) — 홈 화면 money-card 전용.
    const currentMonthKey = useMemo(() => today.slice(0, 7), [today]);
    const thisMonthStats = useMemo(() => computeMonthlyStats(currentMonthKey), [computeMonthlyStats, currentMonthKey]);

    // 매장 데이터 로딩 (API 연동)
    useEffect(() => {
        if (visualFixture) {
            return;
        }
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
                    color: store.color || colors.brandPrimary, // 기본 색상 (v3 브랜드 코랄, 테마 독립 정적 토큰)
                    hourlyWage: store.storeStandardHourWage || 10000,
                }));

                setStores(mappedStores);

                // 첫 번째 매장을 기본 선택
                if (mappedStores.length > 0) {
                    setSelectedStoreId(mappedStores[0].id);
                }
            } catch (error) {
                console.error('매장 로딩 실패:', error);
                AppToast.error('매장 정보를 불러올 수 없어요.');
            } finally {
                setLoadingStores(false);
            }
        };

        loadStores();
    }, [user?.id, visualFixture]);

    // 현재 시간 업데이트
    useEffect(() => {
        const updateTime = () => {
            const now = getNow();
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
        // 개발용 시각 검증 전용 — fixture 모드에서는 초 단위 인터벌을 걸지 않아 캡처 간 값이 흔들리지 않게 한다.
        if (visualFixture) {
            return;
        }
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [getNow, visualFixture]);

    // 실시간 근무시간 업데이트
    useEffect(() => {
        if (visualFixture) {
            return;
        }
        const interval = setInterval(() => {
            setWorkSessions(prev => ({ ...prev })); // 강제 리렌더링
        }, 1000);
        return () => clearInterval(interval);
    }, [visualFixture]);

    // 현재 근무시간 계산
    const getCurrentWorkTime = (session: WorkSession): string => {
        if (!session.isWorking || !session.startTime || session.isOnBreak) {
            const totalSeconds = session.totalWorkTime;
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        const now = getNow();
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

        const now = getNow();
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

    // 기록 추가 (date 생략 시 오늘 날짜)
    const addRecord = (type: WorkRecord['type'], time: string, storeId: string, date: string = today) => {
        const store = stores.find(s => s.id === storeId);
        if (!store) {return;}

        const newRecord: WorkRecord = {
            id: Date.now().toString(),
            storeId,
            storeName: store.name,
            type,
            time,
            date,
            timestamp: Date.now(),
        };

        setAllRecords(prev => [...prev, newRecord]);
    };

    // 78 ManualRecordSheet 저장 — 현재 선택된 매장(currentStore) 기준으로 출근/퇴근 기록을 한 번에 추가한다.
    // 사장 승인 없이 이 화면의 로컬 기록장에만 저장되는 기존 동작(서버 API 미사용)은 그대로 유지.
    const handleManualSave = (v: {date: string; checkIn: string; checkOut: string; breakMin: string}) => {
        const isValidIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(v.date);
        const isValidHHmm = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

        if (!isValidIsoDate || !isValidHHmm(v.checkIn) || !isValidHHmm(v.checkOut)) {
            AppToast.warn('근무일과 출퇴근 시간을 올바르게 입력해 주세요.');
            return;
        }
        if (!currentStore.id) {
            AppToast.warn('먼저 매장을 선택해 주세요.');
            return;
        }

        addRecord('출근', v.checkIn, currentStore.id, v.date);
        addRecord('퇴근', v.checkOut, currentStore.id, v.date);
        setShowManualModal(false);
        AppToast.success(`${currentStore.name}에 수동 기록이 추가됐어요!`);
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
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* 상단 헤더 — v3: 어두운 그라디언트 히어로 대신 흰 배경 헤더(D-2 준수) */}
            <View style={[styles.topHeader, {borderBottomColor: c.divider, backgroundColor: c.background}]}>
                <View style={styles.topHeaderMain}>
                    <AppText variant="headingSm">{user?.name ?? '회원'}님</AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.currentTime}>{currentTime}</AppText>
                </View>

                {/* 매장 선택 버튼 */}
                <TouchableOpacity
                    style={[styles.storeSwitchBtn, {borderColor: c.border, backgroundColor: c.surfaceCanvas}]}
                    onPress={() => setShowStoreSelector(true)}
                >
                    <AppText variant="caption" weight="700" numberOfLines={1} style={styles.storeSwitchLabel}>
                        {currentStore.name}
                    </AppText>
                    <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
                {/* 45 PersonalHome(시안) — spot-card: 현재 매장 근무 현황 */}
                <AppCard variant="spot" style={styles.card}>
                    <AppText variant="titleMd" weight="700">{currentStore.name}</AppText>
                    <AppText variant="caption" tone="secondary" style={styles.spotDesc}>
                        {currentSession.isWorking
                            ? `${getWorkStatusText()} · 오늘 ${formatTime(todayWorkSummary.totalWorkTime)} 근무했어요.`
                            : todayWorkSummary.totalWorkTime > 0
                                ? `오늘 ${formatTime(todayWorkSummary.totalWorkTime)} 근무 기록이 있어요.`
                                : '오늘 기록 없음 · 사장님 승인 없이 내 시간을 직접 기록해요.'}
                    </AppText>

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

                    {/* 원터치 근태 기록 3버튼(시안 cols3 — 출근/휴게/퇴근) */}
                    <View style={styles.chipRow}>
                        <AppButton
                            label="출근"
                            size="sm"
                            onPress={clockIn}
                            disabled={currentSession.isWorking}
                            style={styles.chipBtn}
                            leftIcon={<Ionicons name="enter-outline" size={16} color={c.textInverse} />}
                        />
                        <AppButton
                            label={currentSession.isOnBreak ? '휴게 종료' : '휴게'}
                            size="sm"
                            variant="outline"
                            onPress={currentSession.isOnBreak ? breakEnd : breakStart}
                            disabled={!currentSession.isWorking}
                            style={styles.chipBtn}
                            leftIcon={
                                <Ionicons
                                    name={currentSession.isOnBreak ? 'play-outline' : 'cafe-outline'}
                                    size={16}
                                    color={c.brandPrimary}
                                />
                            }
                        />
                        <AppButton
                            label="퇴근"
                            size="sm"
                            variant="secondary"
                            onPress={clockOut}
                            disabled={!currentSession.isWorking}
                            style={styles.chipBtn}
                            leftIcon={<Ionicons name="exit-outline" size={16} color={c.brandSecondary} />}
                        />
                    </View>

                    <AppButton
                        label="수동 시간 입력"
                        size="md"
                        variant="ghost"
                        onPress={() => setShowManualModal(true)}
                        leftIcon={<Ionicons name="create-outline" size={18} color={c.brandPrimary} />}
                    />
                </AppCard>

                {/* money-card(시안) — 이번 달 요약 */}
                <MoneyCard
                    label="이번 달"
                    value={`${(thisMonthStats.totalWorkTime / 3600).toFixed(1)}h · ₩${thisMonthStats.totalEarnings.toLocaleString()}`}
                    sub={`${thisMonthStats.workDays}일 근무 · 매장 ${Object.keys(thisMonthStats.storeBreakdown).length}곳`}
                    style={styles.card}
                />

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

            {/* 78 ManualRecordSheet — 레거시 자체 수동기록 모달(매장선택+유형+시/분) 대체.
                제출 로직(로컬 기록장에만 저장, 서버 API 미사용)은 handleManualSave 로 그대로 유지,
                UI만 확정 시안 바텀시트로 교체(현재 선택된 매장 currentStore 기준 출근·퇴근 동시 기록). */}
            <ManualRecordSheet
                visible={showManualModal}
                onClose={() => setShowManualModal(false)}
                onSave={handleManualSave}
            />

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
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    topHeaderMain: {
        flexShrink: 1,
        minWidth: 0,
    },
    currentTime: {
        marginTop: 2,
    },
    storeSwitchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxWidth: 160,
    },
    storeSwitchLabel: {
        flexShrink: 1,
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
    spotDesc: {
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
    },
    chipRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    chipBtn: {
        flex: 1,
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
