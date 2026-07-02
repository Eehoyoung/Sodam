import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import NfcManager from 'react-native-nfc-manager';
import {AppToast, ConfirmSheet} from '../../../common/components/ds';
import attendanceService from '../services/attendanceService';
import storeService from '../../store/services/storeService';
import { AttendanceRecord } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

export type CheckMethod = 'standard' | 'location' | 'nfc';

interface UseAttendanceOptions {
  workplaceId?: string; // TODO: wire with real selected workplace from context or props
}

export const useAttendance = (options: UseAttendanceOptions = {}) => {
  const { user } = useAuth();
  const employeeIdNum = Number(user?.id);
  // 근무지: prop 우선, 없으면 직원 본인 실제 첫 매장으로 해석.
  // (과거 '1' 하드코딩 폴백은 엉뚱한 매장 조회/404 를 유발했다.)
  const [resolvedWorkplaceId, setResolvedWorkplaceId] = useState<string>(options.workplaceId ?? '');
  const workplaceId = resolvedWorkplaceId;

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
      } catch {
        // ignore: cleanup best-effort, observer may already be stopped
      }
    };
  }, []);

  // prop 으로 받은 근무지가 없으면 직원 본인 실제 매장을 조회해 첫 매장으로 설정.
  useEffect(() => {
    if (options.workplaceId) {
      setResolvedWorkplaceId(options.workplaceId);
      return;
    }
    if (!Number.isFinite(employeeIdNum)) {
      return;
    }
    storeService.getEmployeeStores(employeeIdNum)
      .then(stores => {
        if (isMountedRef.current && stores.length > 0) {
          setResolvedWorkplaceId(String(stores[0].id));
        }
      })
      .catch(() => { /* 무시: 요약 패널은 보조 정보 */ });
  }, [options.workplaceId, employeeIdNum]);

  const loadCurrentStatus = useCallback(async () => {
    try {
      setLoading(true);
      if (workplaceId) {
        const curr = await attendanceService.getCurrentAttendance(workplaceId, employeeIdNum);
        // null(일시 미수신)이면 기존 상태 유지 — 출근 직후 깜빡임 방지. 근무중 판정은 checkOutTime 으로.
        if (isMountedRef.current && curr) {setCurrentAttendance(curr);}
      }
    } catch (e) {
      console.warn('[useAttendance] Failed to load current status', e);
    } finally {
      if (isMountedRef.current) {setLoading(false);}
    }
  }, [workplaceId, employeeIdNum]);

  const loadRecentRecords = useCallback(async () => {
    try {
      setRecordsLoading(true);
      const now = new Date();
      const endDate = now.toISOString().slice(0, 10);
      const start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      const startDate = start.toISOString().slice(0, 10);
      const data = await attendanceService.getAttendanceRecords({
        startDate, endDate, workplaceId,
        employeeId: Number.isFinite(employeeIdNum) ? String(employeeIdNum) : undefined,
      });
      if (isMountedRef.current) {setRecords(data);}
    } catch (e) {
      console.warn('[useAttendance] Failed to load records', e);
    } finally {
      if (isMountedRef.current) {setRecordsLoading(false);}
    }
  }, [workplaceId, employeeIdNum]);

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
          if (isMountedRef.current) {setCurrentLocation({ latitude, longitude });}
          resolve({ latitude, longitude });
        },
        _err => {
          AppToast.error('위치 정보를 가져오지 못했어요. 다시 시도해 주세요.');
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
        AppToast.warn('이 기기는 NFC를 지원하지 않아요. 다른 출퇴근 방법을 이용해 주세요.');
        return false;
      }
      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        ConfirmSheet.confirm({
          title: 'NFC가 꺼져 있어요',
          description: 'NFC 출퇴근을 위해 설정에서 NFC를 켜 주세요.',
          primary: {
            label: '설정으로 이동',
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.sendIntent?.('android.settings.NFC_SETTINGS');
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
    } catch (e) {
      AppToast.error('NFC 상태를 확인할 수 없어요.');
      return false;
    }
  }, []);

  // BE AttendanceRequestDto 4필드 모두 @NotNull 이라 standard 모드에서도 GPS 좌표 필수.
  // 위치 권한이 없으면 출퇴근 자체가 불가능 — 매장 반경 검증을 BE 가 강제.
  const ensureLocation = useCallback(async () => {
    const granted = await requestLocationPermission();
    if (!granted) {return null;}
    return await getCurrentLocation();
  }, [requestLocationPermission, getCurrentLocation]);

  const checkIn = useCallback(async () => {
    if (!workplaceId) {
      AppToast.warn('근무지를 선택해 주세요.');
      return;
    }
    if (!Number.isFinite(employeeIdNum)) {
      AppToast.warn('로그인이 필요해요.');
      return;
    }
    try {
      setLoading(true);
      const loc = await ensureLocation();
      if (!loc) {
        AppToast.warn('위치 권한이 필요해요.');
        return;
      }
      if (method === 'location') {
        const verify = await attendanceService.verifyLocationAttendance(String(employeeIdNum), workplaceId, loc.latitude, loc.longitude);
        if (!verify.success) {
          AppToast.warn(verify.message ?? '위치 인증에 실패했어요. 매장 반경 내에서 다시 시도해 주세요.');
          return;
        }
      } else if (method === 'nfc') {
        const ok = await ensureNFCAvailable();
        if (!ok) {return;}
        AppToast.show('NFC 스캔은 상세 화면에서 진행돼요.');
        return;
      }

      const resp = await attendanceService.checkIn({
        employeeId: employeeIdNum,
        workplaceId,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      setCurrentAttendance(resp);
      await loadRecentRecords();
      AppToast.success(method === 'location' ? '위치 기반 출근이 기록됐어요.' : '출근이 기록됐어요.');
    } catch (e) {
      AppToast.error('출근 처리에 실패했어요. 다시 시도해 주세요.');
    } finally {
      if (isMountedRef.current) {setLoading(false);}
    }
  }, [method, workplaceId, employeeIdNum, ensureLocation, ensureNFCAvailable, loadRecentRecords]);

  const checkOut = useCallback(async () => {
    if (!currentAttendance) {
      AppToast.warn('현재 출근 상태가 아니에요.');
      return;
    }
    if (!Number.isFinite(employeeIdNum)) {
      AppToast.warn('로그인이 필요해요.');
      return;
    }
    try {
      setLoading(true);
      const loc = await ensureLocation();
      if (!loc) {
        AppToast.warn('위치 권한이 필요해요.');
        return;
      }
      if (method === 'location') {
        const verify = await attendanceService.verifyLocationAttendance(String(employeeIdNum), workplaceId, loc.latitude, loc.longitude);
        if (!verify.success) {
          AppToast.warn(verify.message ?? '위치 인증에 실패했어요. 매장 반경 내에서 다시 시도해 주세요.');
          return;
        }
      } else if (method === 'nfc') {
        const ok = await ensureNFCAvailable();
        if (!ok) {return;}
        AppToast.show('NFC 스캔은 상세 화면에서 진행돼요.');
        return;
      }

      await attendanceService.checkOut(currentAttendance.id, {
        employeeId: employeeIdNum,
        workplaceId,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      setCurrentAttendance(null);
      await loadRecentRecords();
      AppToast.success(method === 'location' ? '위치 기반 퇴근이 기록됐어요.' : '퇴근이 기록됐어요.');
    } catch (e) {
      AppToast.error('퇴근 처리에 실패했어요. 다시 시도해 주세요.');
    } finally {
      if (isMountedRef.current) {setLoading(false);}
    }
  }, [method, currentAttendance, workplaceId, employeeIdNum, ensureLocation, ensureNFCAvailable, loadRecentRecords]);

  return {
    method,
    setMethod,
    workplaceId, // 훅이 해석한 실제 매장 id(prop 미전달 시 getEmployeeStores 첫 매장)
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
