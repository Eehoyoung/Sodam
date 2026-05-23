import React, {useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from 'react-native-geolocation-service';
import {PERMISSIONS, request, RESULTS} from 'react-native-permissions';
import NfcManager from 'react-native-nfc-manager';
import {Button, Card, MainLayout} from '../../../common/components';
import attendanceService from '../services/attendanceService';
import {AttendanceRecord, AttendanceStatus} from '../types';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import { COLORS } from '../../../common/components/logo/Colors';
import LinearGradient from 'react-native-linear-gradient';

// 네비게이션 타입 정의
type AttendanceStackParamList = {
    Attendance: undefined;
    AttendanceDetail: { attendanceId: string };
    CheckIn: undefined;
    NFCScan: undefined;
};

type AttendanceScreenNavigationProp = NativeStackNavigationProp<AttendanceStackParamList, 'Attendance'>;

const AttendanceScreen = () => {
    const navigation = useNavigation<AttendanceScreenNavigationProp>();
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
    const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string>('');
    const [workplaces, setWorkplaces] = useState<{ id: string; name: string }[]>([]);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [showNFCReader, setShowNFCReader] = useState(false);
    const [nfcTagId, setNfcTagId] = useState<string>('');
    const [checkInMethod, setCheckInMethod] = useState<'standard' | 'location' | 'nfc'>('standard');

    // Refs to track location services and component mount status for proper cleanup
    const locationWatchId = useRef<number | null>(null);
    const isMountedRef = useRef(true);

    // NFC 지원 여부 확인
    const checkNFCSupport = async () => {
        try {
            const isSupported = await NfcManager.isSupported();
            if (!isSupported) {
                Alert.alert(
                    'NFC 미지원',
                    '이 기기는 NFC를 지원하지 않습니다. 다른 출퇴근 방법을 이용해주세요.',
                    [{text: '확인'}]
                );
                return false;
            }

            const isEnabled = await NfcManager.isEnabled();
            if (!isEnabled) {
                Alert.alert(
                    'NFC 비활성화',
                    'NFC 출퇴근을 위해 NFC를 활성화해주세요.',
                    [
                        {text: '취소', style: 'cancel'},
                        {
                            text: '설정으로 이동',
                            onPress: () => {
                                if (Platform.OS === 'android') {
                                    Linking.sendIntent('android.settings.NFC_SETTINGS');
                                } else {
                                    Linking.openSettings();
                                }
                            }
                        }
                    ]
                );
                return false;
            }

            return true;
        } catch (error) {
            console.error('NFC 지원 확인 실패:', error);
            Alert.alert(
                'NFC 오류',
                'NFC 상태를 확인할 수 없습니다.',
                [{text: '확인'}]
            );
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
                workplaceId: selectedWorkplaceId || undefined
            };

            // TODO(API): 출퇴근 기록 조회 API 연동 및 응답 스키마 반영
            const data = await attendanceService.getAttendanceRecords(filter);
            setAttendanceRecords(data);

            // 현재 근무 상태 조회
            if (selectedWorkplaceId) {
                // TODO(API): 현재 근무 상태 조회 API 연동
                const currentData = await attendanceService.getCurrentAttendance(selectedWorkplaceId);
                setCurrentAttendance(currentData);
            }
        } catch (error) {
            console.error('출퇴근 기록을 가져오는 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '출퇴근 기록을 불러오는 데 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // 근무지 목록 조회 (실제 구현에서는 API 호출)
    const fetchWorkplaces = async () => {
        try {
            // TODO(API): 근무지 목록 API 연동 (현재 임시 데이터 사용 중)
            const data = [
                {id: '1', name: '카페 소담'},
                {id: '2', name: '레스토랑 소담'}
            ];
            setWorkplaces(data);

            if (data.length > 0) {
                setSelectedWorkplaceId(data[0].id);
            }
        } catch (error) {
            console.error('근무지 목록을 가져오는 중 오류가 발생했습니다:', error);
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
                Alert.alert(
                    '위치 권한 필요',
                    '위치 기반 출퇴근을 위해서는 위치 접근 권한이 필요합니다.',
                    [{text: '확인'}]
                );
            }
        } catch (error) {
            console.error('위치 권한 요청 중 오류가 발생했습니다:', error);
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
                    Alert.alert('오류', '위치 정보를 가져오는 데 실패했습니다. 다시 시도해주세요.');
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
    }, []);

    // 선택된 근무지가 변경되면 출퇴근 기록 다시 조회
    useEffect(() => {
        if (selectedWorkplaceId) {
            fetchAttendanceRecords();
        }
    }, [selectedWorkplaceId]);

    // 새로고침 처리
    const handleRefresh = () => {
        setRefreshing(true);
        fetchAttendanceRecords();
    };

    // 기본 출근 처리
    const handleCheckIn = async () => {
        if (!selectedWorkplaceId) {
            Alert.alert('알림', '근무지를 선택해주세요.');
            return;
        }

        try {
            const checkInData = {
                workplaceId: selectedWorkplaceId
            };

            // TODO(API): 출근 처리(checkIn) 엔드포인트 연동
            const response = await attendanceService.checkIn(checkInData);
            Alert.alert('성공', '출근 처리되었습니다.');
            setCurrentAttendance(response);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('출근 처리 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '출근 처리에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 위치 기반 출근 처리
    const handleCheckInWithLocation = async () => {
        // TODO(API): 위치 인증/출근 처리 API 연동
        // TODO(AUTH): 'employeeId' 임시값을 로그인 사용자 ID로 대체
        if (!selectedWorkplaceId) {
            Alert.alert('알림', '근무지를 선택해주세요.');
            return;
        }

        if (!locationPermissionGranted) {
            requestLocationPermission();
            return;
        }

        if (!currentLocation) {
            Alert.alert('알림', '위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해주세요.');
            getCurrentLocation();
            return;
        }

        try {
            // 위치 기반 인증 먼저 수행
            const verifyResult = await attendanceService.verifyLocationAttendance(
                '1', // 임시 employeeId (실제 구현에서는 로그인한 사용자 ID 사용)
                selectedWorkplaceId,
                currentLocation.latitude,
                currentLocation.longitude
            );

            if (!verifyResult.success) {
                Alert.alert('알림', verifyResult.message ?? '위치 인증에 실패했습니다. 매장 반경 내에서 다시 시도해주세요.');
                return;
            }

            // 인증 성공 시 출근 처리
            const checkInData = {
                workplaceId: selectedWorkplaceId,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude
            };

            // TODO(API): 출근 처리(checkIn) 엔드포인트 연동
            const response = await attendanceService.checkIn(checkInData);
            Alert.alert('성공', '위치 기반 출근 처리되었습니다.');
            setCurrentAttendance(response);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('위치 기반 출근 처리 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '위치 기반 출근 처리에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // NFC 태그 기반 출근 처리
    const handleCheckInWithNFC = async (scannedNFCTag: string) => {
        // TODO(API): NFC 태그 인증/출근 처리 API 연동
        // TODO(NFC): 실제 태그값 파싱/검증 로직 연동
        if (!selectedWorkplaceId) {
            Alert.alert('알림', '근무지를 선택해주세요.');
            return;
        }

        try {
            // NFC 태그 기반 인증 먼저 수행
            const verifyResult = await attendanceService.verifyNfcTagAttendance(
                '1', // 임시 employeeId (실제 구현에서는 로그인한 사용자 ID 사용)
                selectedWorkplaceId,
                scannedNFCTag
            );

            if (!verifyResult.success) {
                Alert.alert('알림', verifyResult.message ?? 'NFC 태그 인증에 실패했습니다. 다시 시도해주세요.');
                return;
            }

            // 인증 성공 시 출근 처리
            const checkInData = {
                workplaceId: selectedWorkplaceId
            };

            // TODO(API): 출근 처리(checkIn) 엔드포인트 연동
            const response = await attendanceService.checkIn(checkInData);
            Alert.alert('성공', 'NFC 태그 기반 출근 처리되었습니다.');
            setCurrentAttendance(response);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('NFC 태그 기반 출근 처리 중 오류가 발생했습니다:', error);
            Alert.alert('오류', 'NFC 태그 기반 출근 처리에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 기본 퇴근 처리
    const handleCheckOut = async () => {
        if (!currentAttendance) {
            Alert.alert('알림', '현재 출근 상태가 아닙니다.');
            return;
        }

        try {
            const checkOutData = {
                workplaceId: selectedWorkplaceId
            };

            // TODO(API): 퇴근 처리(checkOut) 엔드포인트 연동
            await attendanceService.checkOut(currentAttendance.id, checkOutData);
            Alert.alert('성공', '퇴근 처리되었습니다.');
            setCurrentAttendance(null);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('퇴근 처리 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '퇴근 처리에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 위치 기반 퇴근 처리
    const handleCheckOutWithLocation = async () => {
        // TODO(API): 위치 인증/퇴근 처리 API 연동
        // TODO(AUTH): 'employeeId' 임시값을 로그인 사용자 ID로 대체
        if (!currentAttendance) {
            Alert.alert('알림', '현재 출근 상태가 아닙니다.');
            return;
        }

        if (!locationPermissionGranted) {
            requestLocationPermission();
            return;
        }

        if (!currentLocation) {
            Alert.alert('알림', '위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해주세요.');
            getCurrentLocation();
            return;
        }

        try {
            // 위치 기반 인증 먼저 수행
            const verifyResult = await attendanceService.verifyLocationAttendance(
                '1', // 임시 employeeId (실제 구현에서는 로그인한 사용자 ID 사용)
                selectedWorkplaceId,
                currentLocation.latitude,
                currentLocation.longitude
            );

            if (!verifyResult.success) {
                Alert.alert('알림', verifyResult.message ?? '위치 인증에 실패했습니다. 매장 반경 내에서 다시 시도해주세요.');
                return;
            }

            // 인증 성공 시 퇴근 처리
            const checkOutData = {
                workplaceId: selectedWorkplaceId,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude
            };

            // TODO(API): 퇴근 처리(checkOut) 엔드포인트 연동
            await attendanceService.checkOut(currentAttendance.id, checkOutData);
            Alert.alert('성공', '위치 기반 퇴근 처리되었습니다.');
            setCurrentAttendance(null);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('위치 기반 퇴근 처리 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '위치 기반 퇴근 처리에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // NFC 태그 기반 퇴근 처리
    const handleCheckOutWithNFC = async (scannedNFCTag: string) => {
        // TODO(API): NFC 태그 인증/퇴근 처리 API 연동
        // TODO(NFC): 실제 태그값 파싱/검증 로직 연동
        if (!currentAttendance) {
            Alert.alert('알림', '현재 출근 상태가 아닙니다.');
            return;
        }

        try {
            // NFC 태그 기반 인증 먼저 수행
            const verifyResult = await attendanceService.verifyNfcTagAttendance(
                '1', // 임시 employeeId (실제 구현에서는 로그인한 사용자 ID 사용)
                selectedWorkplaceId,
                scannedNFCTag
            );

            if (!verifyResult.success) {
                Alert.alert('알림', verifyResult.message ?? 'NFC 태그 인증에 실패했습니다. 다시 시도해주세요.');
                return;
            }

            // 인증 성공 시 퇴근 처리
            const checkOutData = {
                workplaceId: selectedWorkplaceId
            };

            // TODO(API): 퇴근 처리(checkOut) 엔드포인트 연동
            await attendanceService.checkOut(currentAttendance.id, checkOutData);
            Alert.alert('성공', 'NFC 태그 기반 퇴근 처리되었습니다.');
            setCurrentAttendance(null);
            fetchAttendanceRecords();
        } catch (error) {
            console.error('NFC 태그 기반 퇴근 처리 중 오류가 발생했습니다:', error);
            Alert.alert('오류', 'NFC 태그 기반 퇴근 처리에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 출퇴근 상태에 따른 색상 반환
    const getStatusColor = (status: AttendanceStatus) => {
        switch (status) {
            case AttendanceStatus.CHECKED_IN:
                return COLORS.SUCCESS; // 출근
            case AttendanceStatus.CHECKED_OUT:
                return COLORS.SODAM_BLUE; // 퇴근
            case AttendanceStatus.LATE:
                return COLORS.WARNING; // 지각
            case AttendanceStatus.ABSENT:
                return COLORS.ERROR; // 결근
            case AttendanceStatus.EARLY_LEAVE:
                return COLORS.SODAM_ORANGE; // 조퇴
            case AttendanceStatus.ON_LEAVE:
                return COLORS.INFO; // 휴가/정보
            default:
                return COLORS.GRAY_500; // 기본
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

    // 출퇴근 기록 항목 렌더링
    const renderAttendanceItem = ({item}: { item: AttendanceRecord }) => {
        const date = format(new Date(item.date), 'yyyy년 MM월 dd일 (EEE)', {locale: ko});
        const checkInTime = item.checkInTime ? format(new Date(item.checkInTime), 'HH:mm') : '-';
        const checkOutTime = item.checkOutTime ? format(new Date(item.checkOutTime), 'HH:mm') : '-';
        const workHours = item.workHours ? `${item.workHours}시간` : '-';

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('AttendanceDetail', {attendanceId: item.id})}
            >
                <Card style={styles.attendanceCard}>
                    <View style={styles.attendanceHeader}>
                        <Text style={styles.attendanceDate}>{date}</Text>
                        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
                            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                        </View>
                    </View>

                    <View style={styles.attendanceDetails}>
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
                            <Icon name="business" size={14} color={COLORS.GRAY_500}/>
                            <Text style={styles.workplaceName}>{item.workplaceName}</Text>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    // 빈 목록 표시
    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Icon name="event-busy" size={64} color={COLORS.GRAY_300}/>
            <Text style={styles.emptyText}>출퇴근 기록이 없습니다.</Text>
            <Text style={styles.emptySubText}>출근 버튼을 눌러 근무를 시작해보세요.</Text>
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
                        <Icon name="close" size={24} color="#fff"/>
                    </TouchableOpacity>
                    <Text style={styles.nfcTitle}>NFC 태그 읽기</Text>
                </View>

                <View style={styles.nfcReaderContainer}>
                    <View style={styles.nfcIconContainer}>
                        <Icon name="nfc" size={80} color={COLORS.SUCCESS}/>
                    </View>

                    <Text style={styles.nfcInstructions}>
                        NFC 태그를 기기 뒷면에 가까이 대주세요
                    </Text>

                    <Text style={styles.nfcSubInstructions}>
                        태그가 감지되면 자동으로 출퇴근 처리됩니다
                    </Text>

                    <View style={styles.nfcStatusContainer}>
                        <ActivityIndicator size="large" color={COLORS.SUCCESS}/>
                        <Text style={styles.nfcStatusText}>NFC 태그를 기다리는 중...</Text>
                    </View>
                </View>

                <View style={styles.nfcFooter}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowNFCReader(false)}
                    >
                        <Text style={styles.cancelButtonText}>취소</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <MainLayout>
            <View style={styles.container}>
                {renderNFCReader()}
                <LinearGradient
                    colors={[...COLORS.GRADIENT_PRIMARY]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <Text style={styles.headerTitle}>출퇴근 관리</Text>
                </LinearGradient>

                <View style={styles.workplaceSelector}>
                    {workplaces.map(workplace => (
                        <TouchableOpacity
                            key={workplace.id}
                            style={[
                                styles.workplaceOption,
                                selectedWorkplaceId === workplace.id && styles.selectedWorkplace
                            ]}
                            onPress={() => setSelectedWorkplaceId(workplace.id)}
                        >
                            <Text
                                style={[
                                    styles.workplaceOptionText,
                                    selectedWorkplaceId === workplace.id && styles.selectedWorkplaceText
                                ]}
                            >
                                {workplace.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.currentStatusContainer}>
                    <Card style={styles.currentStatusCard}>
                        <Text style={styles.currentStatusTitle}>현재 근무 상태</Text>

                        <View style={styles.statusInfo}>
                            {currentAttendance ? (
                                <>
                                    <View style={styles.statusDetail}>
                                        <Text style={styles.statusLabel}>출근 시간:</Text>
                                        <Text style={styles.statusValue}>
                                            {format(new Date(currentAttendance.checkInTime), 'HH:mm')}
                                        </Text>
                                    </View>

                                    <View style={styles.statusDetail}>
                                        <Text style={styles.statusLabel}>근무 시간:</Text>
                                        <Text style={styles.statusValue}>
                                            {Math.floor((new Date().getTime() - new Date(currentAttendance.checkInTime).getTime()) / (1000 * 60 * 60))}시간
                                            {Math.floor((new Date().getTime() - new Date(currentAttendance.checkInTime).getTime()) / (1000 * 60)) % 60}분
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.notWorkingText}>현재 근무 중이 아닙니다</Text>
                            )}
                        </View>

                        <View style={styles.checkInMethodSelector}>
                            <TouchableOpacity
                                style={[
                                    styles.methodOption,
                                    checkInMethod === 'standard' && styles.selectedMethod
                                ]}
                                onPress={() => setCheckInMethod('standard')}
                            >
                                <Icon name="login" size={16} color={checkInMethod === 'standard' ? '#fff' : '#555'}/>
                                <Text
                                    style={[
                                        styles.methodOptionText,
                                        checkInMethod === 'standard' && styles.selectedMethodText
                                    ]}
                                >
                                    기본
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.methodOption,
                                    checkInMethod === 'location' && styles.selectedMethod
                                ]}
                                onPress={() => {
                                    setCheckInMethod('location');
                                    if (!locationPermissionGranted) {
                                        requestLocationPermission();
                                    } else {
                                        getCurrentLocation();
                                    }
                                }}
                            >
                                <Icon name="location-on" size={16}
                                      color={checkInMethod === 'location' ? '#fff' : '#555'}/>
                                <Text
                                    style={[
                                        styles.methodOptionText,
                                        checkInMethod === 'location' && styles.selectedMethodText
                                    ]}
                                >
                                    위치
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.methodOption,
                                    checkInMethod === 'nfc' && styles.selectedMethod
                                ]}
                                onPress={() => setCheckInMethod('nfc')}
                            >
                                <Icon name="nfc" size={16}
                                      color={checkInMethod === 'nfc' ? '#fff' : '#555'}/>
                                <Text
                                    style={[
                                        styles.methodOptionText,
                                        checkInMethod === 'nfc' && styles.selectedMethodText
                                    ]}
                                >
                                    NFC
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.actionButtons}>
                            {!currentAttendance ? (
                                <>
                                    {checkInMethod === 'standard' && (
                                        <Button
                                            title="출근하기"
                                            onPress={handleCheckIn}
                                            type="primary"
                                            icon="login"
                                            fullWidth
                                        />
                                    )}
                                    {checkInMethod === 'location' && (
                                        <Button
                                            title="위치 기반 출근하기"
                                            onPress={handleCheckInWithLocation}
                                            type="primary"
                                            icon="location-on"
                                            fullWidth
                                        />
                                    )}
                                    {checkInMethod === 'nfc' && (
                                        <Button
                                            title="NFC 태그로 출근하기"
                                            onPress={openNFCReader}
                                            type="primary"
                                            icon="nfc"
                                            fullWidth
                                        />
                                    )}
                                </>
                            ) : (
                                <>
                                    {checkInMethod === 'standard' && (
                                        <Button
                                            title="퇴근하기"
                                            onPress={handleCheckOut}
                                            type="secondary"
                                            icon="logout"
                                            fullWidth
                                        />
                                    )}
                                    {checkInMethod === 'location' && (
                                        <Button
                                            title="위치 기반 퇴근하기"
                                            onPress={handleCheckOutWithLocation}
                                            type="secondary"
                                            icon="location-on"
                                            fullWidth
                                        />
                                    )}
                                    {checkInMethod === 'nfc' && (
                                        <Button
                                            title="NFC 태그로 퇴근하기"
                                            onPress={openNFCReader}
                                            type="secondary"
                                            icon="nfc"
                                            fullWidth
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    </Card>
                </View>

                <View style={styles.recordsContainer}>
                    <View style={styles.recordsHeader}>
                        <Text style={styles.recordsTitle}>최근 출퇴근 기록</Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.SODAM_BLUE}/>
                            <Text style={styles.loadingText}>출퇴근 기록을 불러오는 중...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={attendanceRecords}
                            renderItem={renderAttendanceItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContainer}
                            ListEmptyComponent={renderEmptyList}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={handleRefresh}
                                    colors={[COLORS.SODAM_BLUE]}
                                />
                            }
                        />
                    )}
                </View>
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.GRAY_50,
    },
    headerGradient: {
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    headerTitle: {
        padding: 16,
        backgroundColor: COLORS.WHITE,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.GRAY_200,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.WHITE,
    },
    workplaceSelector: {
        flexDirection: 'row',
        backgroundColor: COLORS.WHITE,
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.GRAY_200,
    },
    workplaceOption: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: COLORS.GRAY_100,
    },
    selectedWorkplace: {
        backgroundColor: COLORS.SODAM_ORANGE,
    },
    workplaceOptionText: {
        color: COLORS.GRAY_600,
        fontWeight: '500',
    },
    selectedWorkplaceText: {
        color: COLORS.WHITE,
    },
    currentStatusContainer: {
        padding: 16,
    },
    currentStatusCard: {
        padding: 16,
    },
    currentStatusTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.GRAY_800,
        marginBottom: 12,
    },
    statusInfo: {
        marginBottom: 16,
    },
    statusDetail: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    statusLabel: {
        width: 80,
        fontSize: 14,
        color: COLORS.GRAY_600,
    },
    statusValue: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.GRAY_800,
    },
    notWorkingText: {
        fontSize: 14,
        color: COLORS.GRAY_600,
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 8,
    },
    checkInMethodSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    methodOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginHorizontal: 4,
        backgroundColor: COLORS.GRAY_100,
    },
    selectedMethod: {
        backgroundColor: COLORS.SODAM_ORANGE,
    },
    methodOptionText: {
        color: COLORS.GRAY_600,
        fontWeight: '500',
        marginLeft: 4,
    },
    selectedMethodText: {
        color: COLORS.WHITE,
    },
    actionButtons: {
        marginTop: 8,
    },
    recordsContainer: {
        flex: 1,
    },
    recordsHeader: {
        padding: 16,
        paddingBottom: 8,
    },
    recordsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.GRAY_800,
    },
    listContainer: {
        padding: 16,
        paddingTop: 0,
    },
    attendanceCard: {
        marginBottom: 12,
        padding: 16,
    },
    attendanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    attendanceDate: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.GRAY_800,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    attendanceDetails: {
        marginTop: 4,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    timeItem: {
        alignItems: 'center',
        flex: 1,
    },
    timeLabel: {
        fontSize: 12,
        color: COLORS.GRAY_600,
        marginBottom: 4,
    },
    timeValue: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.GRAY_800,
    },
    timeSeparator: {
        width: 1,
        backgroundColor: COLORS.GRAY_200,
        marginHorizontal: 8,
    },
    workplaceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workplaceName: {
        fontSize: 12,
        color: COLORS.GRAY_600,
        marginLeft: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.GRAY_600,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.GRAY_700,
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: COLORS.GRAY_500,
        marginTop: 8,
        textAlign: 'center',
    },
    // NFC 리더 관련 스타일
    nfcContainer: {
        flex: 1,
        backgroundColor: COLORS.GRAY_50,
    },
    nfcHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: COLORS.SUCCESS,
    },
    closeButton: {
        padding: 10,
    },
    nfcTitle: {
        flex: 1,
        color: COLORS.WHITE,
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
        padding: 20,
        borderRadius: 50,
        backgroundColor: COLORS.WHITE,
        shadowColor: '#000',
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
        color: COLORS.GRAY_800,
        textAlign: 'center',
        marginBottom: 10,
    },
    nfcSubInstructions: {
        fontSize: 14,
        color: COLORS.GRAY_600,
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
        color: COLORS.SUCCESS,
        marginTop: 10,
        fontWeight: '500',
    },
    nfcFooter: {
        padding: 20,
        backgroundColor: COLORS.WHITE,
        borderTopWidth: 1,
        borderTopColor: COLORS.GRAY_200,
    },
    cancelButton: {
        backgroundColor: COLORS.ERROR,
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: COLORS.WHITE,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AttendanceScreen;
