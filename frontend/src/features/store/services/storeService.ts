import api from '../../../common/utils/api';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface StoreOperatingHourPayload {
  dayOfWeek: DayOfWeek;
  openTime: string | null; // HH:mm:ss
  closeTime: string | null; // HH:mm:ss
  isClosed: boolean;
}

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
  operatingHours: StoreOperatingHourPayload[];
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

// [API Mapping] GET /api/stores/{storeId}/employees — 매장 소속 직원 명부 (BOLA: 자기 매장만)
export interface StoreEmployeeDto {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  userGrade?: string;
}

// [API Mapping] GET /api/stores/employee/{userId} — 직원이 소속된 매장 목록 (BOLA: 본인만)
const getEmployeeStores = async (userId: number): Promise<StoreSummaryDto[]> => {
  const res = await api.get<StoreSummaryDto[]>(`/api/stores/employee/${userId}`);
  const data: any = res.data as any;
  if (Array.isArray(data)) {return data as StoreSummaryDto[];}
  if (Array.isArray(data?.data)) {return data.data as StoreSummaryDto[];}
  return [];
};

const getStoreEmployees = async (storeId: number): Promise<StoreEmployeeDto[]> => {
  const res = await api.get<StoreEmployeeDto[]>(`/api/stores/${storeId}/employees`);
  const data: any = res.data as any;
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return list.map(u => ({
    id: u.id,
    name: u.name ?? '직원',
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    userGrade: u.userGrade ?? undefined,
  }));
};

async function createStore(payload: StoreRegistrationPayload): Promise<{ id: number }> {
    // ⚠️ FE↔BE 의미 정합 (P2 통합테스트로 발견·수정): BE `Store.businessNumber` 컬럼은
    //   '사업자등록번호'(NOT NULL·UNIQUE) 이나, FE 폼의 `businessNumber` 는 화면상 '매장 유선전화'.
    //   여기서 BE 계약에 맞춰 매핑을 정정한다 (FE 화면 라벨/상태는 그대로 두어 UX 보존).
    //   - BE `businessNumber`      ← FE `businessLicenseNumber` (사업자번호)
    //   - BE `storePhoneNumber`    ← FE `storePhoneNumber || businessNumber(유선)` (휴대폰 우선, 없으면 유선)
    //   - BE `businessLicenseNumber` 는 그대로 — MasterProfile 별도 저장에 사용됨
    const bePayload = {
        ...payload,
        businessNumber: payload.businessLicenseNumber,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- blank phone should fall back to businessNumber then '', so ?? would be wrong
        storePhoneNumber: payload.storePhoneNumber || payload.businessNumber || '',
    };
    // 실패(402 플랜게이트·400·409·5xx)는 반드시 호출자에게 전파한다.
    // 과거엔 에러를 삼키고 가짜 id를 반환해 "매장이 등록됐어요"라는 거짓 성공을 띄웠고,
    // 그 탓에 플랜 업그레이드(402 PLAN_REQUIRED) 유도가 통째로 묻혔다.
    const res = await api.post<{ id: number }>(`/api/stores/registration`, bePayload);
    const data: any = res.data;
    if (typeof data?.id === 'number') {
        return {id: data.id};
    }
    if (typeof data?.data?.id === 'number') {
        return {id: data.data.id};
    }
    throw new Error('Invalid store registration response: missing id');
}

// [API Mapping] PUT /api/stores/{storeId}/location — 매장 위치/반경 설정 업데이트
// BE LocationUpdateDto: { radius, fullAddress, latitude, longitude }
async function putLocation(
  storeId: number,
  payload: { latitude?: number; longitude?: number; radius?: number; fullAddress?: string },
): Promise<{ success: boolean }>{
  const res = await api.put<{
      data: { success: boolean; }; success: boolean
  }>(`/api/stores/${storeId}/location`, payload);
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
  getStoreEmployees,
  getEmployeeStores,
  // 등록/설정류
  createStore,
  putLocation,
  changeOwner,
};

export default storeService;
