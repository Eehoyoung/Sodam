import api from '../../../common/utils/api';

/**
 * 세무사 송부 (인건비 내역서). BE: /api/stores/{storeId}/tax-reports
 * 확정·지급완료 급여만 포함 — 발송 전 급여 확정 필요.
 */
export interface TaxReportSendLog {
  id: number;
  periodStart: string;
  periodEnd: string;
  recipientEmail: string;
  payrollCount: number;
  totalGrossWage: number;
  status: 'SENT' | 'FAILED';
  failReason?: string;
  sentAt: string;
}

export async function fetchTaxReportHistory(storeId: number): Promise<TaxReportSendLog[]> {
  const {data} = await api.get<TaxReportSendLog[]>(`/api/stores/${storeId}/tax-reports/history`);
  return data;
}

/**
 * 인건비 내역서(PDF+CSV)를 매장에 등록된 세무사 이메일로 발송.
 * 같은 기간 재발송은 409(TAX_REPORT_ALREADY_SENT) — force=true 로 재호출.
 */
export async function sendTaxReport(
  storeId: number,
  from: string,
  to: string,
  force = false,
): Promise<TaxReportSendLog> {
  const {data} = await api.post<TaxReportSendLog>(
    `/api/stores/${storeId}/tax-reports/send`,
    undefined,
    {params: {from, to, force}},
  );
  return data;
}

/** 세무사 이메일 등록/수정 (빈 값이면 해제). */
export async function updateAccountantEmail(storeId: number, email: string): Promise<void> {
  await api.put(`/api/stores/${storeId}/tax-reports/accountant-email`, {email: email || null});
}
