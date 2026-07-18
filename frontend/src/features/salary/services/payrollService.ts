import api from '../../../common/utils/api';

// [API Mapping] Payroll endpoints per Phase 1 (2025-10-02)
// - POST /api/payroll/calculate
// - GET /api/payroll/employee/{employeeId}/store/{storeId}/monthly?year&month
// - GET /api/payroll/{payrollId}            (단건 요약 — 실수령액/기간/상태. 2026-07-14 신설)
// - GET /api/payroll/{payrollId}/details     (근무일별 배열)
// - PUT /api/payroll/{payrollId}/status (body: { status })
// - GET /api/payroll/employee/{employeeId}?from&to
// - GET /api/payroll/store/{storeId}?from&to

// BE PayrollCalculationRequestDto 와 매핑되는 키 (startDate/endDate). employeeId 는 선택 — 미지정 시 매장 전체 일괄 계산
export interface PayrollCalculatePayload { employeeId?: number; storeId: number; startDate: string; endDate: string; recalculate?: boolean }

// BE PayrollDto (backend/.../dto/response/PayrollDto.java) — id/netWage/평평한 startDate·endDate 를 가진 원본 응답 형태.
// GET /api/payroll/{id}, /api/payroll/store/{storeId}, /api/payroll/employee/{employeeId}, POST /api/payroll/calculate 가 이 형태(또는 배열)로 응답한다.
interface RawPayrollDto {
  id: number;
  employeeId: number;
  employeeName?: string;
  storeId: number;
  storeName?: string;
  startDate?: string;
  endDate?: string;
  totalHours?: number;
  netWage?: number;
  status?: string;
}

// FE 화면에서 쓰는 정규화된 형태 — payrollId/totalPay/중첩 period 로 통일.
// (BE 원본은 RawPayrollDto — 서비스 레이어에서 반드시 toSummary() 로 변환해서 내보낼 것)
export interface PayrollSummary {
  payrollId: number;
  employeeId: number;
  employeeName?: string;
  storeId: number;
  storeName?: string;
  totalHours?: number;
  totalPay?: number;
  status?: string;
  period?: { startDate: string; endDate: string };
}

// BE PayrollDetailDto (근무일 1건) — GET /api/payroll/{payrollId}/details 배열 원소.
export interface PayrollDetailItem {
  id?: number;
  payrollId?: number;
  workDate: string;
  startTime?: string;
  endTime?: string;
  workDuration?: string;
  regularHours?: number;
  overtimeHours?: number;
  nightWorkHours?: number;
  totalHours?: number;
  baseHourlyWage?: number;
  regularWage?: number;
  overtimeWage?: number;
  nightWorkWage?: number;
  dailyWage?: number;
  note?: string;
}

function toSummary(dto: RawPayrollDto): PayrollSummary {
  return {
    payrollId: dto.id ?? 0,
    employeeId: dto.employeeId,
    employeeName: dto.employeeName,
    storeId: dto.storeId,
    storeName: dto.storeName,
    totalHours: dto.totalHours,
    totalPay: dto.netWage,
    status: dto.status,
    period: dto.startDate && dto.endDate ? {startDate: dto.startDate, endDate: dto.endDate} : undefined,
  };
}

// [범위 밖] calculate/getMonthly 는 이번 스키마 버그(§1-1/§1-2) 대상이 아니고 실제 화면에서도 미사용
// (PayrollRunScreen 은 api.post 를 직접 호출) — 기존 pass-through 동작과 테스트 계약을 그대로 유지한다.
async function calculate(payload: PayrollCalculatePayload): Promise<PayrollSummary> {
  const res = await api.post<PayrollSummary>('/api/payroll/calculate', payload);
  return (res.data as any)?.data || res.data;
}

async function getMonthly(employeeId: number, storeId: number, year: number, month: number): Promise<PayrollSummary[]> {
  const res = await api.get<PayrollSummary[]>(`/api/payroll/employee/${employeeId}/store/${storeId}/monthly`, { year, month });
  return (res.data as any)?.data || res.data;
}

// 급여 단건 요약 조회 — GET /api/payroll/{payrollId}. SalaryDetailScreen 헤더(실수령액/기간/상태) 공급용.
async function getById(payrollId: number): Promise<PayrollSummary> {
  const res = await api.get<RawPayrollDto>(`/api/payroll/${payrollId}`);
  const dto = ((res.data as any)?.data || res.data) as RawPayrollDto;
  return toSummary(dto);
}

// 급여 상세(근무일별) 조회 — GET /api/payroll/{payrollId}/details 는 배열을 반환한다(요약 객체 아님).
async function getDetails(payrollId: number): Promise<PayrollDetailItem[]> {
  const res = await api.get<PayrollDetailItem[]>(`/api/payroll/${payrollId}/details`);
  const list = ((res.data as any)?.data || res.data) as PayrollDetailItem[];
  return Array.isArray(list) ? list : [];
}

// BE PayrollStatus enum 과 정합: DRAFT/CONFIRMED/PAID/CANCELLED. (구 'PENDING' 은 BE 에 없어 400 유발 — 제거)
export type PayrollStatusValue = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
async function updateStatus(payrollId: number, status: PayrollStatusValue, stepUpPassword?: string): Promise<{ success: boolean }>{
  const body = stepUpPassword ? {status, stepUpPassword} : {status};
  const res = await api.put<{ success: boolean }>(`/api/payroll/${payrollId}/status`, body);
  return (res.data as any)?.data || res.data || { success: true };
}

// BE List<PayrollDto> 응답(id/netWage/평평한 startDate·endDate) → FE PayrollSummary(payrollId/totalPay/nested period) 로 정규화.
async function listByEmployee(employeeId: number, startDate?: string, endDate?: string): Promise<PayrollSummary[]> {
  const res = await api.get<RawPayrollDto[]>(`/api/payroll/employee/${employeeId}`, { startDate, endDate });
  const list = ((res.data as any)?.data || res.data) as RawPayrollDto[];
  return Array.isArray(list) ? list.map(toSummary) : [];
}

async function listByStore(storeId: number, startDate?: string, endDate?: string): Promise<PayrollSummary[]> {
  const res = await api.get<RawPayrollDto[]>(`/api/payroll/store/${storeId}`, { startDate, endDate });
  const list = ((res.data as any)?.data || res.data) as RawPayrollDto[];
  return Array.isArray(list) ? list.map(toSummary) : [];
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
  getById,
  getDetails,
  updateStatus,
  listByEmployee,
  listByStore,
  listArchive,
};

export default payrollService;
