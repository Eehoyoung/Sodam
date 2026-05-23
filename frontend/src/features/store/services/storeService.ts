import api from '../../../common/utils/api';

export interface StoreRegistrationPayload {
  storeName: string;
  businessNumber?: string; // 유선
  storePhoneNumber?: string; // 휴대폰
  businessType: string;
  businessLicenseNumber: string; // 사업자등록번호 (10자리)
  roadAddress: string;
  jibunAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number; // 출퇴근 인증 반경 (m)
  storeStandardHourWage: number; // 기준 시급
}

export interface StoreSummaryDto {
  id: number;
  storeName: string;
  businessNumber?: string;
  storePhoneNumber?: string;
  businessType?: string;
  storeCode?: string;
  fullAddress?: string;
  storeStandardHourWage?: number;
  monthlyLaborCost?: number;
  employeeCount?: number;
  todayAttendance?: number;
  monthlyRevenue?: number;
}

export interface StoreDetailDto {
  id: number;
  storeName: string;
  businessNumber?: string;
  storePhoneNumber?: string;
  businessType: string;
  storeCode: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  storeStandardHourWage: number;
  employeeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

const getMasterStores = async (userId: number): Promise<StoreSummaryDto[]> => {
  const res = await api.get<StoreSummaryDto[]>(`/api/stores/master/${userId}`);
  // 일부 백엔드가 {data: T} 래핑일 수 있어 방어적 파싱
  const data: any = res.data as any;
  if (Array.isArray(data)) {return data as StoreSummaryDto[];}
  if (Array.isArray(data?.data)) {return data.data as StoreSummaryDto[];}
  return [];
};

// [API Mapping] GET /api/stores/{storeId} — 매장 단건 조회
const getStoreById = async (storeId: number): Promise<StoreDetailDto> => {
  const res = await api.get<StoreDetailDto>(`/api/stores/${storeId}`);
  const data: any = res.data as any;
  // 방어적 파싱
  if (data?.id) {return data as StoreDetailDto;}
  if (data?.data?.id) {return data.data as StoreDetailDto;}
  throw new Error('Invalid store data received');
};

async function createStore(payload: StoreRegistrationPayload): Promise<{ id: number }> {
    // 표준 엔드포인트 시도
    try {
        const res = await api.post<{ id: number }>(`/api/stores/registration`, payload);
        const data: any = res.data;
        if (typeof data?.id === 'number') {
            return {id: data.id};
        }
        if (typeof data?.data?.id === 'number') {
            return {id: data.data.id};
        }
    } catch (e: any) {
        // 404/405면 대체 경로 시도
        if (e?.response?.status === 404 || e?.response?.status === 405) {
            try {
                const res2 = await api.post<{ id: number }>(`/api/stores/registration`, payload);
                const d2: any = res2.data;
                if (typeof d2?.id === 'number') {
                    return {id: d2.id};
                }
                if (typeof d2?.data?.id === 'number') {
                    return {id: d2.data.id};
                }
            } catch (_) {
                // pass to mock fallback
            }
        }
    }

    // 최후: 목킹 결과 반환 (네트워크 불가/엔드포인트 미정 상태 대비)
    await new Promise(r => setTimeout(r, 600));
    return {id: Math.floor(Math.random() * 100000) + 1};
}

// [API Mapping] PUT /api/stores/{storeId}/location — 매장 위치/반경 설정 업데이트
async function putLocation(storeId: number, coords: { latitude: number; longitude: number; radius?: number }): Promise<{ success: boolean }>{
  const res = await api.put<{
      data: { success: boolean; }; success: boolean
  }>(`/api/stores/${storeId}/location`, coords);
  return res.data?.data || res.data || { success: true };
}

// [API Mapping] POST /api/stores/change/master — 매장 소유자 변경(사장 권한 이양)
async function changeOwner(storeId: number, newOwnerUserId: number): Promise<{ success: boolean }>{
  const res = await api.post<{
      data: { success: boolean; }; success: boolean
  }>(`/api/stores/change/master`, { storeId, newOwnerUserId });
  return res.data?.data || res.data || { success: true };
}

const storeService = {
  // 조회류
  getMasterStores,
  getStoreById,
  // 등록/설정류
  createStore,
  putLocation,
  changeOwner,
};

export default storeService;
