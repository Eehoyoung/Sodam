import api from '../../../common/utils/api';

/**
 * 근무 증거 패키지(L-NEW-05). 사장 전용.
 * BE: GET /api/stores/{storeId}/employees/{employeeId}/evidence?from=&to=
 *
 * 임금체불 진정 대비 셀프 증거 묶음 — 근태·급여·계약·시급이력 통합 집계.
 * 주민번호 등 PII 미포함(이름·내부ID까지만).
 */
export interface EvidenceAttendanceSummary {
  workedDays: number;
  recordCount: number;
  totalWorkedMinutes: number;
  totalWorkedHours: number;
}

export interface EvidencePayrollSummary {
  payslipCount: number;
  totalGrossWage: number;
  totalNetWage: number;
  totalDeduction: number;
}

export interface EvidenceContractSummary {
  hasContract: boolean;
  hourlyWage: number | null;
  contractedHoursPerWeek: number | null;
  weeklyHolidayDay: string | null;
  startDate: string | null;
  endDate: string | null;
  signed: boolean;
}

export interface EvidenceWageHistoryLine {
  scope: 'STORE_DEFAULT' | 'EMPLOYEE_OVERRIDE';
  hourlyWage: number;
  effectiveFrom: string;
  reason: string | null;
}

export interface EvidencePackage {
  storeId: number;
  employeeId: number;
  employeeName: string;
  from: string;
  to: string;
  attendance: EvidenceAttendanceSummary;
  payroll: EvidencePayrollSummary;
  contract: EvidenceContractSummary;
  wageHistory: EvidenceWageHistoryLine[];
  disclaimer: string;
}

/** ISO date(YYYY-MM-DD) 문자열로 변환. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function fetchEvidencePackage(
  storeId: number,
  employeeId: number,
  from: string,
  to: string,
): Promise<EvidencePackage> {
  const {data} = await api.get<EvidencePackage>(
    `/api/stores/${storeId}/employees/${employeeId}/evidence`,
    {params: {from, to}},
  );
  return data;
}
