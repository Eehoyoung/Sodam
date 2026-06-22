import api from '../../../common/utils/api';

/** 간이지급명세서 자료(A2). BE: GET /api/stores/{storeId}/tax/withholding-statement */
export interface WithholdingLine {
  employeeId: number;
  employeeName: string;
  paidTotal: number;
  withheldTotal: number;
}

export interface WithholdingStatement {
  storeId: number;
  year: number;
  employeeCount: number;
  totalPaid: number;
  totalWithheld: number;
  items: WithholdingLine[];
  disclaimer: string;
}

export async function fetchWithholdingStatement(
  storeId: number,
  year: number,
): Promise<WithholdingStatement> {
  const {data} = await api.get<WithholdingStatement>(
    `/api/stores/${storeId}/tax/withholding-statement`,
    {params: {year}},
  );
  return data;
}
