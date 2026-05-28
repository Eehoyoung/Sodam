import {AppToast} from '../../../common/components/ds';
import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    Alert,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import SectionCard from '../../../common/components/sections/SectionCard';
import SectionHeader from '../../../common/components/sections/SectionHeader';
import PrimaryButton from '../../../common/components/buttons/PrimaryButton';
import AuthContext from '../../../contexts/AuthContext';
import storeService from '../../store/services/storeService';
import attendanceService from '../../attendance/services/attendanceService';

Dimensions.get('window');

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
    // AuthContext에서 사용자 정보 가져오기
    const { user } = useContext(AuthContext);

    // 매장 데이터 - API 연동
    const [stores, setStores] = useState<Store[]>([]);
    const [loadingStores, setLoadingStores] = useState<boolean>(true);

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
            return { id: '', name: '매장 없음', color: '#999999', hourlyWage: 0 };
        }
        return stores.find(store => store.id === selectedStoreId) ?? stores[0];
    }, [selectedStoreId, stores]);

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
                    color: store.color || '#0066CC', // 기본 색상
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

            Alert.alert('출근 완료', `${currentStore.name}에 출근이 기록됐어요! 💪`);
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

            Alert.alert('퇴근 완료', `${currentStore.name}에서 퇴근이 기록됐어요! 수고하셨어요! 🎉`);
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

            Alert.alert('휴게시간 시작', `${currentStore.name}에서 휴게시간이 시작됐어요! ☕`);
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

            Alert.alert('휴게시간 종료', `${currentStore.name}에서 휴게시간이 종료됐어요! 화이팅! 💪`);
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
            Alert.alert('기록 추가', `${store?.name}에 ${manualRecord.type} 기록이 추가됐어요!`);
        } else {
            Alert.alert('입력 오류', '시간과 분을 모두 입력해 주세요.');
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
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* 헤더 */}
            <LinearGradient
                colors={[currentStore.color, '#243B4A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.userName}>김알바님</Text>
                <Text style={styles.currentTime}>{currentTime}</Text>

                {/* 매장 선택 버튼 */}
                <TouchableOpacity
                    style={styles.storeSelector}
                    onPress={() => setShowStoreSelector(true)}
                >
                    <Text style={styles.storeName}>{currentStore.name}</Text>
                    <Text style={styles.storeChangeText}>매장 변경 ▼</Text>
                </TouchableOpacity>

                <View style={styles.workStatus}>
                    <View>
                        <Text style={styles.statusLabel}>근무 상태</Text>
                        <Text style={styles.statusValue}>{getWorkStatusText()}</Text>
                    </View>
                    <View>
                        <Text style={styles.statusLabel}>오늘 총 근무시간</Text>
                        <Text style={styles.statusValue}>{formatTime(todayWorkSummary.totalWorkTime)}</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* 실시간 근무 현황 */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>⏰</Text>
                        <Text style={styles.cardTitle}>현재 매장 근무 현황</Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>현재 근무시간</Text>
                            <Text style={[styles.statValue, styles.highlight]}>
                                {getCurrentWorkTime(currentSession)}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>예상 급여</Text>
                            <Text style={[styles.statValue, styles.highlight]}>
                                ₩{getExpectedPay(currentSession).toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* 원터치 근태 기록 버튼들 */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                styles.primaryBtn,
                                { backgroundColor: currentStore.color },
                                !currentSession.isWorking ? {} : styles.disabledBtn
                            ]}
                            onPress={clockIn}
                            disabled={currentSession.isWorking}
                        >
                            <Text style={styles.actionBtnText}>🏃‍♂️ 출근</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                styles.secondaryBtn,
                                currentSession.isWorking ? {} : styles.disabledBtn
                            ]}
                            onPress={clockOut}
                            disabled={!currentSession.isWorking}
                        >
                            <Text style={styles.actionBtnText}>🚪 퇴근</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                styles.successBtn,
                                (currentSession.isWorking && !currentSession.isOnBreak) ? {} : styles.disabledBtn
                            ]}
                            onPress={breakStart}
                            disabled={!currentSession.isWorking || currentSession.isOnBreak}
                        >
                            <Text style={styles.actionBtnText}>☕ 휴게시작</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                styles.successBtn,
                                (currentSession.isWorking && currentSession.isOnBreak) ? {} : styles.disabledBtn
                            ]}
                            onPress={breakEnd}
                            disabled={!currentSession.isWorking || !currentSession.isOnBreak}
                        >
                            <Text style={styles.actionBtnText}>💪 휴게종료</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.outlineBtn, styles.fullWidth]}
                        onPress={() => setShowManualModal(true)}
                    >
                        <Text style={[styles.actionBtnText, styles.outlineBtnText]}>✏️ 수동 시간 입력</Text>
                    </TouchableOpacity>
                </View>

                {/* 오늘의 매장별 근무 기록 */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>📝</Text>
                        <Text style={styles.cardTitle}>오늘의 매장별 근무 기록</Text>
                    </View>

                    {Object.entries(todayWorkSummary.stores).map(([storeId, storeData]) => {
                        const store = stores.find(s => s.id === storeId);
                        return (
                            <View key={storeId} style={styles.storeWorkSection}>
                                <View style={[styles.storeHeader, { backgroundColor: store?.color + '20' }]}>
                                    <View style={[styles.storeColorDot, { backgroundColor: store?.color }]} />
                                    <Text style={styles.storeWorkTitle}>{storeData.storeName}</Text>
                                    <Text style={styles.storeWorkTime}>{formatTime(storeData.workTime)}</Text>
                                </View>

                                <View style={styles.recordList}>
                                    {storeData.records.map((record, index) => (
                                        <View key={index} style={styles.recordItem}>
                                            <Text style={styles.recordType}>{record.type}</Text>
                                            <Text style={styles.recordTime}>{record.time}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.storeEarnings}>
                                    <Text style={styles.earningsText}>예상 급여: ₩{storeData.earnings.toLocaleString()}</Text>
                                </View>
                            </View>
                        );
                    })}

                    {Object.keys(todayWorkSummary.stores).length === 0 && (
                        <Text style={styles.noRecordsText}>오늘 근무 기록이 없어요.</Text>
                    )}
                </View>

                {/* 오늘 총 요약 */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>📊</Text>
                        <Text style={styles.cardTitle}>오늘 총 요약</Text>
                    </View>

                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>총 근무시간</Text>
                            <Text style={styles.summaryValue}>{formatTime(todayWorkSummary.totalWorkTime)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>총 예상급여</Text>
                            <Text style={styles.summaryValue}>₩{todayWorkSummary.totalEarnings.toLocaleString()}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>근무 매장수</Text>
                            <Text style={styles.summaryValue}>{Object.keys(todayWorkSummary.stores).length}개</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>평균 시급</Text>
                            <Text style={styles.summaryValue}>
                                ₩{todayWorkSummary.totalWorkTime > 0
                                ? Math.round(todayWorkSummary.totalEarnings / (todayWorkSummary.totalWorkTime / 3600)).toLocaleString()
                                : '0'
                            }
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 월별 기록 보기 버튼 */}
                <PrimaryButton
                  title="📅 월별 근무 기록 보기"
                  onPress={() => setShowMonthlyView(true)}
                  testID="btnMonthlyRecords"
                  accessibilityLabel="월별 근무 기록 보기"
                  style={[styles.fullWidth]}
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
                            <Text style={styles.modalTitle}>근무할 매장 선택</Text>
                            <TouchableOpacity onPress={() => setShowStoreSelector(false)}>
                                <Text style={styles.modalClose}>✕</Text>
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
                                        <Text style={styles.storeOptionName}>{item.name}</Text>
                                        <Text style={styles.storeOptionWage}>시급: ₩{item.hourlyWage.toLocaleString()}</Text>
                                    </View>
                                    {selectedStoreId === item.id && (
                                        <Text style={styles.selectedIcon}>✓</Text>
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
                            <Text style={styles.modalTitle}>수동 시간 입력</Text>
                            <TouchableOpacity onPress={() => setShowManualModal(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>매장 선택</Text>
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
                                        <Text style={[
                                            styles.pickerText,
                                            manualRecord.storeId === store.id && styles.pickerTextSelected
                                        ]}>
                                            {store.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>기록 유형</Text>
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
                                        <Text style={[
                                            styles.pickerText,
                                            manualRecord.type === type && styles.pickerTextSelected
                                        ]}>
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.timeInputGrid}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>시간</Text>
                                <TextInput
                                    style={styles.inputField}
                                    value={manualRecord.hour}
                                    onChangeText={(text) => setManualRecord(prev => ({ ...prev, hour: text }))}
                                    placeholder="시"
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>분</Text>
                                <TextInput
                                    style={styles.inputField}
                                    value={manualRecord.minute}
                                    onChangeText={(text) => setManualRecord(prev => ({ ...prev, minute: text }))}
                                    placeholder="분"
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.primaryBtn, styles.fullWidth]}
                            onPress={addManualRecord}
                        >
                            <Text style={styles.actionBtnText}>✅ 기록 추가</Text>
                        </TouchableOpacity>
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
                            <Text style={styles.modalTitle}>월별 근무 기록</Text>
                            <TouchableOpacity onPress={() => setShowMonthlyView(false)}>
                                <Text style={styles.modalClose}>✕</Text>
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
                                        <Text style={[
                                            styles.monthOptionText,
                                            selectedMonth === month && styles.monthOptionTextSelected
                                        ]}>
                                            {new Date(month + '-01').toLocaleDateString('ko-KR', {
                                                year: 'numeric',
                                                month: 'long'
                                            })}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* 월별 통계 */}
                        <ScrollView style={styles.monthlyContent}>
                            <View style={styles.monthlyStatsCard}>
                                <Text style={styles.monthlyStatsTitle}>
                                    {new Date(selectedMonth + '-01').toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long'
                                    })} 통계
                                </Text>

                                <View style={styles.monthlyStatsGrid}>
                                    <View style={styles.monthlyStatItem}>
                                        <Text style={styles.monthlyStatLabel}>총 근무시간</Text>
                                        <Text style={styles.monthlyStatValue}>{formatTime(monthlyStats.totalWorkTime)}</Text>
                                    </View>
                                    <View style={styles.monthlyStatItem}>
                                        <Text style={styles.monthlyStatLabel}>총 급여</Text>
                                        <Text style={styles.monthlyStatValue}>₩{monthlyStats.totalEarnings.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.monthlyStatItem}>
                                        <Text style={styles.monthlyStatLabel}>근무일수</Text>
                                        <Text style={styles.monthlyStatValue}>{monthlyStats.workDays}일</Text>
                                    </View>
                                    <View style={styles.monthlyStatItem}>
                                        <Text style={styles.monthlyStatLabel}>평균 일급</Text>
                                        <Text style={styles.monthlyStatValue}>
                                            ₩{monthlyStats.workDays > 0
                                            ? Math.round(monthlyStats.totalEarnings / monthlyStats.workDays).toLocaleString()
                                            : '0'
                                        }
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* 매장별 통계 */}
                            <View style={styles.storeBreakdownCard}>
                                <Text style={styles.storeBreakdownTitle}>매장별 상세 통계</Text>

                                {Object.entries(monthlyStats.storeBreakdown).map(([storeId, storeStats]) => {
                                    const store = stores.find(s => s.id === storeId);
                                    return (
                                        <View key={storeId} style={styles.storeBreakdownItem}>
                                            <View style={styles.storeBreakdownHeader}>
                                                <View style={[styles.storeColorDot, { backgroundColor: store?.color }]} />
                                                <Text style={styles.storeBreakdownName}>{storeStats.storeName}</Text>
                                            </View>

                                            <View style={styles.storeBreakdownStats}>
                                                <View style={styles.storeBreakdownStat}>
                                                    <Text style={styles.storeBreakdownStatLabel}>근무시간</Text>
                                                    <Text style={styles.storeBreakdownStatValue}>{formatTime(storeStats.workTime)}</Text>
                                                </View>
                                                <View style={styles.storeBreakdownStat}>
                                                    <Text style={styles.storeBreakdownStatLabel}>급여</Text>
                                                    <Text style={styles.storeBreakdownStatValue}>₩{storeStats.earnings.toLocaleString()}</Text>
                                                </View>
                                                <View style={styles.storeBreakdownStat}>
                                                    <Text style={styles.storeBreakdownStatLabel}>근무일</Text>
                                                    <Text style={styles.storeBreakdownStatValue}>{storeStats.days}일</Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}

                                {Object.keys(monthlyStats.storeBreakdown).length === 0 && (
                                    <Text style={styles.noDataText}>해당 월에 근무 기록이 없어요.</Text>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* 플로팅 타이머 */}
            {currentSession.isWorking && (
                <View style={[styles.floatingTimer, { backgroundColor: currentStore.color }]}>
                    <Text style={styles.floatingTimerText}>
                        {currentStore.name.split(' ')[0]} ⏱️ {getCurrentWorkTime(currentSession)}
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F4EF',
    },
    header: {
        padding: 20,
        paddingTop: 40,
        alignItems: 'center',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    currentTime: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 16,
    },
    storeSelector: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
        width: '100%',
    },
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    storeChangeText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    workStatus: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    statusLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E2823',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F7F4EF',
        borderRadius: 12,
    },
    statLabel: {
        fontSize: 12,
        color: '#625B55',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2E2823',
    },
    highlight: {
        color: '#FF6B35',
    },
    actionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    actionBtn: {
        flex: 1,
        minWidth: '45%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtn: {
        backgroundColor: '#FF6B35',
    },
    secondaryBtn: {
        backgroundColor: '#243B4A',
    },
    successBtn: {
        backgroundColor: '#12A87B',
    },
    outlineBtn: {
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#E8E0D8',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    fullWidth: {
        minWidth: '100%',
    },
    actionBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    outlineBtnText: {
        color: '#4A433D',
    },
    storeWorkSection: {
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E8E0D8',
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        justifyContent: 'space-between',
    },
    storeColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    storeWorkTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E2823',
    },
    storeWorkTime: {
        fontSize: 14,
        fontWeight: '600',
        color: '#243B4A',
    },
    recordList: {
        paddingHorizontal: 12,
    },
    recordItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F7F4EF',
        marginBottom: 4,
        borderRadius: 6,
    },
    recordType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2E2823',
    },
    recordTime: {
        fontSize: 14,
        color: '#625B55',
    },
    storeEarnings: {
        padding: 12,
        backgroundColor: '#EFE7DF',
        alignItems: 'center',
    },
    earningsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#243B4A',
    },
    noRecordsText: {
        textAlign: 'center',
        color: '#625B55',
        fontSize: 16,
        padding: 20,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    summaryItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#F7F4EF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#625B55',
        marginBottom: 8,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#243B4A',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '90%',
        maxWidth: 400,
        padding: 20,
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
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E2823',
    },
    modalClose: {
        fontSize: 18,
        color: '#625B55',
        padding: 5,
    },
    storeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#F7F4EF',
    },
    storeOptionSelected: {
        backgroundColor: '#E0F2FE',
        borderWidth: 2,
        borderColor: '#243B4A',
    },
    storeOptionInfo: {
        flex: 1,
        marginLeft: 8,
    },
    storeOptionName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E2823',
        marginBottom: 4,
    },
    storeOptionWage: {
        fontSize: 14,
        color: '#625B55',
    },
    selectedIcon: {
        fontSize: 18,
        color: '#243B4A',
        fontWeight: 'bold',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4A433D',
        marginBottom: 8,
    },
    inputField: {
        width: '100%',
        padding: 12,
        borderWidth: 2,
        borderColor: '#E8E0D8',
        borderRadius: 8,
        fontSize: 16,
        backgroundColor: 'white',
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pickerItem: {
        flex: 1,
        minWidth: '45%',
        padding: 12,
        borderWidth: 1,
        borderColor: '#E8E0D8',
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    pickerItemSelected: {
        backgroundColor: '#FF6B35',
        borderColor: '#FF6B35',
    },
    pickerText: {
        fontSize: 14,
        color: '#4A433D',
    },
    pickerTextSelected: {
        color: 'white',
        fontWeight: 'bold',
    },
    timeInputGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    monthSelector: {
        marginBottom: 20,
    },
    monthOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20,
        backgroundColor: '#EFE7DF',
    },
    monthOptionSelected: {
        backgroundColor: '#243B4A',
    },
    monthOptionText: {
        fontSize: 14,
        color: '#625B55',
    },
    monthOptionTextSelected: {
        color: 'white',
        fontWeight: 'bold',
    },
    monthlyContent: {
        flex: 1,
    },
    monthlyStatsCard: {
        backgroundColor: '#F7F4EF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    monthlyStatsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E2823',
        marginBottom: 16,
        textAlign: 'center',
    },
    monthlyStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    monthlyStatItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    monthlyStatLabel: {
        fontSize: 12,
        color: '#625B55',
        marginBottom: 4,
    },
    monthlyStatValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#243B4A',
    },
    storeBreakdownCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
    },
    storeBreakdownTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E2823',
        marginBottom: 16,
    },
    storeBreakdownItem: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#F7F4EF',
        borderRadius: 8,
    },
    storeBreakdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    storeBreakdownName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E2823',
    },
    storeBreakdownStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    storeBreakdownStat: {
        alignItems: 'center',
    },
    storeBreakdownStatLabel: {
        fontSize: 12,
        color: '#625B55',
        marginBottom: 4,
    },
    storeBreakdownStatValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#243B4A',
    },
    noDataText: {
        textAlign: 'center',
        color: '#625B55',
        fontSize: 16,
        padding: 20,
    },
    floatingTimer: {
        position: 'absolute',
        top: 100,
        right: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    floatingTimerText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'white',
    },
});

export default MultiStoreWorkScreen;
