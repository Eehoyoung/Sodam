import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import NfcManager from 'react-native-nfc-manager';
import attendanceService from '../services/attendanceService';
import { AttendanceRecord } from '../types';

export type CheckMethod = 'standard' | 'location' | 'nfc';

interface UseAttendanceOptions {
  workplaceId?: string; // TODO: wire with real selected workplace from context or props
}

export const useAttendance = (options: UseAttendanceOptions = {}) => {
  const workplaceId = options.workplaceId ?? '1'; // Fallback to first workplace (TODO)

  const [method, setMethod] = useState<CheckMethod>('standard');
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      try {
        Geolocation.stopObserving();
      } catch {}
    };
  }, []);

  const loadCurrentStatus = useCallback(async () => {
    try {
      setLoading(true);
      if (workplaceId) {
        const curr = await attendanceService.getCurrentAttendance(workplaceId);
        if (isMountedRef.current) setCurrentAttendance(curr);
      }
    } catch (e) {
      console.warn('[useAttendance] Failed to load current status', e);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [workplaceId]);

  const loadRecentRecords = useCallback(async () => {
    try {
      setRecordsLoading(true);
      const now = new Date();
      const endDate = now.toISOString().slice(0, 10);
      const start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      const startDate = start.toISOString().slice(0, 10);
      const data = await attendanceService.getAttendanceRecords({ startDate, endDate, workplaceId });
      if (isMountedRef.current) setRecords(data);
    } catch (e) {
      console.warn('[useAttendance] Failed to load records', e);
    } finally {
      if (isMountedRef.current) setRecordsLoading(false);
    }
  }, [workplaceId]);

  useEffect(() => {
    loadCurrentStatus();
    loadRecentRecords();
  }, [loadCurrentStatus, loadRecentRecords]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      const result = await request(permission);
      const granted = result === RESULTS.GRANTED;
      if (granted) {
        setLocationPermissionGranted(true);
      }
      return granted;
    } catch (e) {
      console.warn('[useAttendance] requestLocationPermission error', e);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(() => {
    return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      if (!locationPermissionGranted) {
        resolve(null);
        return;
      }
      Geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          if (isMountedRef.current) setCurrentLocation({ latitude, longitude });
          resolve({ latitude, longitude });
        },
        _err => {
          Alert.alert('오류', '위치 정보를 가져오는 데 실패했습니다. 다시 시도해주세요.');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }, [locationPermissionGranted]);

  const ensureNFCAvailable = useCallback(async () => {
    try {
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        Alert.alert('NFC 미지원', '이 기기는 NFC를 지원하지 않습니다. 다른 출퇴근 방법을 이용해주세요.');
        return false;
      }
      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        Alert.alert('NFC 비활성화', 'NFC 출퇴근을 위해 NFC를 활성화해주세요.', [
          { text: '취소', style: 'cancel' },
          {
            text: '설정으로 이동',
            onPress: () => {
              if (Platform.OS === 'android') {
                // @ts-ignore: react-native Linking may not have sendIntent types
                Linking.sendIntent?.('android.settings.NFC_SETTINGS');
              } else {
                Linking.openSettings();
              }
            }
          }
        ]);
        return false;
      }
      return true;
    } catch (e) {
      Alert.alert('NFC 오류', 'NFC 상태를 확인할 수 없습니다.');
      return false;
    }
  }, []);

  const checkIn = useCallback(async () => {
    if (!workplaceId) {
      Alert.alert('알림', '근무지를 선택해주세요.');
      return;
    }
    try {
      setLoading(true);
      if (method === 'location') {
        const granted = await requestLocationPermission();
        if (!granted) return;
        const loc = await getCurrentLocation();
        if (!loc) return;
        const verify = await attendanceService.verifyLocationAttendance('1', workplaceId, loc.latitude, loc.longitude);
        if (!verify.success) {
          Alert.alert('알림', verify.message ?? '위치 인증에 실패했습니다. 매장 반경 내에서 다시 시도해주세요.');
          return;
        }
      } else if (method === 'nfc') {
        const ok = await ensureNFCAvailable();
        if (!ok) return;
        // NFC 실제 스캔은 상세 화면(AttendanceScreen)에서 처리함
        Alert.alert('안내', 'NFC 스캔은 상세 화면에서 진행됩니다.');
        return;
      }

      const resp = await attendanceService.checkIn({ workplaceId });
      setCurrentAttendance(resp);
      await loadRecentRecords();
      Alert.alert('성공', method === 'location' ? '위치 기반 출근 처리되었습니다.' : '출근 처리되었습니다.');
    } catch (e) {
      Alert.alert('오류', '출근 처리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [method, workplaceId, requestLocationPermission, getCurrentLocation, ensureNFCAvailable, loadRecentRecords]);

  const checkOut = useCallback(async () => {
    if (!currentAttendance) {
      Alert.alert('알림', '현재 출근 상태가 아닙니다.');
      return;
    }
    try {
      setLoading(true);
      if (method === 'location') {
        const granted = await requestLocationPermission();
        if (!granted) return;
        const loc = await getCurrentLocation();
        if (!loc) return;
        const verify = await attendanceService.verifyLocationAttendance('1', workplaceId, loc.latitude, loc.longitude);
        if (!verify.success) {
          Alert.alert('알림', verify.message ?? '위치 인증에 실패했습니다. 매장 반경 내에서 다시 시도해주세요.');
          return;
        }
      } else if (method === 'nfc') {
        const ok = await ensureNFCAvailable();
        if (!ok) return;
        Alert.alert('안내', 'NFC 스캔은 상세 화면에서 진행됩니다.');
        return;
      }

      await attendanceService.checkOut(currentAttendance.id, { workplaceId });
      setCurrentAttendance(null);
      await loadRecentRecords();
      Alert.alert('성공', method === 'location' ? '위치 기반 퇴근 처리되었습니다.' : '퇴근 처리되었습니다.');
    } catch (e) {
      Alert.alert('오류', '퇴근 처리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [method, currentAttendance, workplaceId, requestLocationPermission, getCurrentLocation, ensureNFCAvailable, loadRecentRecords]);

  return {
    method,
    setMethod,
    currentAttendance,
    records,
    loading,
    recordsLoading,
    locationPermissionGranted,
    currentLocation,
    actions: {
      checkIn,
      checkOut,
      reload: async () => {
        await Promise.all([loadCurrentStatus(), loadRecentRecords()]);
      }
    }
  } as const;
};

export default useAttendance;
