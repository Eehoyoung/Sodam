import api from '../../../common/api/client';

/**
 * 원천세 월 신고 요약 + 부가세 분기 기한 (B6/T-NEW-04·06).
 * BE: GET /api/stores/{storeId}/tax/withholding-monthly, /vat-deadline
 */
export interface WithholdingMonthly {
  storeId: number;
  year: number;
  month: number;
  totalWithheld: number;
  /** ISO date (yyyy-MM-dd) — 신고·납부 기한(익월 10일) */
  dueDate: string;
  daysUntilDue: number;
  disclaimer: string;
}

export interface VatDeadline {
  storeId: number;
  quarter: string;
  /** ISO date (yyyy-MM-dd) — 부가세 분기 신고기한 */
  dueDate: string;
  daysUntilDue: number;
  guidance: string;
  disclaimer: string;
}

export async function fetchWithholdingMonthly(
  storeId: number,
  year: number,
  month: number,
): Promise<WithholdingMonthly> {
  const {data} = await api.get<WithholdingMonthly>(
    `/api/stores/${storeId}/tax/withholding-monthly`,
    {year, month},
  );
  return data;
}

export async function fetchVatDeadline(storeId: number): Promise<VatDeadline> {
  const {data} = await api.get<VatDeadline>(
    `/api/stores/${storeId}/tax/vat-deadline`,
  );
  return data;
}
