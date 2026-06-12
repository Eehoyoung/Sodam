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
export interface EmployeeWageResponse {
  employeeId: number;
  storeId: number;
  /** BE customHourlyWage. 매장 기본 시급 사용 시 null/undefined */
  customHourlyWage?: number;
  /** true 면 customHourlyWage 무시하고 매장 기준 시급 사용 */
  useStoreStandardWage?: boolean;
  /** 호환용 alias: useStoreStandardWage 면 storeStandardHourWage, 아니면 customHourlyWage */
  hourlyWage?: number;
  updatedAt?: string;
}
export interface UpsertEmployeeWagePayload {
  employeeId: number;
  storeId: number;
  /** 직원별 시급(원). null/undefined 이고 useStoreStandardWage 가 true 면 매장 기본 시급 사용 */
  hourlyWage?: number;
  useStoreStandardWage?: boolean;
}

async function putStandardHourlyWage(storeId: number, hourlyWage: number): Promise<StandardWageResponse> {
  // API: PUT /api/wages/store/{storeId}/standard (query param standardHourlyWage)
  const res = await api.put<StandardWageResponse>(`/api/wages/store/${storeId}/standard`, undefined, {
    params: { standardHourlyWage: hourlyWage },
  });
  return (res.data as any)?.data || res.data || { success: true, storeId, standardHourlyWage: hourlyWage };
}

async function getEmployeeWage(employeeId: number, storeId: number): Promise<EmployeeWageResponse> {
  // API: GET /api/wages/employee/{employeeId}/store/{storeId}
  const res = await api.get<any>(`/api/wages/employee/${employeeId}/store/${storeId}`);
  const raw = (res.data)?.data || res.data || {};
  return normalizeEmployeeWageResponse(raw, employeeId, storeId);
}

async function upsertEmployeeWage(payload: UpsertEmployeeWagePayload): Promise<EmployeeWageResponse> {
  // API: POST /api/wages/employee — BE EmployeeWageUpdateDto 키 정합
  const useStoreStd = payload.useStoreStandardWage ?? !payload.hourlyWage;
  const body = {
    employeeId: payload.employeeId,
    storeId: payload.storeId,
    customHourlyWage: useStoreStd ? null : Math.round(payload.hourlyWage ?? 0),
    useStoreStandardWage: useStoreStd,
  };
  const res = await api.post<any>(`/api/wages/employee`, body);
  const raw = (res.data)?.data || res.data || {};
  return normalizeEmployeeWageResponse(raw, payload.employeeId, payload.storeId);
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
    updatedAt: raw.updatedAt,
  };
}

export const wageService = {
  putStandardHourlyWage,
  getEmployeeWage,
  upsertEmployeeWage,
};

export default wageService;
