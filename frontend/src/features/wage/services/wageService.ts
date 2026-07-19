import api from '../../../common/utils/api';

// [API Mapping] Wage endpoints standardization per Phase 1 (2025-10-02)
// - PUT /api/wages/store/{storeId}/standard?standardHourlyWage=<number>
// - GET /api/wages/employee/{employeeId}/store/{storeId}
// - POST /api/wages/employee (body upsert)
//
// 경계 변환: FE 는 hourlyWage 한 필드로 다루지만 BE EmployeeWageUpdateDto 는
// customHourlyWage(Integer) + useStoreStandardWage(Boolean) 두 필드 명시 요구.
// (직원별 시급 = customHourlyWage 양수, 매장 기본 시급 사용 = useStoreStandardWage=true)
// 응답도 BE EmployeeWageInfoDto 의 customHourlyWage/useStoreStandardWage 를 그대로 노출하고
// hourlyWage 는 호환용 alias 로 채워준다.

export interface StandardWageResponse { success?: boolean; storeId?: number; standardHourlyWage?: number }

/** BE EmploymentType — HOURLY 시급제 / MONTHLY_SALARY 월급제 */
export type EmploymentType = 'HOURLY' | 'MONTHLY_SALARY';

export interface EmployeeWageResponse {
  employeeId: number;
  storeId: number;
  /** BE customHourlyWage. 매장 기본 시급 사용 시 null/undefined */
  customHourlyWage?: number;
  /** true 면 customHourlyWage 무시하고 매장 기준 시급 사용 */
  useStoreStandardWage?: boolean;
  /** 호환용 alias: useStoreStandardWage 면 storeStandardHourWage, 아니면 customHourlyWage */
  hourlyWage?: number;
  /** 고용형태. 미설정(구 데이터)이면 undefined → 시급제로 취급 */
  employmentType?: EmploymentType;
  /** 월급(원, 세전) — 월급제 전용 */
  monthlySalary?: number;
  /** 개인별 4대보험 — null 이면 매장 정책 따름 */
  socialInsuranceEnrolled?: boolean | null;
  updatedAt?: string;
}
export interface UpsertEmployeeWagePayload {
  employeeId: number;
  storeId: number;
  /** 직원별 시급(원). null/undefined 이고 useStoreStandardWage 가 true 면 매장 기본 시급 사용 */
  hourlyWage?: number;
  useStoreStandardWage?: boolean;
  /**
   * 고용형태. undefined 면 BE 규칙상 고용형태 관련 필드 "변경 없음"(기존 시급-only 호출 호환).
   * 값이 있으면 monthlySalary·socialInsuranceEnrolled 를 함께 일괄 적용한다.
   */
  employmentType?: EmploymentType;
  /** 월급(원, 세전). employmentType=MONTHLY_SALARY 일 때 필수(없으면 BE 400) */
  monthlySalary?: number;
  /** null=매장 정책 따름, true=4대보험, false=3.3% 원천징수 */
  socialInsuranceEnrolled?: boolean | null;
}

export interface EmploymentAmendmentPayload {
  employeeId: number;
  effectiveDate: string;
  employmentType: EmploymentType;
  hourlyWage?: number;
  monthlySalary?: number;
  contractedWeeklyHours?: number;
  contractedWeeklyDays?: number;
}

export interface EmploymentAmendment {
  id: number;
  status: 'DRAFT' | 'SIGNING' | 'VERIFIED' | 'APPLIED' | 'CANCELLED';
  effectiveDate: string;
  electronicSignatureEnvelopeId: number | null;
}

/** BE EmployeeWageInfoDto (GET /api/payroll/employee/{id}/wages 응답 원소) */
export interface EmployeeStoreWageInfo {
  employeeId: number;
  employeeName?: string;
  storeId: number;
  storeName?: string;
  storeStandardHourlyWage?: number;
  customHourlyWage?: number | null;
  useStoreStandardWage?: boolean;
  appliedHourlyWage?: number;
  employmentType?: EmploymentType | null;
  monthlySalary?: number | null;
  socialInsuranceEnrolled?: boolean | null;
}

async function putStandardHourlyWage(storeId: number, hourlyWage: number): Promise<StandardWageResponse> {
  // API: PUT /api/wages/store/{storeId}/standard (query param standardHourlyWage)
  const res = await api.put<StandardWageResponse>(`/api/wages/store/${storeId}/standard`, undefined, {
    params: { standardHourlyWage: hourlyWage },
  });
  return (res.data as any)?.data || res.data || { success: true, storeId, standardHourlyWage: hourlyWage };
}

export interface WageHistoryEntry {
  effectiveFrom?: string;
  reason?: string;
  hourlyWage?: number;
}

// [API Mapping] GET /api/wages/store/{storeId}/history — 매장 기본 시급 변경 이력
async function getStandardWageHistory(storeId: number): Promise<WageHistoryEntry[]> {
  const res = await api.get<WageHistoryEntry[]>(`/api/wages/store/${storeId}/history`);
  const data: any = res.data as any;
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
}

async function getEmployeeWage(employeeId: number, storeId: number): Promise<EmployeeWageResponse> {
  // API: GET /api/wages/employee/{employeeId}/store/{storeId}
  const res = await api.get<any>(`/api/wages/employee/${employeeId}/store/${storeId}`);
  const raw = (res.data)?.data || res.data || {};
  return normalizeEmployeeWageResponse(raw, employeeId, storeId);
}

async function upsertEmployeeWage(payload: UpsertEmployeeWagePayload): Promise<EmployeeWageResponse> {
  // API: POST /api/wages/employee — BE EmployeeWageUpdateDto 키 정합
  const isMonthly = payload.employmentType === 'MONTHLY_SALARY';
  // 월급제는 시급 필드가 무의미 — 매장 기본 시급 상태로 유지(HOURLY 복귀 시 기본값)
  const useStoreStd = isMonthly || (payload.useStoreStandardWage ?? !payload.hourlyWage);
  const body: Record<string, unknown> = {
    employeeId: payload.employeeId,
    storeId: payload.storeId,
    customHourlyWage: useStoreStd ? null : Math.round(payload.hourlyWage ?? 0),
    useStoreStandardWage: useStoreStd,
  };
  // BE 하위호환 규칙: employmentType 이 없으면 고용형태 관련 3필드는 "변경 없음"으로 취급.
  // 형태를 지정할 때만 월급·보험을 함께 실어 보낸다(부분 전송 시 의도치 않은 리셋 방지).
  if (payload.employmentType) {
    body.employmentType = payload.employmentType;
    body.monthlySalary = isMonthly ? Math.round(payload.monthlySalary ?? 0) : null;
    body.socialInsuranceEnrolled = payload.socialInsuranceEnrolled ?? null;
  }
  const res = await api.post<any>(`/api/wages/employee`, body);
  const raw = (res.data)?.data || res.data || {};
  return normalizeEmployeeWageResponse(raw, payload.employeeId, payload.storeId);
}

async function getEmployeeWageInfo(employeeId: number, storeId: number): Promise<EmployeeStoreWageInfo | null> {
  // API: GET /api/payroll/employee/{employeeId}/wages — 소속 전 매장 EmployeeWageInfoDto 목록.
  // 고용형태·월급·4대보험은 이 DTO 에만 노출된다(/api/wages/... GET 은 숫자만 반환).
  const res = await api.get<any>(`/api/payroll/employee/${employeeId}/wages`);
  const raw = (res.data)?.data || res.data || [];
  const list: EmployeeStoreWageInfo[] = Array.isArray(raw) ? raw : [];
  return list.find(info => Number(info.storeId) === Number(storeId)) ?? null;
}

async function createEmploymentAmendment(
  storeId: number,
  payload: EmploymentAmendmentPayload,
): Promise<EmploymentAmendment> {
  const res = await api.post<EmploymentAmendment>(
    `/api/stores/${storeId}/employment-amendments`,
    payload,
  );
  return res.data;
}

async function sendEmploymentAmendment(storeId: number, amendmentId: number): Promise<{envelopeId: number}> {
  const res = await api.post<{envelopeId: number}>(
    `/api/stores/${storeId}/employment-amendments/${amendmentId}/send`,
  );
  return res.data;
}

async function cancelEmploymentAmendment(storeId: number, amendmentId: number): Promise<void> {
  await api.delete(`/api/stores/${storeId}/employment-amendments/${amendmentId}`);
}

/**
 * 월급제 급여 표기: 만원 단위로 떨어지면 "월 220만원", 아니면 "월 2,205,000원".
 */
function formatMonthlyPay(monthlySalary: number): string {
  if (monthlySalary % 10000 === 0) {
    return `월 ${(monthlySalary / 10000).toLocaleString('ko-KR')}만원`;
  }
  return `월 ${monthlySalary.toLocaleString('ko-KR')}원`;
}

function normalizeEmployeeWageResponse(raw: any, employeeId: number, storeId: number): EmployeeWageResponse {
  const customHourlyWage = raw.customHourlyWage ?? undefined;
  const useStoreStandardWage = raw.useStoreStandardWage ?? !customHourlyWage;
  const effective =
    useStoreStandardWage
      ? (raw.storeStandardHourWage ?? raw.standardHourlyWage ?? undefined)
      : customHourlyWage;
  return {
    employeeId: raw.employeeId ?? employeeId,
    storeId: raw.storeId ?? storeId,
    customHourlyWage,
    useStoreStandardWage,
    hourlyWage: effective,
    employmentType: raw.employmentType ?? undefined,
    monthlySalary: raw.monthlySalary ?? undefined,
    // null(매장 정책)과 부재를 구분할 필요가 없어 부재 시 undefined 유지(기존 응답 계약 보존)
    socialInsuranceEnrolled: raw.socialInsuranceEnrolled ?? undefined,
    updatedAt: raw.updatedAt,
  };
}

export const wageService = {
  putStandardHourlyWage,
  getStandardWageHistory,
  getEmployeeWage,
  getEmployeeWageInfo,
  upsertEmployeeWage,
  createEmploymentAmendment,
  sendEmploymentAmendment,
  cancelEmploymentAmendment,
  formatMonthlyPay,
};

export default wageService;
