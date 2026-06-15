import api from '../../../common/utils/api';

// [API Mapping] Payroll endpoints per Phase 1 (2025-10-02)
// - POST /api/payroll/calculate
// - GET /api/payroll/employee/{employeeId}/store/{storeId}/monthly?year&month
// - GET /api/payroll/{payrollId}/details
// - PUT /api/payroll/{payrollId}/status (body: { status })
// - GET /api/payroll/employee/{employeeId}?from&to
// - GET /api/payroll/store/{storeId}?from&to

// BE PayrollCalculationRequestDto 와 매핑되는 키 (startDate/endDate). employeeId 는 선택 — 미지정 시 매장 전체 일괄 계산
export interface PayrollCalculatePayload { employeeId?: number; storeId: number; startDate: string; endDate: string; recalculate?: boolean }
export interface PayrollSummary { payrollId?: number; employeeId: number; storeId: number; totalHours?: number; totalPay?: number; period?: { startDate: string; endDate: string } }
export interface PayrollDetails extends PayrollSummary { items?: Array<{ date: string; hours: number; pay: number }> }

async function calculate(payload: PayrollCalculatePayload): Promise<PayrollSummary> {
  const res = await api.post<PayrollSummary>('/api/payroll/calculate', payload);
  return (res.data as any)?.data || res.data;
}

async function getMonthly(employeeId: number, storeId: number, year: number, month: number): Promise<PayrollSummary[]> {
  const res = await api.get<PayrollSummary[]>(`/api/payroll/employee/${employeeId}/store/${storeId}/monthly`, { year, month });
  return (res.data as any)?.data || res.data;
}

async function getDetails(payrollId: number): Promise<PayrollDetails> {
  const res = await api.get<PayrollDetails>(`/api/payroll/${payrollId}/details`);
  return (res.data as any)?.data || res.data;
}

// BE PayrollStatus enum 과 정합: DRAFT/CONFIRMED/PAID/CANCELLED. (구 'PENDING' 은 BE 에 없어 400 유발 — 제거)
export type PayrollStatusValue = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
async function updateStatus(payrollId: number, status: PayrollStatusValue): Promise<{ success: boolean }>{
  const res = await api.put<{ success: boolean }>(`/api/payroll/${payrollId}/status`, { status });
  return (res.data as any)?.data || res.data || { success: true };
}

async function listByEmployee(employeeId: number, startDate?: string, endDate?: string): Promise<PayrollSummary[]> {
  const res = await api.get<PayrollSummary[]>(`/api/payroll/employee/${employeeId}`, { startDate, endDate });
  return (res.data as any)?.data || res.data;
}

async function listByStore(storeId: number, startDate?: string, endDate?: string): Promise<PayrollSummary[]> {
  const res = await api.get<PayrollSummary[]>(`/api/payroll/store/${storeId}`, { startDate, endDate });
  return (res.data as any)?.data || res.data;
}

export const payrollService = {
  calculate,
  getMonthly,
  getDetails,
  updateStatus,
  listByEmployee,
  listByStore,
};

export default payrollService;
