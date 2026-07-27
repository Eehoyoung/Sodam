import { apiFetch } from "./api";
import { API_BASE_URL } from "./env";

export type PayrollStatus = "DRAFT" | "CONFIRMED" | "PAID" | "CANCELLED";
export type TaxPolicyType = "INCOME_TAX_3_3" | "FOUR_INSURANCES";
export type BonusPaymentTiming = "IMMEDIATE_CASH" | "INCLUDED_IN_PAYROLL";

export interface PayrollRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  storeId: number;
  storeName: string;
  startDate: string;
  endDate: string;
  regularHours: number;
  overtimeHours: number;
  nightWorkHours: number;
  totalHours: number;
  baseHourlyWage: number;
  regularWage: number;
  overtimeWage: number;
  nightWorkWage: number;
  weeklyAllowance: number;
  bonusWage: number;
  grossWage: number;
  taxRate: number;
  taxAmount: number;
  deductions: number;
  netWage: number;
  status: PayrollStatus;
  paymentDate: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollPolicy {
  id: number;
  storeId: number;
  storeName: string;
  taxPolicyType: TaxPolicyType;
  nightWorkRate: number;
  nightWorkStartTime: string;
  overtimeRate: number;
  regularHoursPerDay: number;
  weeklyAllowanceEnabled: boolean;
}

export interface PayrollPolicyUpdate {
  taxPolicyType: TaxPolicyType;
  nightWorkRate: number;
  nightWorkStartTime: string;
  overtimeRate: number;
  regularHoursPerDay: number;
  weeklyAllowanceEnabled: boolean;
}

export interface PayrollBonus {
  id: number;
  employeeId: number;
  storeId: number;
  bonusDate: string;
  amount: number;
  reason: string | null;
  paymentTiming: BonusPaymentTiming;
  consumed: boolean;
  includedInPayrollId: number | null;
  createdAt: string;
}

/** 매장 급여 내역 조회 — GET /api/payroll/store/{storeId}?from&to. */
export function fetchStorePayrolls(storeId: number, from?: string, to?: string): Promise<PayrollRecord[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiFetch<PayrollRecord[]>(`/api/payroll/store/${storeId}${qs ? `?${qs}` : ""}`);
}

/**
 * 급여 정산(매장 일괄 계산 모드) — POST /api/payroll/calculate, employeeId 생략 시 매장 전체.
 * 정산 마법사 2단계(계산확인)에서 사용 — 이미 계산된 적 있는 기간이면 기존 DRAFT 레코드를 반환한다.
 */
export function calculateStorePayroll(
  storeId: number,
  startDate: string,
  endDate: string,
  recalculate = false,
): Promise<PayrollRecord[]> {
  return apiFetch<PayrollRecord[]>("/api/payroll/calculate", {
    method: "POST",
    body: JSON.stringify({ storeId, startDate, endDate, recalculate }),
  });
}

/** 급여 발급(확정→지급완료 원자처리) — PUT /api/payroll/{payrollId}/issue. step-up 비밀번호 필요. */
export function issuePayroll(payrollId: number, stepUpPassword: string): Promise<PayrollRecord> {
  return apiFetch<PayrollRecord>(`/api/payroll/${payrollId}/issue`, {
    method: "PUT",
    body: JSON.stringify({ stepUpPassword }),
  });
}

export interface PayrollWizardConfirmResult {
  storeId: number;
  issuedCount: number;
  issued: PayrollRecord[];
}

/**
 * 급여 정산 마법사 3단계(확정) — POST /api/web/payroll/wizard/confirm. 여러 직원의 급여를
 * 백엔드 단일 트랜잭션으로 한 번에 확정한다(하나라도 실패하면 전체 롤백). Idempotency-Key 헤더
 * 필수 — 네트워크 재시도로 같은 확정 요청이 중복 전송돼도 안전하다(05_동시성제어_및_고급아키텍처.md §3).
 */
export function confirmPayrollWizard(
  storeId: number,
  payrollIds: number[],
  stepUpPassword: string,
  idempotencyKey: string,
): Promise<PayrollWizardConfirmResult> {
  return apiFetch<PayrollWizardConfirmResult>("/api/web/payroll/wizard/confirm", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ storeId, payrollIds, stepUpPassword }),
  });
}

/** 급여 정책 조회 — GET /api/payroll-policy/store/{storeId}. */
export function fetchPayrollPolicy(storeId: number): Promise<PayrollPolicy> {
  return apiFetch<PayrollPolicy>(`/api/payroll-policy/store/${storeId}`);
}

/** 급여 정책 수정 — POST /api/payroll-policy/store/{storeId}. */
export function updatePayrollPolicy(storeId: number, update: PayrollPolicyUpdate): Promise<PayrollPolicy> {
  return apiFetch<PayrollPolicy>(`/api/payroll-policy/store/${storeId}`, {
    method: "POST",
    body: JSON.stringify(update),
  });
}

/** 직원 보너스 이력 — GET /api/stores/{storeId}/employees/{employeeId}/bonuses. */
export function fetchEmployeeBonuses(storeId: number, employeeId: number): Promise<PayrollBonus[]> {
  return apiFetch<PayrollBonus[]>(`/api/stores/${storeId}/employees/${employeeId}/bonuses`);
}

export interface BonusCreateInput {
  employeeId: number;
  bonusDate: string;
  amount: number;
  reason?: string;
  paymentTiming: BonusPaymentTiming;
}

/** 보너스 등록 — POST /api/stores/{storeId}/bonuses. */
export function createBonus(storeId: number, input: BonusCreateInput): Promise<PayrollBonus> {
  return apiFetch<PayrollBonus>(`/api/stores/${storeId}/bonuses`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * 급여명세서 PDF 다운로드 — GET /api/payroll/{payrollId}/pdf.
 * apiFetch 는 JSON 전용이라 여기선 직접 fetch 로 blob 을 받아 브라우저 다운로드를 트리거한다.
 */
export async function downloadPayrollPdf(payrollId: number, fileName: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/payroll/${payrollId}/pdf`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`PDF 다운로드에 실패했어요 (${res.status})`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
