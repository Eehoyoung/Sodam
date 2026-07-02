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

// BE PayrollDto(필요 필드만). GET /api/payroll/employee/{employeeId} 가 List<PayrollDto> 반환.
interface EmployeePayrollDto {
  id: number;
  employeeName?: string;
  startDate?: string;
  endDate?: string;
  netWage?: number;
  status?: string;
}

export interface ArchiveItem {
  payrollId: number;
  period: string;
  employeeName: string;
  netPay: number;
  issued: boolean;
}

// 지난 급여명세(A12 보관함). 본인 employeeId 급여 목록을 연도로 필터해 ArchiveItem 으로 매핑.
// (BE from/to 파라미터명 불일치 회피 위해 전체 조회 후 클라이언트에서 연도 필터.)
async function listArchive(employeeId: number, year: number): Promise<ArchiveItem[]> {
  const res = await api.get<EmployeePayrollDto[]>(`/api/payroll/employee/${employeeId}`);
  const rows: EmployeePayrollDto[] = (res.data as any)?.data ?? res.data ?? [];
  return rows
    .filter(p => (p.startDate ? new Date(p.startDate).getFullYear() === year : true))
    .map(p => ({
      payrollId: p.id,
      period: p.startDate ? p.startDate.slice(0, 7) : '-',
      employeeName: p.employeeName ?? '',
      netPay: p.netWage ?? 0,
      issued: p.status === 'PAID' || p.status === 'CONFIRMED',
    }));
}

export const payrollService = {
  calculate,
  getMonthly,
  getDetails,
  updateStatus,
  listByEmployee,
  listByStore,
  listArchive,
};

export default payrollService;
