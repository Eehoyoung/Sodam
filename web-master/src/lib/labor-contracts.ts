import { apiFetch } from "./api";
import { API_BASE_URL } from "./env";

export type LaborContractPayType = "HOURLY" | "SALARY";

export interface LaborContract {
  id: number;
  employeeId: number;
  storeId: number;
  startDate: string;
  endDate: string | null;
  hourlyWage: number | null;
  payType: LaborContractPayType;
  monthlyBaseSalary: number | null;
  expectedMonthlyWage: number | null;
  sent: boolean;
  sentAt: string | null;
  signed: boolean;
  signedAt: string | null;
  minimumWageCompliant: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 특정 직원의 근로계약서 목록 — GET /api/stores/{storeId}/employees/{employeeId}/labor-contracts.
 * 매장 전체 목록 API가 없어(사장 본인은 CONTRACT_MANAGE 게이트 없이 무조건 접근 가능,
 * DelegatedActionAuthorityService.require()가 매장주는 즉시 통과시킴) 직원별로 조회해 화면에서 합친다.
 */
export function fetchLaborContractsForEmployee(storeId: number, employeeId: number): Promise<LaborContract[]> {
  return apiFetch<LaborContract[]>(`/api/stores/${storeId}/employees/${employeeId}/labor-contracts`);
}

/** 임시저장 계약서 발송(전자서명 요청) — POST /api/stores/{storeId}/labor-contracts/{id}/send. */
export function sendLaborContract(storeId: number, contractId: number): Promise<{ envelopeId: number }> {
  return apiFetch(`/api/stores/${storeId}/labor-contracts/${contractId}/send`, { method: "POST" });
}

/**
 * 근로계약서 PDF 다운로드 — GET /api/stores/{storeId}/labor-contracts/{id}/pdf.
 * apiFetch는 JSON 전용이라 payroll.ts의 downloadPayrollPdf와 동일하게 직접 fetch로 blob을 받는다.
 */
export async function downloadLaborContractPdf(storeId: number, contractId: number, fileName: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/stores/${storeId}/labor-contracts/${contractId}/pdf`, {
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
