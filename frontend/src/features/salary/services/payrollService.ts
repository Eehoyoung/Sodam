import api from '../../../common/utils/api';

// [API Mapping] Payroll endpoints per Phase 1 (2025-10-02)
// - POST /api/payroll/calculate
// - GET /api/payroll/employee/{employeeId}/store/{storeId}/monthly?year&month
// - GET /api/payroll/{payrollId}/details
// - PUT /api/payroll/{payrollId}/status (body: { status })
// - GET /api/payroll/employee/{employeeId}?from&to
// - GET /api/payroll/store/{storeId}?from&to

export interface PayrollCalculatePayload { employeeId: number; storeId: number; from: string; to: string }
export interface PayrollSummary { payrollId?: number; employeeId: number; storeId: number; totalHours?: number; totalPay?: number; period?: { from: string; to: string } }
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

async function updateStatus(payrollId: number, status: 'PENDING' | 'PAID' | 'CANCELLED'): Promise<{ success: boolean }>{
  const res = await api.put<{ success: boolean }>(`/api/payroll/${payrollId}/status`, { status });
  return (res.data as any)?.data || res.data || { success: true };
}

async function listByEmployee(employeeId: number, from?: string, to?: string): Promise<PayrollSummary[]> {
  const res = await api.get<PayrollSummary[]>(`/api/payroll/employee/${employeeId}`, { from, to });
  return (res.data as any)?.data || res.data;
}

async function listByStore(storeId: number, from?: string, to?: string): Promise<PayrollSummary[]> {
  const res = await api.get<PayrollSummary[]>(`/api/payroll/store/${storeId}`, { from, to });
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
