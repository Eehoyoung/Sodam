/* eslint-disable react-native/no-color-literals -- 그라디언트 카드 위 데코/디바이더(rgba) 고정값. MasterMyPageScreen과 동일 패턴. */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AmountText,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useAuth} from '../../../contexts/AuthContext';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {formatWage} from '../../../common/format/money';
import {formatTimer, parseServerDateTime} from '../../../common/format/dateTime';
import {
    fetchMyShifts,
    shortTime,
    thisWeekRange,
    WorkShift,
} from '../../shift/services/shiftService';
import storeService from '../../store/services/storeService';
import attendanceService, {MonthlyAttendanceItem} from '../services/attendanceService';
import {wageService} from '../../wage/services/wageService';
import {requestApproval} from '../services/attendanceApprovalService';
import {useStoreLiveSync} from '../../../common/realtime/useStoreLiveSync';
import contractService from '../../contract/services/contractService';
import {fetchMyNotices} from '../../notice/services/noticeService';
import policyService from '../../info/services/policyService';
import SectionCard from '../../../common/components/sections/SectionCard';
import SectionHeader from '../../../common/components/sections/SectionHeader';
import RoleTabBar from '../../../common/components/navigation/RoleTabBar';
import {gradient, radius, recruit, shadow, spacing} from '../../../theme/tokens';
import {useManagedStores} from '../../manager/hooks/useManagedStores';

type AttendanceState = 'IDLE' | 'WORKING' | 'DONE' | 'LOADING';

interface MyStore {
    id: number;
    storeName: string;
    appliedHourlyWage: number;
}

type TodayAttendance = MonthlyAttendanceItem;

interface PolicyInfo {
    id: number;
    title: string;
    deadline: string;
    isNew: boolean;
}

interface QuickMenuItem {
    key: string;
    label: string;
    icon: string;
    onPress: () => void;
    color: {bg: string; icon: string};
    badge?: string;
    isNew?: boolean;
}

const EmployeeAttendanceHome: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {user} = useAuth();
    const c = useThemeColors();
    const {width} = useWindowDimensions();
    const managedStores = useManagedStores();

    // 본문 좌우 여백(spacing.lg) + 퀵메뉴 2개 간격(spacing.sm) 제외 후 3등분
    const QUICK_ITEM_W = (width - spacing.lg * 2 - spacing.sm * 2) / 3;

    const [state, setState] = useState<AttendanceState>('LOADING');
    const [stores, setStores] = useState<MyStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null);
    const [weekShifts, setWeekShifts] = useState<WorkShift[]>([]);
    const [monthlyAttendances, setMonthlyAttendances] = useState<TodayAttendance[]>([]);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [tick, setTick] = useState(0);
    const [policies, setPolicies] = useState<PolicyInfo[]>([]);
    const [pendingContractCount, setPendingContractCount] = useState(0);
    const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);

    const selectedStore = useMemo(
        () => stores.find(store => store.id === selectedStoreId) ?? stores[0] ?? null,
        [stores, selectedStoreId],
    );

    const loadStores = useCallback(async () => {
        try {
            setState('LOADING');
            if (!user?.id) {
                setStores([]);
                setSelectedStoreId(null);
                setState('IDLE');
                return;
            }

            const [storeList, wageList] = await Promise.all([
                storeService.getEmployeeStores(user.id),
                Promise.resolve([] as Array<{storeId: number; hourlyWage: number}>),
            ]);
            const wageByStore = wageList.reduce<Record<number, number>>((acc, item) => {
                acc[item.storeId] = item.hourlyWage;
                return acc;
            }, {});
            const mapped = storeList.map(store => ({
                id: store.id,
                storeName: store.storeName,
                appliedHourlyWage: wageByStore[store.id] ?? store.storeStandardHourWage ?? 0,
            }));

            setStores(mapped);
            setSelectedStoreId(prev => prev ?? mapped[0]?.id ?? null);
            if (mapped.length === 0) {
                setState('IDLE');
            }
        } catch (error) {
            console.warn('[EmployeeAttendanceHome] loadStores failed', error);
            AppToast.error('매장 정보를 불러오지 못했어요.');
            setState('IDLE');
        }
    }, [user?.id]);

    const loadStoreScopedData = useCallback(async (store: MyStore) => {
        if (!user?.id) {
            return;
        }
        try {
            setState('LOADING');
            const now = new Date();
            const {from, to} = thisWeekRange(now);
            const [today, shiftList, monthList, wageInfo] = await Promise.all([
                attendanceService.getTodayForStore(user.id, store.id).catch(() => null),
                fetchMyShifts(from, to).catch(() => []),
                attendanceService
                    .getMonthlyAttendance(user.id, now.getFullYear(), now.getMonth() + 1)
                    .catch(() => [] as TodayAttendance[]),
                wageService.getEmployeeWage(user.id, store.id).catch(() => null),
            ]);

            const wage = wageInfo?.hourlyWage ?? store.appliedHourlyWage;
            setStores(prev => prev.map(item => (
                item.id === store.id ? {...item, appliedHourlyWage: wage} : item
            )));

            setTodayRecord(today);
            setWeekShifts(shiftList.filter(item => item.storeId === store.id));
            setMonthlyAttendances(monthList.filter(item => item.storeId === store.id));
            setState(determineState(today));
        } catch (error) {
            console.warn('[EmployeeAttendanceHome] loadStoreScopedData failed', error);
            setTodayRecord(null);
            setWeekShifts([]);
            setMonthlyAttendances([]);
            setState('IDLE');
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            loadStores();
            managedStores.refetch();
            // 포커스 복귀 시 현재 매장 출퇴근 상태를 항상 최신화한다.
            // (매장이 동일하면 아래 useEffect[selectedStore?.id]가 재실행되지 않아,
            //  사장 승인 출근/퇴근 등 외부 변경 후에도 WORKING/IDLE 이 stale 로 남던 버그 수정.)
            if (selectedStore) {
                loadStoreScopedData(selectedStore);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        // managedStores.refetch is stable; depending on the whole query result would recreate the focus callback.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [loadStores, selectedStore?.id, loadStoreScopedData, managedStores.refetch]),
    );

    // 실시간 동기화 — 내 매장의 출퇴근/직원 변경 시(보고 있는 동안) 선택 매장 데이터 즉시 갱신.
    useStoreLiveSync(stores.map(s => s.id), () => {
        if (selectedStore) {
            loadStoreScopedData(selectedStore);
        }
    });

    useEffect(() => {
        if (!selectedStore || !user?.id) {
            return;
        }
        loadStoreScopedData(selectedStore);
        // ⚠️ deps 에 selectedStore(객체)를 넣으면 무한 루프: loadStoreScopedData 가 setStores 로
        // stores 를 갱신 → selectedStore 객체 정체성 변경 → 이 effect 재실행 → … 반복.
        // 매장 식별은 id 로 충분하므로 selectedStore?.id 만 의존한다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStore?.id, user?.id, loadStoreScopedData]);

    useEffect(() => {
        if (state !== 'WORKING') {
            return;
        }
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [state]);

    // 정부 지원 정책 — MasterMyPageScreen 과 동일 패턴(상위 3건만 요약 표시).
    useFocusEffect(
        useCallback(() => {
            (async () => {
                try {
                    const policyDtos: any[] = await policyService.getPoliciesByCategory('ALL');
                    setPolicies((policyDtos || []).slice(0, 3).map((dto: any) => {
                        const createdAt = dto.publishDate || dto.createdAt || new Date().toISOString();
                        const isNew = Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
                        return {
                            id: Number(dto.id),
                            title: dto.title || '',
                            deadline: (dto.updatedAt || createdAt).toString().slice(0, 10),
                            isNew,
                        };
                    }));
                } catch {/* 보조 정보 무시 */}
            })();
        }, []),
    );

    // 알림 스트립 — 이미 존재하는 서비스 함수(내 계약서/내 공지)로만 계산. 새 BE 엔드포인트 추가 없음.
    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                try {
                    const contracts = await contractService.getMyContracts();
                    if (active) {
                        setPendingContractCount(contracts.filter(item => !item.signed).length);
                    }
                } catch {
                    if (active) {setPendingContractCount(0);}
                }
                try {
                    const notices = await fetchMyNotices();
                    if (active) {
                        setUnreadNoticeCount(notices.filter(item => !item.readByMe).length);
                    }
                } catch {
                    if (active) {setUnreadNoticeCount(0);}
                }
            })();
            return () => {
                active = false;
            };
        }, []),
    );

    const workingDuration = useMemo(() => {
        if (state !== 'WORKING' || !todayRecord?.checkInTime) {
            return '00:00:00';
        }
        const start = parseServerDateTime(todayRecord.checkInTime).getTime();
        return formatTimer(Math.max(0, Date.now() - start) / 1000);
    }, [state, todayRecord?.checkInTime, tick]);

    const todaySchedule = useMemo(() => {
        const today = toIsoDate(new Date());
        return weekShifts.find(item => item.shiftDate === today) ?? null;
    }, [weekShifts]);

    const tomorrowSchedule = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const tomorrow = toIsoDate(d);
        return weekShifts.find(item => item.shiftDate === tomorrow) ?? null;
    }, [weekShifts]);

    const monthlySummary = useMemo(() => {
        const attendanceDays = new Set<string>();
        let estimatedWage = 0;
        for (const item of monthlyAttendances) {
            if (item.checkInTime) {
                attendanceDays.add(item.checkInTime.slice(0, 10));
            }
            if (typeof item.dailyWage === 'number') {
                estimatedWage += item.dailyWage;
                continue;
            }
            const hours = typeof item.workingHours === 'number'
                ? item.workingHours
                : (item.workingMinutes ?? 0) / 60;
            estimatedWage += Math.round(hours * (item.appliedHourlyWage ?? selectedStore?.appliedHourlyWage ?? 0));
        }
        if (state === 'WORKING' && todayRecord?.checkInTime && selectedStore) {
            const elapsedHours = Math.max(0, Date.now() - parseServerDateTime(todayRecord.checkInTime).getTime()) / 3600000;
            estimatedWage += Math.round(elapsedHours * selectedStore.appliedHourlyWage);
            attendanceDays.add(todayRecord.checkInTime.slice(0, 10));
        }
        return {
            attendanceDays: attendanceDays.size,
            estimatedWage,
        };
    }, [monthlyAttendances, selectedStore, state, todayRecord]);

    // 이번 달 근무시간(신규) — monthlySummary(estimatedWage/attendanceDays)는 그대로 두고 옆에 시간 합산만 추가.
    const monthlyWorkedMinutes = useMemo(() => {
        let minutes = 0;
        for (const item of monthlyAttendances) {
            if (typeof item.workingMinutes === 'number') {
                minutes += item.workingMinutes;
            } else if (typeof item.workingHours === 'number') {
                minutes += item.workingHours * 60;
            }
        }
        if (state === 'WORKING' && todayRecord?.checkInTime) {
            minutes += Math.max(0, Date.now() - parseServerDateTime(todayRecord.checkInTime).getTime()) / 60000;
        }
        return minutes;
    }, [monthlyAttendances, state, todayRecord?.checkInTime, tick]);
    const monthlyWorkedHoursLabel = `${Math.round(monthlyWorkedMinutes / 60)}시간`;

    // 매장 헤더의 '시급'은 현재 적용 시급(wages 엔드포인트로 갱신된 selectedStore)을 우선 표시한다.
    // todayRecord.appliedHourlyWage 는 출근 시점에 고정된 값이라, 사장이 시급을 바꿔도 반영되지 않는다
    // (그래서 시급 변경이 직원 화면에 안 보이던 문제). 오늘 급여 계산엔 여전히 출근시점 시급을 쓴다.
    const currentWage = selectedStore?.appliedHourlyWage ?? todayRecord?.appliedHourlyWage ?? 0;
    const isWorking = state === 'WORKING';

    const [approvalBusy, setApprovalBusy] = useState(false);

    // 위치/NFC 없이 사장 승인으로 출퇴근 — 요청 버튼. 누르면 사장에게 알림이 가고, 승인 시 요청 시각으로 처리된다.
    const requestApprovalPunch = async () => {
        if (!selectedStore) {
            AppToast.show('먼저 매장에 합류해 주세요.');
            navigation.navigate('JoinStoreByCode');
            return;
        }
        if (state === 'DONE') {
            AppToast.show('오늘은 이미 퇴근 완료됐어요.');
            return;
        }
        const reqType = isWorking ? 'CHECK_OUT' : 'CHECK_IN';
        setApprovalBusy(true);
        try {
            await requestApproval(selectedStore.id, reqType);
            AppToast.success(reqType === 'CHECK_IN'
                ? '출근 승인을 요청했어요. 사장님 승인을 기다려 주세요.'
                : '퇴근 승인을 요청했어요. 사장님 승인을 기다려 주세요.');
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || '요청에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setApprovalBusy(false);
        }
    };

    const handlePunch = () => {
        if (!selectedStore) {
            AppToast.show('먼저 매장에 합류해 주세요.');
            navigation.navigate('JoinStoreByCode');
            return;
        }
        if (state === 'DONE') {
            AppToast.show('오늘은 이미 퇴근 완료됐어요.');
            return;
        }
        navigation.navigate('Attendance');
    };

    const nameInitial = (user?.name ?? '직원').charAt(0);
    const today = new Date();
    const dateLabel = today.toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });
    const pendingDelegation = managedStores.data?.find(store => !store.active && !!store.signatureEnvelopeId);
    const activeManagedStores = managedStores.data?.filter(store => store.active) ?? [];
    const showAlertStrip = pendingContractCount > 0 || unreadNoticeCount > 0 || !!pendingDelegation;

    const quickMenus: QuickMenuItem[] = [
        ...(activeManagedStores.length > 0 ? [{
            key: 'manager', label: '매장 관리', icon: 'shield-checkmark-outline',
            // 위임 매장이 하나면 바로 대시보드, 여럿이면 매장을 고를 수 있는 위임 현황 목록으로 보낸다.
            onPress: () => activeManagedStores.length === 1
                ? navigation.navigate('OwnerDashboard', {storeId: activeManagedStores[0].storeId, managerMode: true})
                : navigation.navigate('ManagerMyPageScreen'),
            color: {bg: c.brandPrimarySoft, icon: c.brandPrimary},
        }] : []),
        {
            key: 'shift', label: '내 스케줄', icon: 'calendar-outline',
            onPress: () => navigation.navigate('MyShift'),
            color: {bg: c.brandPrimarySoft, icon: c.brandPrimary},
        },
        {
            key: 'salary', label: '급여명세', icon: 'wallet-outline',
            onPress: () => navigation.navigate('SalaryArchive'),
            color: {bg: c.infoBg, icon: c.info},
        },
        {
            key: 'contract', label: '계약서', icon: 'document-text-outline',
            onPress: () => navigation.navigate('MyContract'),
            color: {bg: c.warningBg, icon: c.warning},
            badge: pendingContractCount > 0 ? (pendingContractCount > 9 ? '9+' : String(pendingContractCount)) : undefined,
        },
        {
            key: 'leave', label: '내 연차', icon: 'umbrella-outline',
            onPress: () => navigation.navigate('MyLeaveBalance'),
            color: {bg: c.surfaceMint, icon: c.success},
        },
        {
            key: 'timeOffRequest', label: '휴가 신청', icon: 'calendar-clear-outline',
            onPress: () => {
                if (!selectedStore) {
                    AppToast.show('먼저 소속 매장을 선택해 주세요.');
                    return;
                }
                navigation.navigate('TimeOffRequest', {storeId: selectedStore.id});
            },
            color: {bg: c.brandPrimarySoft, icon: c.brandPrimary},
        },
        {
            // 인증채용(구직·구인) 진입점 — 260711_작업통합.md Part 2 §18-8·§19.4.
            // 구 '내 요청'(request) 타일을 키 기반으로 교체(배열 길이·나머지 타일 위치 불변).
            key: 'recruitment', label: '채용·구직', icon: 'briefcase-outline',
            onPress: () => navigation.navigate('EmployeeRecruitment'),
            color: {bg: recruit.primarySoft, icon: recruit.primary},
        },
        {
            key: 'attendanceNotice', label: '지각/조퇴/결근 알리기', icon: 'alert-circle-outline',
            onPress: () => {
                if (!selectedStore) {
                    AppToast.show('먼저 소속 매장을 선택해 주세요.');
                    return;
                }
                navigation.navigate('AttendanceNotice', {storeId: selectedStore.id});
            },
            color: {bg: c.warningBg, icon: c.warning},
        },
        {
            key: 'wage', label: '시급 이력', icon: 'trending-up-outline',
            onPress: () => navigation.navigate('MyWageHistory'),
            color: {bg: c.brandPrimarySoft, icon: c.brandPrimary},
        },
        {
            key: 'notice', label: '공지사항', icon: 'megaphone-outline',
            onPress: () => navigation.navigate('MyNotice'),
            color: {bg: c.surfaceSky, icon: c.info},
            isNew: unreadNoticeCount > 0,
        },
        {
            key: 'joinStore', label: '매장 합류', icon: 'key-outline',
            onPress: () => navigation.navigate('JoinStoreByCode'),
            color: {bg: c.surfaceMuted, icon: c.textSecondary},
        },
        {
            key: 'labor', label: '노무 정보', icon: 'scale-outline',
            onPress: () => navigation.navigate('InfoList'),
            color: {bg: c.warningBg, icon: c.warning},
        },
        {
            key: 'certificate', label: '증명서 발급', icon: 'ribbon-outline',
            onPress: () => navigation.navigate('MyCertificate', selectedStore ? {storeId: selectedStore.id} : undefined),
            color: {bg: c.infoBg, icon: c.info},
        },
        {
            key: 'workLog', label: '근무일지', icon: 'list-outline',
            onPress: () => navigation.navigate('EmployeeWorkLog', selectedStore ? {storeId: selectedStore.id} : undefined),
            color: {bg: c.surfaceMint, icon: c.success},
        },
        {
            // 인증채용의 '당일 대타'와 혼동 방지를 위해 라벨만 개칭(§18-10) — 동작은 그대로 SwapBoard.
            key: 'swap', label: '우리 매장 대타', icon: 'swap-horizontal-outline',
            onPress: () => navigation.navigate('SwapBoard' as never),
            color: {bg: c.brandPrimarySoft, icon: c.brandPrimary},
        },
    ];

    if (state === 'LOADING' && stores.length === 0) {
        return (
            <ScreenContainer header={<AppHeader title={`${user?.name ?? '직원'}님`} />}>
                <LoadingState title="오늘 근무 상태 확인 중" description="소속 매장과 스케줄을 불러오고 있어요." />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer padded={false} footer={<RoleTabBar active="home" />}>
            <ScrollView
                style={[styles.scroll, {backgroundColor: c.surfaceCanvas}]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}>

                {/* ── 프로필 히어로 헤더 ── */}
                <View style={[styles.topHeader, {backgroundColor: c.surface, borderBottomColor: c.divider}]}>
                    <View style={styles.headerLeft}>
                        <LinearGradient colors={gradient.brand} style={styles.avatar}>
                            <AppText variant="titleMd" tone="inverse" weight="700">{nameInitial}</AppText>
                        </LinearGradient>
                        <View>
                            <AppText variant="titleMd" weight="700">
                                안녕하세요, {user?.name ?? '직원'}님 👋
                            </AppText>
                            <AppText variant="caption" tone="tertiary">{dateLabel}</AppText>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={[styles.iconBtn, {backgroundColor: c.surfaceCanvas, borderColor: c.border}]}
                            onPress={() => navigation.navigate('NotificationCenter')}>
                            <Ionicons name="notifications-outline" size={20} color={c.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconBtn, {backgroundColor: c.surfaceCanvas, borderColor: c.border}]}
                            onPress={() => navigation.navigate('AccountSettings')}>
                            <Ionicons name="settings-outline" size={20} color={c.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── 알림 스트립(선택) — 서명 대기 계약서 / 안읽은 공지가 있을 때만 ── */}
                {showAlertStrip ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.alertStrip}
                        style={styles.alertStripWrap}>
                        {pendingContractCount > 0 ? (
                            <TouchableOpacity
                                style={[styles.alertChip, {backgroundColor: c.warningBg, borderColor: c.warning}]}
                                onPress={() => navigation.navigate('MyContract')}>
                                <Ionicons name="document-text-outline" size={13} color={c.warning} />
                                <AppText variant="caption" weight="700" style={{color: c.warning}}>
                                    계약서 서명 대기 {pendingContractCount}건
                                </AppText>
                            </TouchableOpacity>
                        ) : null}
                        {pendingDelegation?.signatureEnvelopeId ? (
                            <TouchableOpacity
                                style={[styles.alertChip, {backgroundColor: c.warningBg, borderColor: c.warning}]}
                                onPress={() => navigation.navigate('ElectronicSign', {
                                    envelopeId: pendingDelegation.signatureEnvelopeId as number,
                                })}>
                                <Ionicons name="shield-checkmark-outline" size={13} color={c.warning} />
                                <AppText variant="caption" weight="700" style={{color: c.warning}}>
                                    매니저 위임장 서명 대기
                                </AppText>
                            </TouchableOpacity>
                        ) : null}
                        {unreadNoticeCount > 0 ? (
                            <TouchableOpacity
                                style={[styles.alertChip, {backgroundColor: c.infoBg, borderColor: c.info}]}
                                onPress={() => navigation.navigate('MyNotice')}>
                                <Ionicons name="megaphone-outline" size={13} color={c.info} />
                                <AppText variant="caption" weight="700" style={{color: c.info}}>
                                    새 공지 {unreadNoticeCount}건
                                </AppText>
                            </TouchableOpacity>
                        ) : null}
                    </ScrollView>
                ) : null}

                <View style={styles.body}>
                    <Pressable
                        style={[styles.storeSelector, {borderColor: c.border, backgroundColor: c.surface}]}
                        onPress={() => setSelectorOpen(open => !open)}
                        accessibilityRole="button"
                        accessibilityLabel="매장 선택">
                        <View style={styles.storeSelectorMain}>
                            <Ionicons name="storefront-outline" size={18} color={c.brandPrimary} />
                            <AppText variant="titleMd" numberOfLines={1} style={styles.flex}>
                                {selectedStore?.storeName ?? '소속 매장이 없어요'}
                            </AppText>
                        </View>
                        <View style={styles.storeSelectorRight}>
                            <AppText variant="caption" tone="secondary" numberOfLines={1}>
                                시급 {formatWage(currentWage)}
                            </AppText>
                            <Ionicons name={selectorOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.textSecondary} />
                        </View>
                    </Pressable>

                    {selectorOpen && stores.length > 1 ? (
                        <View style={styles.storeChips}>
                            {stores.map(store => {
                                const selected = store.id === selectedStore?.id;
                                return (
                                    <Pressable
                                        key={store.id}
                                        style={[
                                            styles.storeChip,
                                            {borderColor: c.border, backgroundColor: c.surface},
                                            selected ? {borderColor: c.brandPrimary, backgroundColor: c.brandPrimarySoft} : null,
                                        ]}
                                        onPress={() => {
                                            setSelectedStoreId(store.id);
                                            setSelectorOpen(false);
                                        }}>
                                        <AppText
                                            variant="caption"
                                            tone={selected ? 'brand' : 'secondary'}
                                            numberOfLines={1}>
                                            {store.storeName}
                                        </AppText>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : null}

                    {/* ── 매장이 있을 때만: 그라디언트 KPI 히어로 카드 ── */}
                    {selectedStore ? (
                        <LinearGradient
                            colors={gradient.brandStrong}
                            style={styles.heroCard}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}>
                            <View style={styles.heroDecor} />
                            <AppText variant="caption" tone="inverse" style={styles.heroLabel}>이번 달 예상 급여</AppText>
                            <AmountText size={28} tone="inverse">
                                {monthlySummary.estimatedWage.toLocaleString('ko-KR')}원
                            </AmountText>
                            <View style={styles.heroDivider} />
                            <View style={styles.heroStats}>
                                <View style={styles.heroStat}>
                                    <AppText variant="headingSm" tone="inverse">{monthlySummary.attendanceDays}일</AppText>
                                    <AppText variant="caption" tone="inverse" style={styles.heroStatLbl}>출근 일수</AppText>
                                </View>
                                <View style={[styles.heroStat, styles.heroStatDivider]}>
                                    <AppText variant="headingSm" tone="inverse">{monthlyWorkedHoursLabel}</AppText>
                                    <AppText variant="caption" tone="inverse" style={styles.heroStatLbl}>이번 달 근무</AppText>
                                </View>
                                <View style={[styles.heroStat, styles.heroStatDivider]}>
                                    <AppText variant="headingSm" tone="inverse">{formatWage(currentWage)}</AppText>
                                    <AppText variant="caption" tone="inverse" style={styles.heroStatLbl}>적용 시급</AppText>
                                </View>
                            </View>
                        </LinearGradient>
                    ) : null}

                    {/* ── 출퇴근 상태 카드(펀치 카드) ── */}
                    {!selectedStore ? (
                        <AppCard variant="plain" style={styles.punchCard}>
                            <AppText variant="headingMd">출근 준비가 됐어요</AppText>
                            <AppText variant="bodyMd" tone="secondary" style={styles.punchDesc}>
                                합류한 매장이 없어요. 먼저 매장에 합류해 주세요.
                            </AppText>
                            <AppButton
                                label="매장 합류하기"
                                onPress={() => navigation.navigate('JoinStoreByCode')}
                                leftIcon={<Ionicons name="key-outline" size={20} color={c.textInverse} />}
                            />
                        </AppCard>
                    ) : (
                        <AppCard variant="plain" style={styles.punchCard}>
                            <View style={styles.punchTop}>
                                <View style={styles.flex}>
                                    <AppText variant="headingMd">
                                        {state === 'WORKING' ? '지금 근무 중이에요' : state === 'DONE' ? '오늘 근무 완료' : '출근 준비가 됐어요'}
                                    </AppText>
                                    <AppText variant="bodyMd" tone="secondary" style={styles.punchDesc}>
                                        {state === 'WORKING'
                                            ? `${selectedStore.storeName} · ${formatTime(todayRecord?.checkInTime)}에 출근했어요. 퇴근 전 휴게 기록도 확인해 주세요.`
                                            : state === 'DONE'
                                                ? `${selectedStore.storeName} · ${formatTime(todayRecord?.checkOutTime)}에 퇴근했어요. 내일 스케줄을 확인해 주세요.`
                                                : `${selectedStore.storeName} · 출근 전 오늘 스케줄을 확인해 주세요.`}
                                    </AppText>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    {backgroundColor: c.successBg},
                                    state === 'DONE' ? {backgroundColor: c.infoBg} : null,
                                    state === 'IDLE' ? {backgroundColor: c.warningBg} : null,
                                ]}>
                                    <AppText variant="caption" weight="700" style={{
                                        color: state === 'DONE' ? c.info : state === 'IDLE' ? c.warning : c.success,
                                    }}>
                                        {state === 'WORKING' ? '정상 출근' : state === 'DONE' ? '퇴근 완료' : '출근 전'}
                                    </AppText>
                                </View>
                            </View>

                            <LinearGradient
                                colors={gradient.brandStrong}
                                style={styles.timerPanel}
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 1}}>
                                <AppText variant="caption" tone="inverse" style={styles.timerLabel}>
                                    {state === 'WORKING' ? '현재 근무 시간' : '오늘 누적 근무'}
                                </AppText>
                                <AppText tone="inverse" style={styles.timerText}>
                                    {state === 'WORKING'
                                        ? workingDuration
                                        : formatTimer(todayWorkedSeconds(todayRecord))}
                                </AppText>
                                <View style={styles.timerMeta}>
                                    <AppText variant="caption" tone="inverse">출근 {formatTime(todayRecord?.checkInTime)}</AppText>
                                    <AppText variant="caption" tone="inverse">
                                        {todaySchedule ? `예정 퇴근 ${shortTime(todaySchedule.endTime)}` : '예정 없음'}
                                    </AppText>
                                </View>
                            </LinearGradient>

                            <AppButton
                                label={state === 'WORKING' ? '퇴근하기' : state === 'DONE' ? '퇴근 완료' : '출근하기'}
                                onPress={handlePunch}
                                disabled={state === 'DONE'}
                                leftIcon={<Ionicons name="timer-outline" size={20} color={c.textInverse} />}
                                style={styles.punchButton}
                            />
                            {state !== 'DONE' ? (
                                <AppButton
                                    label={state === 'WORKING' ? '사장님 승인으로 퇴근 요청' : '사장님 승인으로 출근 요청'}
                                    variant="secondary"
                                    loading={approvalBusy}
                                    disabled={approvalBusy}
                                    leftIcon={<Ionicons name="checkmark-done-outline" size={18} color={c.brandSecondary} />}
                                    style={styles.approvalButton}
                                    onPress={requestApprovalPunch}
                                />
                            ) : null}
                            <View style={styles.secondaryActions}>
                                <AppButton
                                    label="휴게 기록"
                                    variant="secondary"
                                    size="md"
                                    fullWidth={false}
                                    style={styles.secondaryAction}
                                    onPress={() => {
                                        if (!selectedStore) {return;}
                                        navigation.navigate('BreakRecord', {
                                            storeId: selectedStore.id,
                                            employeeId: user?.id ?? 0,
                                            employeeName: user?.name,
                                        });
                                    }}
                                />
                                <AppButton
                                    label="출퇴근 정정"
                                    variant="secondary"
                                    size="md"
                                    fullWidth={false}
                                    style={styles.secondaryAction}
                                    onPress={() => navigation.navigate('AttendanceCorrectionRequest', {
                                        attendanceId: todayRecord?.id,
                                        date: todayRecord?.checkInTime?.slice(0, 10),
                                        storeName: selectedStore?.storeName,
                                        currentCheckIn: todayRecord?.checkInTime,
                                        currentCheckOut: todayRecord?.checkOutTime,
                                    })}
                                />
                            </View>
                        </AppCard>
                    )}

                    {/* ── 매장이 있을 때만: 오늘 스케줄 ── */}
                    {selectedStore ? (
                        <>
                            <SectionTitle title="오늘 스케줄" action="전체 보기" onPress={() => navigation.navigate('MyShift')} />
                            <AppCard variant="plain" style={styles.scheduleCard}>
                                <ScheduleRow label="오늘" shift={todaySchedule} fallback="오늘 확정된 스케줄이 없어요." />
                                <ScheduleRow label="내일" shift={tomorrowSchedule} fallback="내일 스케줄은 아직 비어 있어요." />
                            </AppCard>
                        </>
                    ) : null}

                    {/* ── 빠른 메뉴(9칸) — 매장 유무와 무관하게 항상 표시 ── */}
                    <SectionTitle title="빠른 메뉴" />
                    <View style={styles.quickGrid}>
                        {quickMenus.map(menu => (
                            <TouchableOpacity
                                key={menu.key}
                                style={[styles.quickItem, {width: QUICK_ITEM_W, backgroundColor: c.surface, borderColor: c.border}]}
                                onPress={menu.onPress}
                                activeOpacity={0.75}>
                                {menu.badge ? (
                                    <View style={[styles.quickBadge, {backgroundColor: c.error}]}>
                                        <AppText variant="caption" tone="inverse" weight="700" style={styles.quickBadgeText}>
                                            {menu.badge}
                                        </AppText>
                                    </View>
                                ) : null}
                                {menu.isNew ? (
                                    <View style={[styles.quickNewTag, {backgroundColor: c.info}]}>
                                        <AppText variant="caption" tone="inverse" weight="800" style={styles.quickNewTagText}>N</AppText>
                                    </View>
                                ) : null}
                                <View style={[styles.quickIconWrap, {backgroundColor: menu.color.bg}]}>
                                    <Ionicons name={menu.icon} size={20} color={menu.color.icon} />
                                </View>
                                <AppText variant="caption" weight="600" tone="secondary" center numberOfLines={1}>
                                    {menu.label}
                                </AppText>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── 정부 지원 정책 — 매장 유무와 무관하게 항상 표시 ── */}
                    <SectionCard>
                        <SectionHeader
                            title="정부 지원 정책"
                            onPressAction={() => navigation.navigate('InfoList')}
                            actionLabel="더보기"
                        />
                        <View style={styles.policyList}>
                            {policies.map(policy => (
                                <TouchableOpacity
                                    key={policy.id}
                                    style={styles.policyRow}
                                    onPress={() => navigation.navigate('PolicyDetail', {policyId: policy.id})}>
                                    <View style={[styles.policyDot, {backgroundColor: c.brandPrimary}]} />
                                    <View style={styles.flex}>
                                        <View style={styles.policyTitleRow}>
                                            <AppText variant="titleMd" numberOfLines={1} style={styles.flex}>
                                                {policy.title}
                                            </AppText>
                                            {policy.isNew ? (
                                                <View style={[styles.policyNewBadge, {backgroundColor: c.infoBg}]}>
                                                    <AppText variant="caption" weight="700" style={{color: c.info, fontSize: 10}}>
                                                        NEW
                                                    </AppText>
                                                </View>
                                            ) : null}
                                        </View>
                                        <AppText variant="caption" tone="tertiary">마감: {policy.deadline}</AppText>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </SectionCard>
                </View>
            </ScrollView>
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

function todayWorkedSeconds(record: TodayAttendance | null): number {
    if (!record) {
        return 0;
    }
    if (typeof record.workingMinutes === 'number') {
        return record.workingMinutes * 60;
    }
    if (typeof record.workingHours === 'number') {
        return record.workingHours * 3600;
    }
    if (record.checkInTime && record.checkOutTime) {
        return Math.max(0, new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / 1000;
    }
    return 0;
}

function formatTime(value?: string): string {
    if (!value) {
        return '--:--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value.slice(11, 16) || value.slice(0, 5);
    }
    return date.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'});
}

function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function SectionTitle({title, action, onPress}: {title: string; action?: string; onPress?: () => void}) {
    return (
        <View style={styles.sectionTitleRow}>
            <AppText variant="titleMd">{title}</AppText>
            {action && onPress ? (
                <Pressable onPress={onPress} hitSlop={8}>
                    <AppText variant="caption" tone="brand" weight="700">{action}</AppText>
                </Pressable>
            ) : null}
        </View>
    );
}

function ScheduleRow({label, shift, fallback}: {label: string; shift: WorkShift | null; fallback: string}) {
    const c = useThemeColors();
    return (
        <View style={styles.scheduleRow}>
            <View style={[styles.dateBox, {backgroundColor: c.brandPrimarySoft}]}>
                <AppText variant="caption" weight="700" style={{color: c.brandPrimaryDark}}>{label}</AppText>
            </View>
            <View style={styles.flex}>
                <AppText variant="titleMd" numberOfLines={1}>
                    {shift ? `${shortTime(shift.startTime)} - ${shortTime(shift.endTime)}` : fallback}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {shift?.memo ? `${shift.memo} · 사장님 확정` : shift ? '확정된 근무 일정이에요.' : '확정 후 여기에 표시돼요.'}
                </AppText>
            </View>
            {shift ? (
                <View style={[styles.confirmedChip, {backgroundColor: c.successBg}]}>
                    <AppText variant="caption" weight="700" style={{color: c.success}}>확정</AppText>
                </View>
            ) : (
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xxxl,
    },
    body: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        gap: spacing.md,
    },

    /* ── 헤더 ── */
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    headerLeft: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1},
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    headerRight: {flexDirection: 'row', gap: spacing.sm},
    iconBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },

    /* ── 알림 스트립 ── */
    alertStripWrap: {paddingVertical: spacing.sm},
    alertStrip: {paddingHorizontal: spacing.lg, gap: spacing.sm},
    alertChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: spacing.md, paddingVertical: 7,
        borderRadius: radius.pill, borderWidth: 1,
    },

    /* ── 매장 선택 ── */
    storeSelector: {
        minHeight: 48,
        borderRadius: radius.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        ...shadow.sm,
    },
    storeSelectorMain: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    storeSelectorRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        maxWidth: '45%',
    },
    storeChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: -spacing.xs,
    },
    storeChip: {
        minHeight: 34,
        maxWidth: '48%',
        borderRadius: radius.pill,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── 히어로 KPI 카드 ── */
    heroCard: {
        borderRadius: radius.xxl,
        padding: spacing.xl,
        overflow: 'hidden',
        ...shadow.lg,
    },
    heroDecor: {
        position: 'absolute', top: -24, right: -24,
        width: 120, height: 120,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 60,
    },
    heroLabel: {opacity: 0.85, marginBottom: spacing.xs},
    heroDivider: {height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: spacing.md},
    heroStats: {flexDirection: 'row'},
    heroStat: {flex: 1, alignItems: 'center', gap: 3},
    heroStatDivider: {borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)'},
    heroStatLbl: {opacity: 0.8},

    /* ── 펀치 카드 ── */
    punchCard: {
        gap: spacing.md,
        borderRadius: radius.lg,
        padding: spacing.lg,
    },
    punchTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    punchDesc: {
        marginTop: spacing.xs,
    },
    statusBadge: {
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    timerPanel: {
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    timerLabel: {
        opacity: 0.9,
        fontWeight: '700',
    },
    timerText: {
        fontSize: 42,
        lineHeight: 48,
        fontWeight: '800',
    },
    timerMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    punchButton: {
        borderRadius: radius.lg,
    },
    approvalButton: {
        marginTop: spacing.sm,
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    secondaryAction: {
        flex: 1,
        borderRadius: radius.lg,
    },

    /* ── 섹션 공통 ── */
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },

    /* ── 스케줄 ── */
    scheduleCard: {
        padding: spacing.md,
        gap: spacing.md,
        borderRadius: radius.lg,
    },
    scheduleRow: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    dateBox: {
        width: 52,
        height: 52,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmedChip: {
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },

    /* ── 빠른 메뉴(3×3) ── */
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    quickItem: {
        minHeight: 82,
        borderRadius: radius.xl,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        position: 'relative',
    },
    quickIconWrap: {
        width: 44,
        height: 44,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickBadge: {
        position: 'absolute', top: 8, right: 8,
        minWidth: 18, height: 18, borderRadius: 9,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 3,
    },
    quickBadgeText: {fontSize: 10, lineHeight: 14},
    quickNewTag: {
        position: 'absolute', top: 8, right: 8,
        paddingHorizontal: 4, paddingVertical: 2,
        borderRadius: 5,
    },
    quickNewTagText: {fontSize: 9, lineHeight: 11},

    /* ── 정책 ── */
    policyList: {gap: 0},
    policyRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    policyDot: {width: 6, height: 6, borderRadius: 3, flexShrink: 0},
    policyTitleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2},
    policyNewBadge: {paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, flexShrink: 0},

    flex: {
        flex: 1,
        minWidth: 0,
    },
});

export default EmployeeAttendanceHome;
