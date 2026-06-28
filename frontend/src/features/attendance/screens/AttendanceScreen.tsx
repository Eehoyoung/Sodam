/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import {AppToast, ConfirmSheet, AppBadge, AppButton, AppCard, AppHeader, AppText, AmountText, CtaStack, SegmentedControl, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';
import {PERMISSIONS, request, RESULTS} from 'react-native-permissions';
import NfcManager from 'react-native-nfc-manager';
import attendanceService from '../services/attendanceService';
import storeService from '../../store/services/storeService';
import {AttendanceRecord, AttendanceStatus, CheckInRequest, CheckOutRequest} from '../types';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import { useThemeColors, ThemeColors } from '../../../common/hooks/useThemeColors';

type CheckInMethod = 'standard' | 'location' | 'nfc';
const METHOD_ORDER: CheckInMethod[] = ['standard', 'location', 'nfc'];
const METHOD_LABELS = ['기본', '위치', 'NFC'];

const AttendanceScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);
    const { user } = useAuth();
    const employeeIdNum = Number(user?.id);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
    const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string>('');
    const [workplaces, setWorkplaces] = useState<{ id: string; name: string }[]>([]);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [showNFCReader, setShowNFCReader] = useState(false);
    const [, setNfcTagId] = useState<string>('');
    const [checkInMethod, setCheckInMethod] = useState<CheckInMethod>('standard');

    // Refs to track location services and component mount status for proper cleanup
    const locationWatchId = useRef<number | null>(null);
    const isMountedRef = useRef(true);

    // NFC 지원 여부 확인
    const checkNFCSupport = async () => {
        try {
            const isSupported = await NfcManager.isSupported();
            if (!isSupported) {
                AppToast.warn('이 기기는 NFC를 지원하지 않아요. 다른 출퇴근 방법을 이용해 주세요.');
                return false;
            }

            const isEnabled = await NfcManager.isEnabled();
            if (!isEnabled) {
                ConfirmSheet.confirm({
                    title: 'NFC를 켜 주세요',
                    description: 'NFC 출퇴근을 쓰려면 시스템 설정에서 NFC를 켜야 해요.',
                    primary: {
                        label: '설정으로 이동',
                        onPress: () => {
                            if (Platform.OS === 'android') {
                                Linking.sendIntent('android.settings.NFC_SETTINGS');
                            } else {
                                Linking.openSettings();
                            }
                        },
                    },
                    secondary: {label: '취소'},
                });
                return false;
            }

            return true;
        } catch (error) {
            console.error('NFC 지원 확인 실패:', error);
            AppToast.error('NFC 상태를 확인할 수 없어요.');
            return false;
        }
    };

    // NFC 리더 열기
    const openNFCReader = async () => {
        const isNFCAvailable = await checkNFCSupport();
        if (isNFCAvailable) {
            // TODO(NFC): 실제 태그 스캔 로직(NFCAttendanceService.readTag 등) 연동
            setShowNFCReader(true);
        }
    };

    // 출퇴근 기록 조회
    const fetchAttendanceRecords = async () => {
        try {
            // 현재 날짜 기준 한 달 전부터 현재까지의 기록 조회
            const endDate = format(new Date(), 'yyyy-MM-dd');
            const startDate = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd');

            const filter = {
                startDate,
                endDate,
                employeeId: Number.isFinite(employeeIdNum) ? String(employeeIdNum) : undefined,
                workplaceId: selectedWorkplaceId || undefined
            };

            const data = await attendanceService.getAttendanceRecords(filter);
            setAttendanceRecords(data);

            // 현재 근무 상태 조회. null(오늘 기록 없음/일시 미수신)이면 기존 상태를 덮지 않는다.
            // (출근 직후 이 재조회가 null 로 덮어 '아직 출근 전'으로 깜빡이던 것 방지)
            if (selectedWorkplaceId) {
                const currentData = await attendanceService.getCurrentAttendance(selectedWorkplaceId, employeeIdNum);
                if (currentData) {
                    setCurrentAttendance(currentData);
                }
            }
        } catch (error) {
            console.error('출퇴근 기록을 가져오는 중 오류가 생겼어요:', error);
            AppToast.error('출퇴근 기록을 불러오는 데 실패했어요. 다시 시도해 주세요.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // 근무지 목록 조회 — 직원 본인이 소속된 실제 매장 (GET /api/stores/employee/{userId})
    const fetchWorkplaces = async () => {
        if (!Number.isFinite(employeeIdNum)) {
            return;
        }
        try {
            const stores = await storeService.getEmployeeStores(employeeIdNum);
            const data = stores.map(s => ({id: String(s.id), name: s.storeName}));
            setWorkplaces(data);
            if (data.length > 0) {
                setSelectedWorkplaceId(prev => (prev && data.some(d => d.id === prev) ? prev : data[0].id));
            } else {
                setSelectedWorkplaceId('');
            }
        } catch (error) {
            console.error('근무지 목록을 가져오는 중 오류가 생겼어요:', error);
            AppToast.error('근무지 목록을 불러오지 못했어요.');
        }
    };

    // 위치 권한 요청
    const requestLocationPermission = async () => {
        try {
            const permission = Platform.OS === 'ios'
                ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
                : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

            const result = await request(permission);

            if (result === RESULTS.GRANTED) {
                setLocationPermissionGranted(true);
                getCurrentLocation();
            } else {
                setLocationPermissionGranted(false);
                AppToast.warn('위치 기반 출퇴근을 쓰려면 위치 권한이 필요해요.');
            }
        } catch (error) {
            console.error('위치 권한 요청 중 오류가 생겼어요:', error);
        }
    };

    // 현재 위치 가져오기
    const getCurrentLocation = () => {
        if (!isMountedRef.current) {
            return;
        }

        if (locationPermissionGranted) {
            Geolocation.getCurrentPosition(
                position => {
                    // Check if component is still mounted before updating state
                    if (!isMountedRef.current) {
                        return;
                    }

                    const {latitude, longitude} = position.coords;
                    setCurrentLocation({latitude, longitude});
                },
                error => {
                    // Check if component is still mounted before updating state
                    if (!isMountedRef.current) {
                        return;
                    }

                    console.error('AttendanceScreen: Location error:', error);
                    AppToast.error('위치 정보를 가져오는 데 실패했어요. 다시 시도해 주세요.');
                },
                {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
            );
        }
    };

    // NFC 태그 스캔 처리
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleNFCTagScanned = (scannedNFCTag: string) => {
        setNfcTagId(scannedNFCTag);
        setShowNFCReader(false);

        // NFC 태그로 출퇴근 처리
        if (currentAttendance) {
            handleCheckOutWithNFC(scannedNFCTag);
        } else {
            handleCheckInWithNFC(scannedNFCTag);
        }
    };

    // Cleanup effect to properly stop location services when component unmounts
    useEffect(() => {
        return () => {
            isMountedRef.current = false;

            // Clear any active location watch
            if (locationWatchId.current !== null) {
                Geolocation.clearWatch(locationWatchId.current);
                locationWatchId.current = null;
            }

            // Stop location services to prevent Google Play Services channel leaks
            try {
                Geolocation.stopObserving();
            } catch (error) {
                console.warn('AttendanceScreen: Error stopping location observing:', error);
            }
        };
    }, []);

    // 화면 로드 시 데이터 조회 및 위치 권한 요청
    useEffect(() => {
        fetchWorkplaces();
        requestLocationPermission();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 1회 초기 로드(함수 의존 추가 시 반복 호출)
    }, []);

    // 선택된 근무지가 변경되면 출퇴근 기록 다시 조회
    useEffect(() => {
        if (selectedWorkplaceId) {
            fetchAttendanceRecords();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 근무지 변경 시에만 재조회(fetchAttendanceRecords 는 selectedWorkplaceId 를 읽으므로 의도된 트리거)
    }, [selectedWorkplaceId]);

    // 새로고침 처리
    const handleRefresh = () => {
        setRefreshing(true);
        fetchAttendanceRecords();
    };

    // BE AttendanceRequestDto: employeeId/storeId/latitude/longitude 모두 @NotNull — 기본 출근도 위치 필수
    const requireAuthAndLocation = (): { ok: false } | { ok: true; loc: { latitude: number; longitude: number } } => {
        if (!Number.isFinite(employeeIdNum)) {
            AppToast.show('로그인이 필요합니다.');
            return { ok: false };
        }
        if (!currentLocation) {
            AppToast.show('위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해 주세요.');
            getCurrentLocation();
            return { ok: false };
        }
        return { ok: true, loc: currentLocation };
    };

    // 기본 출근 처리
    const handleCheckIn = async () => {
        if (!selectedWorkplaceId) {
            AppToast.show('근무지를 선택해주세요.');
            return;
        }

        const gate = requireAuthAndLocation();
        if (!gate.ok) {return;}

        try {
            const checkInData: CheckInRequest = {
                employeeId: employeeIdNum,
                workplaceId: selectedWorkplaceId,
                latitude: gate.loc.latitude,
                longitude: gate.loc.longitude,
            };

            const response = await attendanceService.checkIn(checkInData);
            AppToast.success('출근 처리됐어요.');
            setCurrentAttendance(response);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('출근 처리 중 오류가 생겼어요:', error);
            AppToast.error('출근 처리에 실패했어요. 다시 시도해 주세요.');
        }
    };

    // 위치 기반 출근 처리
    const handleCheckInWithLocation = async () => {
        // TODO(API): 위치 인증/출근 처리 API 연동
        // TODO(AUTH): 'employeeId' 임시값을 로그인 사용자 ID로 대체
        if (!selectedWorkplaceId) {
            AppToast.show('근무지를 선택해주세요.');
            return;
        }

        if (!locationPermissionGranted) {
            requestLocationPermission();
            return;
        }

        if (!currentLocation) {
            AppToast.show('위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해 주세요.');
            getCurrentLocation();
            return;
        }

        if (!Number.isFinite(employeeIdNum)) {
            AppToast.show('로그인이 필요합니다.');
            return;
        }

        try {
            // 위치 기반 인증 먼저 수행
            const verifyResult = await attendanceService.verifyLocationAttendance(
                String(employeeIdNum),
                selectedWorkplaceId,
                currentLocation.latitude,
                currentLocation.longitude
            );

            if (!verifyResult.success) {
                AppToast.warn(verifyResult.message ?? '위치 인증에 실패했어요. 매장 반경 내에서 다시 시도해 주세요.');
                return;
            }

            // 인증 성공 시 출근 처리
            const checkInData: CheckInRequest = {
                employeeId: employeeIdNum,
                workplaceId: selectedWorkplaceId,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
            };

            const response = await attendanceService.checkIn(checkInData);
            AppToast.success('위치 기반 출근 처리됐어요.');
            setCurrentAttendance(response);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('위치 기반 출근 처리 중 오류가 생겼어요:', error);
            AppToast.error('위치 기반 출근 처리에 실패했어요. 다시 시도해 주세요.');
        }
    };

    // NFC 태그 기반 출근 처리
    const handleCheckInWithNFC = async (scannedNFCTag: string) => {
        // TODO(API): NFC 태그 인증/출근 처리 API 연동
        // TODO(NFC): 실제 태그값 파싱/검증 로직 연동
        if (!selectedWorkplaceId) {
            AppToast.show('근무지를 선택해주세요.');
            return;
        }

        const gate = requireAuthAndLocation();
        if (!gate.ok) {return;}

        try {
            // NFC 태그 기반 인증 먼저 수행
            const verifyResult = await attendanceService.verifyNfcTagAttendance(
                String(employeeIdNum),
                selectedWorkplaceId,
                scannedNFCTag
            );

            if (!verifyResult.success) {
                AppToast.warn(verifyResult.message ?? 'NFC 태그 인증에 실패했어요. 다시 시도해 주세요.');
                return;
            }

            // 인증 성공 시 출근 처리 — NFC 모드도 BE 는 lat/lng 필수
            const checkInData: CheckInRequest = {
                employeeId: employeeIdNum,
                workplaceId: selectedWorkplaceId,
                latitude: gate.loc.latitude,
                longitude: gate.loc.longitude,
            };

            const response = await attendanceService.checkIn(checkInData);
            AppToast.success('NFC 태그 기반 출근 처리됐어요.');
            setCurrentAttendance(response);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('NFC 태그 기반 출근 처리 중 오류가 생겼어요:', error);
            AppToast.error('NFC 태그 기반 출근 처리에 실패했어요. 다시 시도해 주세요.');
        }
    };

    // 기본 퇴근 처리
    const handleCheckOut = async () => {
        if (!currentAttendance) {
            AppToast.show('현재 출근 상태가 아닙니다.');
            return;
        }

        const gate = requireAuthAndLocation();
        if (!gate.ok) {return;}

        try {
            const checkOutData: CheckOutRequest = {
                employeeId: employeeIdNum,
                workplaceId: selectedWorkplaceId,
                latitude: gate.loc.latitude,
                longitude: gate.loc.longitude,
            };

            await attendanceService.checkOut(currentAttendance.id, checkOutData);
            AppToast.success('퇴근 처리됐어요.');
            setCurrentAttendance(null);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('퇴근 처리 중 오류가 생겼어요:', error);
            AppToast.error('퇴근 처리에 실패했어요. 다시 시도해 주세요.');
        }
    };

    // 위치 기반 퇴근 처리
    const handleCheckOutWithLocation = async () => {
        // TODO(API): 위치 인증/퇴근 처리 API 연동
        // TODO(AUTH): 'employeeId' 임시값을 로그인 사용자 ID로 대체
        if (!currentAttendance) {
            AppToast.show('현재 출근 상태가 아닙니다.');
            return;
        }

        if (!locationPermissionGranted) {
            requestLocationPermission();
            return;
        }

        if (!currentLocation) {
            AppToast.show('위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해 주세요.');
            getCurrentLocation();
            return;
        }

        if (!Number.isFinite(employeeIdNum)) {
            AppToast.show('로그인이 필요합니다.');
            return;
        }

        try {
            // 위치 기반 인증 먼저 수행
            const verifyResult = await attendanceService.verifyLocationAttendance(
                String(employeeIdNum),
                selectedWorkplaceId,
                currentLocation.latitude,
                currentLocation.longitude
            );

            if (!verifyResult.success) {
                AppToast.warn(verifyResult.message ?? '위치 인증에 실패했어요. 매장 반경 내에서 다시 시도해 주세요.');
                return;
            }

            // 인증 성공 시 퇴근 처리
            const checkOutData: CheckOutRequest = {
                employeeId: employeeIdNum,
                workplaceId: selectedWorkplaceId,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
            };

            await attendanceService.checkOut(currentAttendance.id, checkOutData);
            AppToast.success('위치 기반 퇴근 처리됐어요.');
            setCurrentAttendance(null);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('위치 기반 퇴근 처리 중 오류가 생겼어요:', error);
            AppToast.error('위치 기반 퇴근 처리에 실패했어요. 다시 시도해 주세요.');
        }
    };

    // NFC 태그 기반 퇴근 처리
    const handleCheckOutWithNFC = async (scannedNFCTag: string) => {
        // TODO(API): NFC 태그 인증/퇴근 처리 API 연동
        // TODO(NFC): 실제 태그값 파싱/검증 로직 연동
        if (!currentAttendance) {
            AppToast.show('현재 출근 상태가 아닙니다.');
            return;
        }

        const gate = requireAuthAndLocation();
        if (!gate.ok) {return;}

        try {
            // NFC 태그 기반 인증 먼저 수행
            const verifyResult = await attendanceService.verifyNfcTagAttendance(
                String(employeeIdNum),
                selectedWorkplaceId,
                scannedNFCTag
            );

            if (!verifyResult.success) {
                AppToast.warn(verifyResult.message ?? 'NFC 태그 인증에 실패했어요. 다시 시도해 주세요.');
                return;
            }

            // 인증 성공 시 퇴근 처리 — NFC 모드도 BE 는 lat/lng 필수
            const checkOutData: CheckOutRequest = {
                employeeId: employeeIdNum,
                workplaceId: selectedWorkplaceId,
                latitude: gate.loc.latitude,
                longitude: gate.loc.longitude,
            };

            await attendanceService.checkOut(currentAttendance.id, checkOutData);
            AppToast.success('NFC 태그 기반 퇴근 처리됐어요.');
            setCurrentAttendance(null);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('NFC 태그 기반 퇴근 처리 중 오류가 생겼어요:', error);
            AppToast.error('NFC 태그 기반 퇴근 처리에 실패했어요. 다시 시도해 주세요.');
        }
    };

    // 출퇴근 상태에 따른 배지 톤 반환 (색 단독 의미전달 금지 — 라벨과 함께)
    const getStatusTone = (status: AttendanceStatus): 'success' | 'info' | 'warning' | 'error' | 'neutral' => {
        switch (status) {
            case AttendanceStatus.CHECKED_IN:
                return 'success';
            case AttendanceStatus.CHECKED_OUT:
                return 'info';
            case AttendanceStatus.LATE:
            case AttendanceStatus.EARLY_LEAVE:
                return 'warning';
            case AttendanceStatus.ABSENT:
                return 'error';
            case AttendanceStatus.ON_LEAVE:
                return 'info';
            default:
                return 'neutral';
        }
    };

    // 출퇴근 상태 텍스트 반환
    const getStatusText = (status: AttendanceStatus) => {
        switch (status) {
            case AttendanceStatus.PENDING:
                return '출근 전';
            case AttendanceStatus.CHECKED_IN:
                return '출근';
            case AttendanceStatus.CHECKED_OUT:
                return '퇴근';
            case AttendanceStatus.LATE:
                return '지각';
            case AttendanceStatus.ABSENT:
                return '결근';
            case AttendanceStatus.EARLY_LEAVE:
                return '조퇴';
            case AttendanceStatus.ON_LEAVE:
                return '휴가';
            default:
                return '알 수 없음';
        }
    };

    // 현재 근무 시간(시:분) 계산 — WORKING 상태 보조 표기
    const elapsedLabel = (): string => {
        if (!currentAttendance) {
            return '';
        }
        // 음수 방지: 기기/서버 시간대 skew(예: 기기 UTC, 서버 KST)로 경과가 음수가 되면 "-9시간"처럼
        // 표기되던 것을 0으로 클램프. (실 운영은 기기·서버 모두 KST라 정상.)
        const ms = Math.max(0, new Date().getTime() - new Date(currentAttendance.checkInTime).getTime());
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor(ms / (1000 * 60)) % 60;
        return `${h}시간 ${m}분`;
    };

    // 선택된 방식에 따른 출근 핸들러
    const onCheckInPress = () => {
        if (checkInMethod === 'standard') {handleCheckIn();}
        else if (checkInMethod === 'location') {handleCheckInWithLocation();}
        else {openNFCReader();}
    };
    // 선택된 방식에 따른 퇴근 핸들러
    const onCheckOutPress = () => {
        if (checkInMethod === 'standard') {handleCheckOut();}
        else if (checkInMethod === 'location') {handleCheckOutWithLocation();}
        else {openNFCReader();}
    };

    // 근무 중 = 오늘 출근 기록이 있고 아직 퇴근 안 함. checkOutTime 을 봐야 한다.
    // (today 엔드포인트는 퇴근 후에도 그 기록을 돌려주므로, 존재만 보면 퇴근 후에도 '근무중' 으로 남았다.)
    const isWorking = !!currentAttendance && !currentAttendance.checkOutTime;
    const ctaLabel = isWorking
        ? checkInMethod === 'location' ? '위치 기반 퇴근하기' : checkInMethod === 'nfc' ? 'NFC 태그로 퇴근하기' : '퇴근하기'
        : checkInMethod === 'location' ? '위치 기반 출근하기' : checkInMethod === 'nfc' ? 'NFC 태그로 출근하기' : '출근하기';

    // 출퇴근 기록 항목 렌더링
    const renderAttendanceItem = ({item}: { item: AttendanceRecord }) => {
        // BE는 date 필드 없이 checkInTime 만 줄 수 있다. 유효하지 않은 값으로 format() 하면
        // 'Invalid time value' RangeError 로 렌더가 통째로 크래시(LogBox Render Error)했다.
        const safeFmt = (v?: string, pattern = 'M월 d일 (EEE)'): string => {
            if (!v) {return '-';}
            const d = new Date(v);
            return isNaN(d.getTime()) ? '-' : format(d, pattern, {locale: ko});
        };
        const date = safeFmt(item.date || item.checkInTime);
        const checkInTime = safeFmt(item.checkInTime, 'HH:mm');
        const checkOutTime = safeFmt(item.checkOutTime, 'HH:mm');
        const workHours = item.workHours ? `${item.workHours}시간` : '-';

        return (
            <TouchableOpacity
                // 일자별 상세는 근무 캘린더에서 확인
                activeOpacity={0.85}
                onPress={() => navigation.navigate('AttendanceCalendar')}
            >
                <AppCard variant="plain" style={styles.attendanceCard}>
                    <View style={styles.attendanceHeader}>
                        <Text style={styles.attendanceDate}>{date}</Text>
                        <AppBadge label={getStatusText(item.status)} tone={getStatusTone(item.status)} />
                    </View>

                    <View style={styles.timeContainer}>
                        <View style={styles.timeItem}>
                            <Text style={styles.timeLabel}>출근</Text>
                            <Text style={styles.timeValue}>{checkInTime}</Text>
                        </View>
                        <View style={styles.timeSeparator}/>
                        <View style={styles.timeItem}>
                            <Text style={styles.timeLabel}>퇴근</Text>
                            <Text style={styles.timeValue}>{checkOutTime}</Text>
                        </View>
                        <View style={styles.timeSeparator}/>
                        <View style={styles.timeItem}>
                            <Text style={styles.timeLabel}>근무시간</Text>
                            <Text style={styles.timeValue}>{workHours}</Text>
                        </View>
                    </View>

                    <View style={styles.workplaceContainer}>
                        <Ionicons name="business-outline" size={14} color={c.textTertiary}/>
                        <Text numberOfLines={1} style={styles.workplaceName}>{item.workplaceName}</Text>
                    </View>
                </AppCard>
            </TouchableOpacity>
        );
    };

    // 빈 목록 표시
    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={56} color={c.textTertiary}/>
            <Text style={styles.emptyText}>출퇴근 기록이 없어요.</Text>
            <Text style={styles.emptySubText}>출근 버튼을 눌러 근무를 시작해 보세요.</Text>
        </View>
    );

    // NFC 리더 렌더링
    const renderNFCReader = () => (
        <Modal
            visible={showNFCReader}
            animationType="slide"
            onRequestClose={() => setShowNFCReader(false)}
        >
            <View style={styles.nfcContainer}>
                <View style={styles.nfcHeader}>
                    <TouchableOpacity
                        onPress={() => setShowNFCReader(false)}
                        style={styles.closeButton}
                    >
                        <Ionicons name="close" size={24} color={c.textInverse}/>
                    </TouchableOpacity>
                    <Text style={styles.nfcTitle}>NFC 태그 읽기</Text>
                </View>

                <View style={styles.nfcReaderContainer}>
                    <View style={styles.nfcIconContainer}>
                        <Ionicons name="wifi" size={72} color={c.success}/>
                    </View>

                    <Text style={styles.nfcInstructions}>
                        NFC 태그를 기기 뒷면에 가까이 대주세요
                    </Text>

                    <Text style={styles.nfcSubInstructions}>
                        태그가 감지되면 자동으로 출퇴근 처리됩니다
                    </Text>

                    <View style={styles.nfcStatusContainer}>
                        <ActivityIndicator size="large" color={c.success}/>
                        <Text style={styles.nfcStatusText}>NFC 태그를 기다리는 중...</Text>
                    </View>
                </View>

                <View style={styles.nfcFooter}>
                    <AppButton label="취소" variant="destructive" onPress={() => setShowNFCReader(false)} />
                </View>
            </View>
        </Modal>
    );

    return (
        <ScreenContainer
            padded={false}
            header={<AppHeader title="출퇴근" />}
            footer={
                <CtaStack bordered>
                    <AppButton
                        label={ctaLabel}
                        variant={isWorking ? 'secondary' : 'primary'}
                        onPress={isWorking ? onCheckOutPress : onCheckInPress}
                    />
                </CtaStack>
            }>
            {renderNFCReader()}
            <FlatList
                data={loading ? [] : attendanceRecords}
                renderItem={renderAttendanceItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View>
                        {/* 매장 칩 — 가로 스크롤 */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipRow}
                        >
                            {workplaces.map(workplace => {
                                const on = selectedWorkplaceId === workplace.id;
                                return (
                                    <TouchableOpacity
                                        key={workplace.id}
                                        activeOpacity={0.85}
                                        style={[styles.chip, on && styles.chipOn]}
                                        onPress={() => setSelectedWorkplaceId(workplace.id)}
                                    >
                                        <Text numberOfLines={1} style={[styles.chipText, on && styles.chipTextOn]}>
                                            {workplace.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* 현재 상태 히어로 */}
                        <View style={styles.hero}>
                            <Text style={styles.heroLabel}>
                                {isWorking ? '근무 중이에요' : '아직 출근 전이에요'}
                            </Text>
                            {isWorking && currentAttendance ? (
                                <>
                                    <AmountText size={44} tone="primary">{elapsedLabel()}</AmountText>
                                    <Text style={styles.heroSub}>
                                        {(() => { const d = new Date(currentAttendance.checkInTime); return isNaN(d.getTime()) ? '' : `${format(d, 'HH:mm')} 출근 · `; })()}퇴근하려면 아래 버튼을 눌러주세요
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <AmountText size={40} tone="brand">출근하기</AmountText>
                                    <Text style={styles.heroSub}>방식을 고르고 아래 버튼으로 출근을 등록하세요</Text>
                                </>
                            )}
                        </View>

                        {/* 출퇴근 방식 세그먼트 */}
                        <View style={styles.methodSection}>
                            <Text style={styles.methodLabel}>인증 방식</Text>
                            <SegmentedControl
                                options={METHOD_LABELS}
                                value={METHOD_ORDER.indexOf(checkInMethod)}
                                onChange={(i) => {
                                    const next = METHOD_ORDER[i];
                                    setCheckInMethod(next);
                                    if (next === 'location') {
                                        if (!locationPermissionGranted) {
                                            requestLocationPermission();
                                        } else {
                                            getCurrentLocation();
                                        }
                                    }
                                }}
                            />
                        </View>

                        {/* 최근 기록 섹션 타이틀 */}
                        <AppText variant="headingSm" style={styles.recordsTitle}>최근 출퇴근 기록</AppText>

                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={c.brandPrimary}/>
                                <Text style={styles.loadingText}>출퇴근 기록을 불러오는 중...</Text>
                            </View>
                        ) : null}
                    </View>
                }
                ListEmptyComponent={loading ? null : renderEmptyList}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[c.brandPrimary]}
                    />
                }
            />
        </ScreenContainer>
    );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    listContainer: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 24,
        gap: 12,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 4,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: c.surfaceMuted,
        maxWidth: 200,
    },
    chipOn: {
        backgroundColor: c.brandPrimary,
    },
    chipText: {
        color: c.textSecondary,
        fontWeight: '700',
        fontSize: 14,
    },
    chipTextOn: {
        color: c.textInverse,
    },
    hero: {
        marginTop: 28,
        marginBottom: 4,
    },
    heroLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: c.textSecondary,
        marginBottom: 6,
    },
    heroSub: {
        marginTop: 8,
        fontSize: 14,
        color: c.textTertiary,
        lineHeight: 20,
    },
    methodSection: {
        marginTop: 28,
    },
    methodLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: c.textSecondary,
        marginBottom: 10,
    },
    recordsTitle: {
        marginTop: 32,
        marginBottom: 12,
    },
    attendanceCard: {
        gap: 14,
    },
    attendanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    attendanceDate: {
        fontSize: 15,
        fontWeight: '700',
        color: c.textPrimary,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeItem: {
        alignItems: 'center',
        flex: 1,
    },
    timeLabel: {
        fontSize: 12,
        color: c.textTertiary,
        marginBottom: 4,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: '700',
        color: c.textPrimary,
    },
    timeSeparator: {
        width: 1,
        height: 28,
        backgroundColor: c.divider,
        marginHorizontal: 8,
    },
    workplaceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    workplaceName: {
        flexShrink: 1,
        fontSize: 12,
        color: c.textSecondary,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: c.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 8,
    },
    emptyText: {
        fontSize: 17,
        fontWeight: '700',
        color: c.textPrimary,
        marginTop: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: c.textTertiary,
        textAlign: 'center',
    },
    // NFC 리더 관련 스타일
    nfcContainer: {
        flex: 1,
        backgroundColor: c.surfaceCanvas,
    },
    nfcHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: c.success,
    },
    closeButton: {
        padding: 10,
    },
    nfcTitle: {
        flex: 1,
        color: c.textInverse,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginRight: 44, // closeButton 크기만큼 오프셋
    },
    nfcReaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    nfcIconContainer: {
        marginBottom: 30,
        padding: 24,
        borderRadius: 60,
        backgroundColor: c.surface,
        shadowColor: c.shadowColor,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    nfcInstructions: {
        fontSize: 18,
        fontWeight: 'bold',
        color: c.textPrimary,
        textAlign: 'center',
        marginBottom: 10,
    },
    nfcSubInstructions: {
        fontSize: 14,
        color: c.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
    },
    nfcStatusContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    nfcStatusText: {
        fontSize: 16,
        color: c.success,
        marginTop: 10,
        fontWeight: '500',
    },
    nfcFooter: {
        padding: 20,
        backgroundColor: c.surface,
        borderTopWidth: 1,
        borderTopColor: c.border,
    },
});

export default AttendanceScreen;
