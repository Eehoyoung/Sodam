import api from '../../../common/api/client';

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
  weeklyOvertimeHours?: number;
  weeklyOvertimeWage?: number;
  weeklyAllowanceHours?: number;
  weeklyAllowance?: number;
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
  weeklyOvertimeHours?: number;
  weeklyOvertimeWage?: number;
  weeklyAllowanceHours?: number;
  weeklyAllowance?: number;
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
    weeklyOvertimeHours: dto.weeklyOvertimeHours ?? 0,
    weeklyOvertimeWage: dto.weeklyOvertimeWage ?? 0,
    weeklyAllowanceHours: dto.weeklyAllowanceHours ?? 0,
    weeklyAllowance: dto.weeklyAllowance ?? 0,
    totalPay: dto.netWage,
    status: dto.status,
    period: dto.startDate && dto.endDate ? {startDate: dto.startDate, endDate: dto.endDate} : undefined,
  };
}

// BE 급여 계산 응답(직원별 명세 항목) — POST /api/payroll/calculate 는 storeId만 넘기면
// 매장 전체 직원 배열을, employeeId까지 넘기면 해당 직원 단건을 배열로 감싸 반환한다.
export interface PayrollCalculationItem {
  payrollId: number;
  employeeId: number;
  employeeName: string;
  regularHours: number;
  regularWage: number;
  overtimeHours: number;
  overtimeWage: number;
  nightWorkHours: number;
  nightWorkWage: number;
  weeklyAllowance: number;
  /** 주 40시간 초과 연장근로 시간 수(§56①). 시행령 §27조의2 상 명세서에 시간 수를 함께 적어야 한다. */
  weeklyOvertimeHours: number;
  /** 위 시간의 가산분(50%). 기본 100%는 정상근로 임금에 이미 포함돼 있다. */
  weeklyOvertimeWage: number;
  bonusWage: number;
  grossWage: number;
  taxAmount: number;
  netWage: number;
}

/** 계산이 중단된 직원. 매장 일괄 계산에서만 채워진다. */
/**
 * 퇴사자인데 정산기간에 근무기록이 있어 수동 최종정산이 필요하다는 신호(BE `PayrollStoreBatchService`).
 * 계산 오류가 아니라 의도적 보류라 화면에서 문구를 달리 낸다 — RELEASE_GATES T-13.
 */
export const RESIGNED_NEEDS_MANUAL_SETTLEMENT = 'PAYROLL_RESIGNED_NEEDS_MANUAL_SETTLEMENT';

export interface PayrollCalculationFailure {
  employeeId: number;
  employeeName: string;
  errorCode: string;
  message: string;
}

export interface PayrollCalculationResult {
  items: PayrollCalculationItem[];
  /** 비어 있지 않으면 일부 직원의 정산이 중단된 것 — 반드시 화면에 노출해야 한다. */
  failed: PayrollCalculationFailure[];
}

// WP-04(계획서): PayrollRunScreen.tsx가 직접 api.post 하던 것을 이관 — BE 응답의 중첩
// employee.id/employee.user.name 형태를 화면이 쓰는 평탄한 형태로 매핑한다.
async function calculate(payload: PayrollCalculatePayload): Promise<PayrollCalculationResult> {
  const res = await api.post<any>('/api/payroll/calculate', payload);
  const data = res.data;
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  const failed: PayrollCalculationFailure[] = Array.isArray(data?.failed)
    ? data.failed.map((f: any) => ({
        employeeId: f.employeeId,
        employeeName: f.employeeName ?? '직원',
        errorCode: f.errorCode ?? 'UNKNOWN',
        message: f.message ?? '급여를 계산하지 못했어요.',
      }))
    : [];
  const items = list.map(d => ({
    payrollId: d.id,
    employeeId: d.employee?.id ?? d.employeeId,
    employeeName: d.employee?.user?.name ?? d.employeeName ?? '직원',
    regularHours: d.regularHours ?? 0,
    regularWage: d.regularWage ?? 0,
    overtimeHours: d.overtimeHours ?? 0,
    overtimeWage: d.overtimeWage ?? 0,
    nightWorkHours: d.nightWorkHours ?? 0,
    nightWorkWage: d.nightWorkWage ?? 0,
    weeklyAllowance: d.weeklyAllowance ?? 0,
    weeklyOvertimeHours: d.weeklyOvertimeHours ?? 0,
    weeklyOvertimeWage: d.weeklyOvertimeWage ?? 0,
    bonusWage: d.bonusWage ?? 0,
    grossWage: d.grossWage ?? 0,
    taxAmount: d.taxAmount ?? 0,
    netWage: d.netWage ?? 0,
  }));
  return {items, failed};
}

// [API Mapping] PUT /api/payroll/{payrollId}/issue — 확정→지급완료 원자 처리(스텝업 비밀번호 필요)
// 가감조정(adjustment)은 세후 가산이며 반드시 함께 전송해야 한다 — 안 보내면 화면에 표시한
// 총액과 서버가 확정하는 실수령액이 갈린다(C-3).
async function issue(
  payrollId: number,
  stepUpPassword: string,
  adjustment?: number,
  adjustmentReason?: string,
): Promise<void> {
  const body: Record<string, unknown> = {stepUpPassword};
  if (adjustment) {
    body.adjustment = adjustment;
    body.adjustmentReason = adjustmentReason;
  }
  await api.put(`/api/payroll/${payrollId}/issue`, body);
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
  issue,
  getMonthly,
  getById,
  getDetails,
  updateStatus,
  listByEmployee,
  listByStore,
  listArchive,
};

export default payrollService;
