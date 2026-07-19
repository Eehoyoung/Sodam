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
  query?: string;
  roadAddress: string;
  jibunAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  operatingHours: StoreOperatingHourPayload[];
  radius?: number; // 출퇴근 인증 반경 (m)
  storeStandardHourWage: number; // 기준 시급
  payrollCycle?: PayrollCyclePayload; // 급여 정산 주기(선택)
}

export type PayrollMonthOffset = 'PREV_MONTH' | 'CURRENT_MONTH' | 'NEXT_MONTH';

/** 급여 정산 주기 — BE PayrollCycleDto 와 정합. day 는 정수(1~31), 말일이면 day=null + lastDay=true.
 *  offset 의 허용값(시작=전월/당월, 마감·지급=당월/익월)은 BE 가 검증한다. */
export interface PayrollCyclePayload {
  startOffset: PayrollMonthOffset;
  startDay: number;
  endOffset: PayrollMonthOffset;
  endDay: number | null;
  endLastDay: boolean;
  payOffset: PayrollMonthOffset;
  payDay: number | null;
  payDayLastDay: boolean;
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
  taxAccountantEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  /** PayrollCycleEditor.fromStorePayrollCycle()에 그대로 전달되는 BE 정산주기 원형(any 허용). */
  payrollCycle?: unknown;
}

/** 정산주기 해석 결과 — 미설정 매장은 configured=false, 날짜 null. */
export interface PayrollCyclePeriodDto {
  configured: boolean;
  startDate: string | null;
  endDate: string | null;
  paymentDate: string | null;
}

// [API Mapping] GET /api/stores/{storeId}/payroll-cycle/period — 정산주기를 실제 날짜로 해석
const getPayrollCyclePeriod = async (storeId: number): Promise<PayrollCyclePeriodDto> => {
  const res = await api.get<PayrollCyclePeriodDto>(`/api/stores/${storeId}/payroll-cycle/period`);
  return res.data;
};

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

export interface DayOperatingHours {
  dayOfWeek: DayOfWeek;
  openTime?: string | null; // HH:mm:ss
  closeTime?: string | null;
  isClosed: boolean;
}

/** 매장 운영시간 조회(요일별). 실패는 호출자가 best-effort 처리. */
const getStoreOperatingHours = async (storeId: number): Promise<DayOperatingHours[]> => {
  const res = await api.get<{ operatingHours?: DayOperatingHours[] }>(
    `/api/stores/${storeId}/operating-hours`,
  );
  const data: any = res.data as any;
  const list: any[] = Array.isArray(data?.operatingHours)
    ? data.operatingHours
    : Array.isArray(data?.data?.operatingHours)
    ? data.data.operatingHours
    : [];
  return list.map(d => ({
    dayOfWeek: d.dayOfWeek,
    openTime: d.openTime ?? null,
    closeTime: d.closeTime ?? null,
    isClosed: d.isClosed ?? false,
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
// ⚠️ WP-00 계약 기준선에서 확인됨: BE StoreController.java에 이 엔드포인트가 블록 주석으로
// 비활성화되어 있어 항상 404다(docs/260718/WP-00_완료_보고.md §2-3). 호출부 없음 — 제품 판단 대기.
async function changeOwner(storeId: number, newOwnerUserId: number): Promise<{ success: boolean }>{
  const res = await api.post<{
      data: { success: boolean; }; success: boolean
  }>(`/api/stores/change/master`, { storeId, newOwnerUserId });
  return res.data?.data || res.data || { success: true };
}

// [API Mapping] PUT /api/stores/{storeId} — 매장 기본정보 수정(이름/주소/전화 등)
async function updateStore(storeId: number, payload: Record<string, unknown>): Promise<StoreDetailDto> {
  const res = await api.put<StoreDetailDto>(`/api/stores/${storeId}`, payload);
  const data: any = res.data as any;
  return (data?.id ? data : data?.data) as StoreDetailDto;
}

// [API Mapping] PUT /api/stores/{storeId}/operating-hours — 요일별 운영시간 일괄 수정
async function updateStoreOperatingHours(
  storeId: number,
  operatingHours: StoreOperatingHourPayload[],
): Promise<void> {
  await api.put(`/api/stores/${storeId}/operating-hours`, {operatingHours});
}

// [API Mapping] POST /api/stores/join-by-code — 초대 코드로 매장 입사
export interface JoinStoreResult {
  id: number;
  storeName: string;
}
async function joinByCode(storeCode: string): Promise<JoinStoreResult> {
  const res = await api.post<JoinStoreResult>('/api/stores/join-by-code', {storeCode});
  const data: any = res.data as any;
  return (data?.id !== undefined ? data : data?.data) as JoinStoreResult;
}

const storeService = {
  // 조회류
  getMasterStores,
  getStoreById,
  getStoreEmployees,
  getEmployeeStores,
  getStoreOperatingHours,
  getPayrollCyclePeriod,
  // 등록/설정류
  createStore,
  putLocation,
  changeOwner,
  updateStore,
  updateStoreOperatingHours,
  joinByCode,
};

export default storeService;
