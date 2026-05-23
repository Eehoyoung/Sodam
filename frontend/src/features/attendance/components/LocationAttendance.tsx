import React, {useEffect, useRef, useState} from 'react';
import {Platform, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {Button, Card, Toast} from '../../../common/components';
import {colors, spacing} from '../../../common/styles/theme';
import {useAuth} from '../../../contexts/AuthContext';
import {useWorkplaces} from '../../workplace/hooks/useWorkplaces';
import {isWithinRadius, verifyCheckInByLocation, verifyCheckOutByLocation} from '../services/locationAttendanceService';

interface LocationAttendanceProps {
    storeId: string;
    onSuccess?: (isCheckIn: boolean) => void;
    onError?: (error: string) => void;
}

const LocationAttendance: React.FC<LocationAttendanceProps> = ({
                                                                   storeId,
                                                                   onSuccess,
                                                                   onError
                                                               }) => {
    const {user} = useAuth();
    const {workplaces} = useWorkplaces();
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
    const [distanceInfo, setDistanceInfo] = useState<{
        distance: number;
        isWithin: boolean;
    } | null>(null);

    // Ref to track location watch ID for proper cleanup
    const locationWatchId = useRef<number | null>(null);
    const isMountedRef = useRef(true);

    const workplace = workplaces?.find(wp => wp.id === storeId);

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
                console.warn('LocationAttendance: Error stopping location observing:', error);
            }
        };
    }, []);

    // 위치 권한 요청
    const requestLocationPermission = async () => {
        setLocationStatus('requesting');

        try {
            if (Platform.OS === 'ios') {
                const granted = await Geolocation.requestAuthorization('whenInUse');
                if (granted === 'granted') {
                    setLocationStatus('granted');
                    getCurrentLocation();
                } else {
                    setLocationStatus('denied');
                    onError?.('위치 권한이 거부되었습니다.');
                }
            } else {
                // ✅ Android 전용 API 동적 import
                const { PermissionsAndroid } = await import('react-native');
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: '위치 권한 요청',
                        message: '출퇴근 인증을 위해 위치 권한이 필요합니다.',
                        buttonNeutral: '나중에 묻기',
                        buttonNegative: '거부',
                        buttonPositive: '허용'
                    }
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    setLocationStatus('granted');
                    getCurrentLocation();
                } else {
                    setLocationStatus('denied');
                    onError?.('위치 권한이 거부되었습니다.');
                }
            }
        } catch (err) {
            console.warn(err);
            setLocationStatus('denied');
            onError?.('위치 권한 요청 중 오류가 발생했습니다.');
        }
    };


    // 현재 위치 가져오기
    const getCurrentLocation = () => {
        if (!isMountedRef.current) {
            return;
        }

        setLoading(true);

        Geolocation.getCurrentPosition(
            position => {
                // Check if component is still mounted before updating state
                if (!isMountedRef.current) {
                    return;
                }

                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });

                // 매장 위치 정보가 있으면 거리 계산
                if (workplace?.latitude && workplace?.longitude) {
                    const result = isWithinRadius(
                        position.coords.latitude,
                        position.coords.longitude,
                        workplace.latitude,
                        workplace.longitude,
                        100 // 기본 반경 100m (매장별로 다르게 설정 가능)
                    );

                    setDistanceInfo(result);
                }

                setLoading(false);
            },
            error => {
                // Check if component is still mounted before updating state
                if (!isMountedRef.current) {
                    return;
                }

                console.error('LocationAttendance: Location error:', error);
                setLoading(false);
                if (onError) {onError('위치 정보를 가져오는데 실패했습니다.');}
                Toast.show({
                    type: 'error',
                    text1: '위치 오류',
                    text2: '위치 정보를 가져오는데 실패했습니다.'
                });
            },
            {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
        );
    };

    // 위치 기반 출근 인증
    const handleCheckIn = async () => {
        if (!user?.id || !location) {return;}

        setLoading(true);

        try {
            const response = await verifyCheckInByLocation({
                employeeId: user.id,
                storeId: parseInt(storeId, 10),
                latitude: location.latitude,
                longitude: location.longitude
            });

            setLoading(false);

            if (response.success) {
                Toast.show({
                    type: 'success',
                    text1: '출근 인증 성공',
                    text2: '성공적으로 출근 처리되었습니다.'
                });
                if (onSuccess) {onSuccess(true);}
            } else {
                Toast.show({
                    type: 'error',
                    text1: '출근 인증 실패',
                    text2: response.message ?? '출근 인증에 실패했습니다.'
                });
                if (onError) {onError(response.message ?? '출근 인증에 실패했습니다.');}
            }
        } catch (error) {
            setLoading(false);
            Toast.show({
                type: 'error',
                text1: '출근 인증 오류',
                text2: '서버 통신 중 오류가 발생했습니다.'
            });
            if (onError) {onError('서버 통신 중 오류가 발생했습니다.');}
        }
    };

    // 위치 기반 퇴근 인증
    const handleCheckOut = async () => {
        if (!user?.id || !location) {return;}

        setLoading(true);

        try {
            const response = await verifyCheckOutByLocation({
                employeeId: user.id,
                storeId: parseInt(storeId, 10),
                latitude: location.latitude,
                longitude: location.longitude
            });

            setLoading(false);

            if (response.success) {
                Toast.show({
                    type: 'success',
                    text1: '퇴근 인증 성공',
                    text2: '성공적으로 퇴근 처리되었습니다.'
                });
                if (onSuccess) {onSuccess(false);}
            } else {
                Toast.show({
                    type: 'error',
                    text1: '퇴근 인증 실패',
                    text2: response.message ?? '퇴근 인증에 실패했습니다.'
                });
                if (onError) {onError(response.message ?? '퇴근 인증에 실패했습니다.');}
            }
        } catch (error) {
            setLoading(false);
            Toast.show({
                type: 'error',
                text1: '퇴근 인증 오류',
                text2: '서버 통신 중 오류가 발생했습니다.'
            });
            if (onError) {onError('서버 통신 중 오류가 발생했습니다.');}
        }
    };

    // 위치 새로고침
    const handleRefreshLocation = () => {
        if (locationStatus === 'granted') {
            getCurrentLocation();
        } else {
            requestLocationPermission();
        }
    };

    // 컴포넌트 마운트 시 위치 권한 요청
    useEffect(() => {
        requestLocationPermission();
    }, []);

    return (
        <Card style={styles.container}>
            <Text style={styles.title}>위치 기반 출퇴근</Text>

            {/* 위치 상태 표시 */}
            {locationStatus === 'requesting' && (
                <Text style={styles.statusText}>위치 권한 요청 중...</Text>
            )}

            {locationStatus === 'denied' && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>위치 권한이 필요합니다</Text>
                    <Text style={styles.errorSubText}>앱 설정에서 위치 권한을 허용해주세요.</Text>
                    <Button
                        title="권한 다시 요청"
                        onPress={requestLocationPermission}
                        style={styles.button}
                    />
                </View>
            )}

            {locationStatus === 'granted' && (
                <>
                    {/* 매장 정보 */}
                    {workplace ? (
                        <View style={styles.workplaceContainer}>
                            <Text style={styles.workplaceName}>{workplace.name}</Text>
                            <Text style={styles.workplaceAddress}>{workplace.address}</Text>
                        </View>
                    ) : (
                        <Text style={styles.errorText}>매장 정보를 찾을 수 없습니다</Text>
                    )}

                    {/* 위치 정보 */}
                    {loading ? (
                        <Text style={styles.statusText}>위치 정보 가져오는 중...</Text>
                    ) : location ? (
                        <View style={styles.locationContainer}>
                            <Text style={styles.locationText}>
                                현재 위치: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                            </Text>

                            {distanceInfo && (
                                <View style={styles.distanceContainer}>
                                    <Text style={[
                                        styles.distanceText,
                                        distanceInfo.isWithin ? styles.distanceSuccess : styles.distanceError
                                    ]}>
                                        매장과의 거리: {distanceInfo.distance.toFixed(0)}m
                                        {distanceInfo.isWithin ? ' (인증 가능)' : ' (인증 불가)'}
                                    </Text>
                                </View>
                            )}

                            <Button
                                title="위치 새로고침"
                                onPress={handleRefreshLocation}
                                type="secondary"
                                style={styles.refreshButton}
                            />
                        </View>
                    ) : (
                        <Text style={styles.errorText}>위치 정보를 가져오지 못했습니다</Text>
                    )}

                    {/* 출퇴근 버튼 */}
                    {location && workplace && (
                        <View style={styles.buttonContainer}>
                            <Button
                                title="출근하기"
                                onPress={handleCheckIn}
                                loading={loading}
                                disabled={distanceInfo ? !distanceInfo.isWithin : true}
                                style={[styles.button, styles.checkInButton]}
                            />
                            <Button
                                title="퇴근하기"
                                onPress={handleCheckOut}
                                loading={loading}
                                disabled={distanceInfo ? !distanceInfo.isWithin : true}
                                style={[styles.button, styles.checkOutButton]}
                                type="secondary"
                            />
                        </View>
                    )}
                </>
            )}
        </Card>
    );
};

const styles = StyleSheet.create<{
    container: ViewStyle;
    title: TextStyle;
    statusText: TextStyle;
    errorContainer: ViewStyle;
    errorText: TextStyle;
    errorSubText: TextStyle;
    workplaceContainer: ViewStyle;
    workplaceName: TextStyle;
    workplaceAddress: TextStyle;
    locationContainer: ViewStyle;
    locationText: TextStyle;
    distanceContainer: ViewStyle;
    distanceText: TextStyle;
    distanceSuccess: TextStyle;
    distanceError: TextStyle;
    refreshButton: ViewStyle;
    buttonContainer: ViewStyle;
    button: ViewStyle;
    checkInButton: ViewStyle;
    checkOutButton: ViewStyle;
}>({
    container: {
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: spacing.md,
        color: colors.text,
    },
    statusText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginVertical: spacing.md,
    },
    errorContainer: {
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    errorText: {
        fontSize: 16,
        color: colors.error,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    errorSubText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    workplaceContainer: {
        marginBottom: spacing.md,
        padding: spacing.sm,
        backgroundColor: colors.background,
        borderRadius: 8,
    },
    workplaceName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    workplaceAddress: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    locationContainer: {
        marginBottom: spacing.md,
    },
    locationText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    distanceContainer: {
        marginVertical: spacing.sm,
    },
    distanceText: {
        fontSize: 16,
        fontWeight: '500',
    },
    distanceSuccess: {
        color: colors.success,
    },
    distanceError: {
        color: colors.error,
    },
    refreshButton: {
        marginTop: spacing.sm,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        marginHorizontal: spacing.xs,
    },
    checkInButton: {
        backgroundColor: colors.primary,
    },
    checkOutButton: {
        backgroundColor: colors.secondary,
    },
});

export default LocationAttendance;
