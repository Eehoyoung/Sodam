import api from '../../../common/utils/api';

// [API Mapping] Wage endpoints standardization per Phase 1 (2025-10-02)
// - PUT /api/wages/store/{storeId}/standard?standardHourlyWage=<number>
// - GET /api/wages/employee/{employeeId}/store/{storeId}
// - POST /api/wages/employee (body upsert)

export interface StandardWageResponse { success?: boolean; storeId?: number; standardHourlyWage?: number }
export interface EmployeeWageResponse { employeeId: number; storeId: number; hourlyWage: number; updatedAt?: string }
export interface UpsertEmployeeWagePayload { employeeId: number; storeId: number; hourlyWage: number }

async function putStandardHourlyWage(storeId: number, hourlyWage: number): Promise<StandardWageResponse> {
  // API: PUT /api/wages/store/{storeId}/standard (query param standardHourlyWage)
  const res = await api.put<StandardWageResponse>(`/api/wages/store/${storeId}/standard`, undefined, {
    params: { standardHourlyWage: hourlyWage },
  });
  return (res.data as any)?.data || res.data || { success: true, storeId, standardHourlyWage: hourlyWage };
}

async function getEmployeeWage(employeeId: number, storeId: number): Promise<EmployeeWageResponse> {
  // API: GET /api/wages/employee/{employeeId}/store/{storeId}
  const res = await api.get<EmployeeWageResponse>(`/api/wages/employee/${employeeId}/store/${storeId}`);
  return (res.data as any)?.data || res.data;
}

async function upsertEmployeeWage(payload: UpsertEmployeeWagePayload): Promise<EmployeeWageResponse> {
  // API: POST /api/wages/employee
  const res = await api.post<EmployeeWageResponse>(`/api/wages/employee`, payload);
  return (res.data as any)?.data || res.data;
}

export const wageService = {
  putStandardHourlyWage,
  getEmployeeWage,
  upsertEmployeeWage,
};

export default wageService;
