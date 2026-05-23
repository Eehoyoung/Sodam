import {api} from '../../../common/utils/api';

export interface LocationVerifyRequest {
    employeeId: number;
    storeId: number;
    latitude: number;
    longitude: number;
}

export interface LocationVerifyResponse {
    success: boolean;
    distance?: number; // 매장과의 거리 (미터)
    message?: string;
    timestamp?: string;
}

/**
 * 위치 기반 출근 인증 API
 * @param request 위치 인증 요청 데이터
 * @returns 인증 결과
 */
export const verifyCheckInByLocation = async (
    request: LocationVerifyRequest
): Promise<LocationVerifyResponse> => {
    try {
        const response = await api.post<any>(
            '/api/attendance/verify/location',
            request
        );
        const raw = response.data;
        const data = raw?.data ?? raw; // ApiResponse 래핑/비래핑 모두 허용
        return {
            success: !!data?.success,
            distance: data?.distance,
            message: data?.message ?? data?.reason,
            timestamp: data?.timestamp,
        };
    } catch (error) {
        console.error('위치 기반 출근 인증 실패:', error);
        return {
            success: false,
            message: '위치 기반 출근 인증에 실패했습니다. 다시 시도해주세요.'
        };
    }
};

/**
 * 위치 기반 퇴근 인증 API
 * @param request 위치 인증 요청 데이터
 * @returns 인증 결과
 */
export const verifyCheckOutByLocation = async (
    request: LocationVerifyRequest
): Promise<LocationVerifyResponse> => {
    try {
        // 출근과 동일한 엔드포인트를 사용하지만, 퇴근 플래그 추가
        const response = await api.post<any>(
            '/api/attendance/verify/location',
            {
                ...request,
                isCheckOut: true
            }
        );
        const raw = response.data;
        const data = raw?.data ?? raw; // ApiResponse 래핑/비래핑 모두 허용
        return {
            success: !!data?.success,
            distance: data?.distance,
            message: data?.message ?? data?.reason,
            timestamp: data?.timestamp,
        };
    } catch (error) {
        console.error('위치 기반 퇴근 인증 실패:', error);
        return {
            success: false,
            message: '위치 기반 퇴근 인증에 실패했습니다. 다시 시도해주세요.'
        };
    }
};

/**
 * 두 지점 간의 거리를 계산하는 함수 (Haversine 공식)
 * @param lat1 첫 번째 지점의 위도
 * @param lon1 첫 번째 지점의 경도
 * @param lat2 두 번째 지점의 위도
 * @param lon2 두 번째 지점의 경도
 * @returns 두 지점 간의 거리 (미터)
 */
export const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // 미터 단위 거리

    return d;
};

/**
 * 사용자가 매장 반경 내에 있는지 확인하는 함수
 * @param userLat 사용자 위치 위도
 * @param userLon 사용자 위치 경도
 * @param storeLat 매장 위치 위도
 * @param storeLon 매장 위치 경도
 * @param radius 허용 반경 (미터)
 * @returns 반경 내 위치 여부 및 거리 정보
 */
export const isWithinRadius = (
    userLat: number,
    userLon: number,
    storeLat: number,
    storeLon: number,
    radius: number
): { isWithin: boolean; distance: number } => {
    const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
    return {
        isWithin: distance <= radius,
        distance
    };
};
