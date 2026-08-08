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
import NfcManager, {Ndef, NfcTech} from 'react-native-nfc-manager';
import attendanceService from '../services/attendanceService';
import storeService from '../../store/services/storeService';
import {wageService} from '../../wage/services/wageService';
import {CheckoutConfirmSheet, NfcUnsupportedScreen, PunchFailedScreen, PunchSuccessScreen} from '../components/AttendanceSheets';
import {AttendanceRecord, AttendanceStatus, CheckInRequest, CheckOutRequest} from '../types';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import { useThemeColors, ThemeColors } from '../../../common/hooks/useThemeColors';
import {parseServerDateTime} from '../../../common/format/dateTime';
import EmployeeWorkingRing from '../components/EmployeeWorkingRing';
import {useLocationConsentGate} from '../hooks/useLocationConsentGate';

type CheckInMethod = 'standard' | 'location' | 'nfc' | 'qr';
export interface AttendanceVisualFixture {
    workplaces: {id: string; name: string}[];
    selectedWorkplaceId: string;
    attendanceRecords: AttendanceRecord[];
    currentAttendance: AttendanceRecord | null;
    checkInMethod?: CheckInMethod;
    locationPermissionGranted?: boolean;
    currentLocation?: {latitude: number; longitude: number} | null;
    selectedWage?: number;
    elapsedSeconds?: number;
    /** 개발용 시각 검증 전용 — NFC 판독 모달(59 NFCScanModal)을 강제로 열린 상태로 렌더링한다. */
    forceShowNfcReader?: boolean;
    /** 개발용 시각 검증 전용 — Modal은 별도 Android 창이라 배경 마커가 uiautomator에 안 잡힌다. */
    captureMarker?: string;
}

interface AttendanceScreenProps {
    /** Development-only deterministic state used by the Android visual harness. */
    visualFixture?: AttendanceVisualFixture;
}
// iOS는 CoreNFC 제약(entitlement·실기기 전용 등)으로 1차 출시에서 NFC 출퇴근을 제외 — GPS·사장승인 방식으로 대체.
// QR(WP-C)은 두 플랫폼 모두 지원한다 — iOS에 NFC가 없어 GPS만 남으면 실내 오차를 감당할 수단이 없다.
const METHOD_ORDER: CheckInMethod[] = Platform.OS === 'ios'
    ? ['standard', 'location', 'qr']
    : ['standard', 'location', 'nfc', 'qr'];
const METHOD_LABELS = Platform.OS === 'ios'
    ? ['기본', '위치', 'QR']
    : ['기본', '위치', 'NFC', 'QR'];

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);
    const { user } = useAuth();
    const { ensureLocationConsent } = useLocationConsentGate();
    const employeeIdNum = visualFixture ? 1 : Number(user?.id);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(visualFixture?.attendanceRecords ?? []);
    const [loading, setLoading] = useState(!visualFixture);
    const [refreshing, setRefreshing] = useState(false);
    const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(visualFixture?.currentAttendance ?? null);
    const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string>(visualFixture?.selectedWorkplaceId ?? '');
    const [workplaces, setWorkplaces] = useState<{ id: string; name: string }[]>(visualFixture?.workplaces ?? []);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(visualFixture?.locationPermissionGranted ?? false);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(visualFixture?.currentLocation ?? null);
    const [showNFCReader, setShowNFCReader] = useState(visualFixture?.forceShowNfcReader ?? false);
    const [, setNfcTagId] = useState<string>('');
    const [checkInMethod, setCheckInMethod] = useState<CheckInMethod>(visualFixture?.checkInMethod ?? 'standard');
    // 근무 중 경과 시간 표시를 매초 갱신하기 위한 더미 tick (실제 값은 항상 Date.now() 재계산 — drift 누적 방지)
    const [tick, setTick] = useState(0);
    // 60/61/62/63 죽은 코드 배선(v3 §7) — 판정 로직(GPS 반경 계산·NFC 태그 판독·check-in/out API 호출)은
    // 절대 건드리지 않고, 그 호출 앞뒤에 확인/성공/실패 UI만 추가로 씌운다.
    const [selectedWage, setSelectedWage] = useState(visualFixture?.selectedWage ?? 0);
    const [nfcUnsupportedVisible, setNfcUnsupportedVisible] = useState(false);
    const [checkoutConfirmVisible, setCheckoutConfirmVisible] = useState(false);
    const [punchSuccess, setPunchSuccess] = useState<{time: string; storeName: string; wage: number} | null>(null);
    const [punchFailed, setPunchFailed] = useState(false);

    // Refs to track location services and component mount status for proper cleanup
    const locationWatchId = useRef<number | null>(null);
    const isMountedRef = useRef(true);

    // NFC 지원 여부 확인
    const checkNFCSupport = async () => {
        try {
            const isSupported = await NfcManager.isSupported();
            if (!isSupported) {
                // 60 NFCUnsupported — 토스트 대신 전체화면 안내로 교체(§4.2)
                setNfcUnsupportedVisible(true);
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

    // NFC 태그 스캔 시작 — 기기에 태그를 대면 getTag() 이 resolve 된다.
    const startNFCScan = async () => {
        try {
            await NfcManager.start();
            await NfcManager.requestTechnology(NfcTech.Ndef);
            const tag = await NfcManager.getTag();

            if (!isMountedRef.current) {
                await NfcManager.cancelTechnologyRequest().catch(() => {});
                return;
            }

            let scannedTag = '';
            if (tag?.ndefMessage?.length) {
                const ndefRecord = tag.ndefMessage[0];
                scannedTag = Ndef.text.decodePayload(Uint8Array.from((ndefRecord as any).payload || []));
            } else if (tag?.id) {
                scannedTag = tag.id;
            }

            if (!scannedTag) {
                throw new Error('NFC 태그에서 데이터를 읽을 수 없어요.');
            }

            await handleNFCTagScanned(scannedTag);
        } catch (error) {
            if (!isMountedRef.current) {return;}
            console.error('NFC 태그 스캔 실패:', error);
            AppToast.error('NFC 태그 읽기에 실패했어요. 다시 시도해 주세요.');
            setShowNFCReader(false);
        } finally {
            NfcManager.cancelTechnologyRequest().catch(() => {});
        }
    };

    // NFC 스캔 취소 (모달 닫기)
    const cancelNFCScan = () => {
        setShowNFCReader(false);
        NfcManager.cancelTechnologyRequest().catch(() => {});
    };

    // NFC 리더 열기
    const openNFCReader = async () => {
        const isNFCAvailable = await checkNFCSupport();
        if (isNFCAvailable) {
            setShowNFCReader(true);
            startNFCScan();
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

    // 현재 위치 가져오기 — GPS 좌표를 실제로 수집하기 직전(Geolocation.getCurrentPosition 호출
    // 직전)에 위치정보 이용 동의를 확인한다(GPS 출퇴근 첫 사용 시점, 위치정보법 §19②). 이미
    // 동의한 사용자는 useLocationConsentGate 가 즉시 통과시켜 매번 뜨지 않는다.
    const getCurrentLocation = () => {
        if (!isMountedRef.current) {
            return;
        }

        if (locationPermissionGranted) {
            ensureLocationConsent().then(consented => {
                if (!isMountedRef.current) {
                    return;
                }
                if (!consented) {
                    // 강제로 막지 않고 대체 수단(NFC/사장님 승인)으로 자연스럽게 안내만 한다.
                    AppToast.show(
                        Platform.OS === 'ios'
                            ? '위치정보 동의 없이도 사장님 승인으로 출퇴근할 수 있어요.'
                            : '위치정보 동의 없이도 NFC나 사장님 승인으로 출퇴근할 수 있어요.'
                    );
                    return;
                }
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
            });
        }
    };

    // NFC 태그 스캔 처리
    const handleNFCTagScanned = async (scannedNFCTag: string) => {
        setNfcTagId(scannedNFCTag);
        setShowNFCReader(false);

        // NFC 태그로 출퇴근 처리
        if (currentAttendance) {
            await handleCheckOutWithNFC(scannedNFCTag);
        } else {
            await handleCheckInWithNFC(scannedNFCTag);
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

            // Cancel any in-flight NFC scan to avoid leaking the native tech session
            NfcManager.cancelTechnologyRequest().catch(() => {});
        };
    }, []);

    // 화면 로드 시 데이터 조회 및 위치 권한 요청
    useEffect(() => {
        if (visualFixture) {
            return;
        }
        fetchWorkplaces();
        requestLocationPermission();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 1회 초기 로드(함수 의존 추가 시 반복 호출)
    }, []);

    // 선택된 근무지가 변경되면 출퇴근 기록 다시 조회
    useEffect(() => {
        if (visualFixture) {
            return;
        }
        if (selectedWorkplaceId) {
            fetchAttendanceRecords();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 근무지 변경 시에만 재조회(fetchAttendanceRecords 는 selectedWorkplaceId 를 읽으므로 의도된 트리거)
    }, [selectedWorkplaceId, visualFixture]);

    // 근무 중일 때만 1초마다 tick 을 올려 elapsedLabel 이 매초 재계산되도록 강제 리렌더
    useEffect(() => {
        if (visualFixture) {
            return;
        }
        const working = !!currentAttendance && !currentAttendance.checkOutTime;
        if (!working) {
            return;
        }
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [currentAttendance, visualFixture]);

    // 61 CheckoutConfirmSheet/62 PunchSuccess 표기용 적용 시급 — 조회 실패해도 화면 진행에는 영향 없음(best-effort).
    useEffect(() => {
        if (visualFixture) {
            return;
        }
        if (!selectedWorkplaceId || !Number.isFinite(employeeIdNum)) {
            setSelectedWage(0);
            return;
        }
        wageService.getEmployeeWage(employeeIdNum, Number(selectedWorkplaceId))
            .then(res => setSelectedWage(res.hourlyWage ?? 0))
            .catch(() => setSelectedWage(0));
    }, [selectedWorkplaceId, employeeIdNum, visualFixture]);

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

    // 62 PunchSuccess 데이터 조립 — 이미 완료된 출근 처리 결과를 어떻게 보여줄지만 담당(판정 로직과 무관).
    const showPunchSuccess = () => {
        const storeName = workplaces.find(w => w.id === selectedWorkplaceId)?.name ?? '매장';
        setPunchSuccess({time: format(new Date(), 'HH:mm'), storeName, wage: selectedWage});
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
            // 62 PunchSuccess — 토스트 대신 전체화면 성공 안내(§4.2). 판정/기록 로직은 그대로.
            showPunchSuccess();
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
                // 63 PunchFailedRadius — 반경 이탈은 토스트 대신 전체화면 안내(§4.2). 판정 로직은 그대로.
                setPunchFailed(true);
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
            showPunchSuccess();
            setCurrentAttendance(response);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('위치 기반 출근 처리 중 오류가 생겼어요:', error);
            AppToast.error('위치 기반 출근 처리에 실패했어요. 다시 시도해 주세요.');
        }
    };

    // NFC 태그 기반 출근 처리 — 매장 등록 태그 검증 + 기록을 BE 가 한 번에 처리(GPS 불요)
    const handleCheckInWithNFC = async (scannedNFCTag: string) => {
        if (!selectedWorkplaceId) {
            AppToast.show('근무지를 선택해주세요.');
            return;
        }
        if (!Number.isFinite(employeeIdNum)) {
            AppToast.show('로그인이 필요합니다.');
            return;
        }

        try {
            const response = await attendanceService.checkInWithNfc({
                employeeId: employeeIdNum,
                workplaceId: selectedWorkplaceId,
                tagId: scannedNFCTag,
            });
            AppToast.success('NFC 태그 기반 출근 처리됐어요.');
            setCurrentAttendance(response);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('NFC 태그 기반 출근 처리 중 오류가 생겼어요:', error);
            const message = (error as any)?.response?.data?.message;
            AppToast.error(message ?? 'NFC 태그 기반 출근 처리에 실패했어요. 등록된 태그인지 확인해 주세요.');
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

    // NFC 태그 기반 퇴근 처리 — 매장 등록 태그 검증 + 기록을 BE 가 한 번에 처리(GPS 불요)
    const handleCheckOutWithNFC = async (scannedNFCTag: string) => {
        if (!currentAttendance) {
            AppToast.show('현재 출근 상태가 아닙니다.');
            return;
        }
        if (!Number.isFinite(employeeIdNum)) {
            AppToast.show('로그인이 필요합니다.');
            return;
        }

        try {
            await attendanceService.checkOutWithNfc({
                employeeId: employeeIdNum,
                workplaceId: selectedWorkplaceId,
                tagId: scannedNFCTag,
            });
            AppToast.success('NFC 태그 기반 퇴근 처리됐어요.');
            setCurrentAttendance(null);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('NFC 태그 기반 퇴근 처리 중 오류가 생겼어요:', error);
            const message = (error as any)?.response?.data?.message;
            AppToast.error(message ?? 'NFC 태그 기반 퇴근 처리에 실패했어요. 등록된 태그인지 확인해 주세요.');
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

    // 현재 근무 경과 초(WORKING 상태 링 표기, 22 EmployeeWorking) — tick 에 의존해 1초마다 재계산
    // (위 useEffect 가 근무 중일 때 tick 을 올림). 값 자체는 항상 Date.now() - checkInTime 실제
    // 시각차를 재계산하므로 setInterval 지연/스로틀링에 drift 가 쌓이지 않음.
    const calculatedElapsedSeconds = useMemo((): number => {
        if (!currentAttendance) {
            return 0;
        }
        // 음수 방지: 기기/서버 시간대 skew(예: 기기 UTC, 서버 KST)로 경과가 음수가 되는 것을 0으로 클램프.
        // (실 운영은 기기·서버 모두 KST라 정상.)
        const ms = Math.max(0, new Date().getTime() - parseServerDateTime(currentAttendance.checkInTime).getTime());
        return ms / 1000;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- tick 은 값 자체가 아니라 매초 재계산을 트리거하는 용도로만 필요
    }, [currentAttendance, tick]);
    const elapsedSeconds = visualFixture?.elapsedSeconds ?? calculatedElapsedSeconds;

    // 선택된 방식에 따른 출근 핸들러
    const onCheckInPress = () => {
        if (checkInMethod === 'standard') {handleCheckIn();}
        else if (checkInMethod === 'location') {handleCheckInWithLocation();}
        else {openNFCReader();}
    };
    // 선택된 방식에 따른 퇴근 핸들러 — standard/location 은 61 CheckoutConfirmSheet 확인 후
    // 기존 핸들러를 그대로 호출한다(NFC 는 태그를 대는 동작 자체가 확인 절차라 시트를 끼우지 않음).
    const onCheckOutPress = () => {
        if (checkInMethod === 'nfc') {
            openNFCReader();
            return;
        }
        setCheckoutConfirmVisible(true);
    };
    const confirmCheckOut = () => {
        setCheckoutConfirmVisible(false);
        if (checkInMethod === 'location') {handleCheckOutWithLocation();}
        else {handleCheckOut();}
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

    // 59 NFCScanModal 렌더링(v3 §4.1 "59 NFCScanModal" 카드) — 다크 state-center 패턴으로 재작성.
    // 판정 로직(태그 스캔 콜백 startNFCScan/handleNFCTagScanned, 취소 cancelNFCScan)은 절대 건드리지 않고
    // 시각 레이어만 교체 — 기존 초록 헤더 풀스크린 Modal 대신 원형 틸 아이콘 + 진행바 + outline-dark 취소.
    const renderNFCReader = () => (
        <Modal
            visible={showNFCReader}
            animationType="fade"
            onRequestClose={cancelNFCScan}
        >
            <View style={styles.nfcDarkContainer}>
                {visualFixture?.captureMarker ? (
                    <Text style={styles.captureMarker}>{visualFixture.captureMarker}</Text>
                ) : null}
                <View style={styles.nfcIconCircle}>
                    <Ionicons name="wifi" size={36} color="#2DD4BF" />
                </View>

                <Text style={styles.nfcDarkTitle}>
                    NFC 태그를{'\n'}가까이 대세요
                </Text>
                <Text style={styles.nfcDarkSub}>
                    태그가 감지되면 자동으로 출퇴근 처리됩니다.
                </Text>

                <View style={styles.nfcProgressCard}>
                    <View style={styles.nfcProgressTrack}>
                        <View style={styles.nfcProgressFill} />
                    </View>
                    <Text style={styles.nfcProgressLabel}>태그를 기다리는 중…</Text>
                </View>

                <TouchableOpacity
                    onPress={cancelNFCScan}
                    style={styles.nfcCancelBtn}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="NFC 스캔 취소">
                    <Text style={styles.nfcCancelText}>취소</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );

    return (
        <ScreenContainer
            padded={false}
            header={<AppHeader title="출퇴근 관리" onBack={() => navigation.goBack()} />}
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

            {/* 60 NFCUnsupported — checkNFCSupport() 가 미지원 판정했을 때만 노출 */}
            <Modal visible={nfcUnsupportedVisible} animationType="slide" onRequestClose={() => setNfcUnsupportedVisible(false)}>
                <NfcUnsupportedScreen
                    onClose={() => setNfcUnsupportedVisible(false)}
                    onGps={() => {
                        setNfcUnsupportedVisible(false);
                        setCheckInMethod('location');
                        if (!locationPermissionGranted) {requestLocationPermission();}
                    }}
                    onManual={() => {
                        setNfcUnsupportedVisible(false);
                        AppToast.show('사장님께 수동 출퇴근 처리를 요청해 주세요.');
                    }}
                />
            </Modal>

            {/* 62 PunchSuccess — 기본/위치 출근 API 성공 이후 표시(판정·기록 로직 이후 UI 전용) */}
            <Modal visible={!!punchSuccess} animationType="slide" onRequestClose={() => setPunchSuccess(null)}>
                {punchSuccess ? (
                    <PunchSuccessScreen
                        time={punchSuccess.time}
                        storeName={punchSuccess.storeName}
                        wage={punchSuccess.wage}
                        onStart={() => setPunchSuccess(null)}
                        onClose={() => setPunchSuccess(null)}
                    />
                ) : null}
            </Modal>

            {/* 63 PunchFailedRadius — 위치 인증 실패(반경 이탈) 시 표시 */}
            <Modal visible={punchFailed} animationType="slide" onRequestClose={() => setPunchFailed(false)}>
                <PunchFailedScreen
                    onRetry={() => {
                        setPunchFailed(false);
                        handleCheckInWithLocation();
                    }}
                    onManual={() => {
                        setPunchFailed(false);
                        AppToast.show('사장님께 수동 출퇴근 처리를 요청해 주세요.');
                    }}
                />
            </Modal>

            {/* 61 CheckoutConfirmSheet — standard/location 퇴근 전 확인. onConfirm 은 기존 핸들러 그대로 호출 */}
            <CheckoutConfirmSheet
                visible={checkoutConfirmVisible}
                onClose={() => setCheckoutConfirmVisible(false)}
                workedSeconds={elapsedSeconds}
                expectedPay={Math.round((elapsedSeconds / 3600) * selectedWage)}
                onConfirm={confirmCheckOut}
            />

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
                                    {/* 22 EmployeeWorking — EmployeeAttendanceHome 과 공유하는 근무중 진행률 링 */}
                                    <EmployeeWorkingRing elapsedSeconds={elapsedSeconds} subLabel="근무중" />
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

                        {/* 20 AttendanceScreen(인증방식) info-card — 선택한 방식에 대한 안내만 표시(판정 로직 무관, 시각 전용) */}
                        {checkInMethod === 'location' ? (
                            <AppCard variant="outlined" style={styles.methodInfoCard}>
                                <AppText variant="titleMd">
                                    {locationPermissionGranted ? 'GPS 인증 정상' : 'GPS 권한이 필요해요'}
                                </AppText>
                                <AppText variant="bodyMd" tone="secondary" style={styles.methodInfoBody}>
                                    {locationPermissionGranted
                                        ? '현재 위치가 매장 반경 안에 있는지 출근 시 확인해요.'
                                        : '위치 권한을 허용하면 매장 반경 안에서 출근할 수 있어요.'}
                                </AppText>
                            </AppCard>
                        ) : null}
                        {checkInMethod === 'nfc' ? (
                            <AppCard variant="outlined" style={styles.methodInfoCard}>
                                <AppText variant="titleMd">NFC 태그</AppText>
                                <AppText variant="bodyMd" tone="secondary" style={styles.methodInfoBody}>
                                    태그를 휴대폰 뒷면에 가까이 대면 자동 처리됩니다. (Android 전용)
                                </AppText>
                            </AppCard>
                        ) : null}

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
    methodInfoCard: {
        marginTop: 14,
    },
    methodInfoBody: {
        marginTop: 4,
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
    // 59 NFCScanModal — 항상 다크(라이트/다크 모드 설정과 무관, 시안 device__screen--dark 고정)라
    // 테마 토큰(c.*) 대신 고정 hex 를 쓴다(§ v3 03-employee.html "59 NFCScanModal").
    captureMarker: {position: 'absolute', width: 1, height: 1, fontSize: 1, lineHeight: 1, color: 'transparent'},
    nfcDarkContainer: {
        flex: 1,
        backgroundColor: '#12141B',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    nfcIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#173330',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    nfcDarkTitle: {
        fontSize: 22,
        lineHeight: 30,
        fontWeight: '800',
        color: '#F5F3EF',
        textAlign: 'center',
    },
    nfcDarkSub: {
        marginTop: 10,
        fontSize: 14,
        lineHeight: 21,
        color: 'rgba(245,243,239,0.7)',
        textAlign: 'center',
    },
    nfcProgressCard: {
        width: '100%',
        marginTop: 28,
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(245,243,239,0.2)',
    },
    nfcProgressTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
    },
    nfcProgressFill: {
        width: '66%',
        height: '100%',
        borderRadius: 3,
        backgroundColor: '#2DD4BF',
    },
    nfcProgressLabel: {
        marginTop: 8,
        fontSize: 13,
        color: 'rgba(245,243,239,0.7)',
    },
    nfcCancelBtn: {
        marginTop: 20,
        alignSelf: 'stretch',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245,243,239,0.35)',
        alignItems: 'center',
    },
    nfcCancelText: {
        color: '#F5F3EF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default AttendanceScreen;
