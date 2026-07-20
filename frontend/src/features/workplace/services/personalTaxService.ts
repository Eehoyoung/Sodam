import api from '../../../common/api/client';

/** 긱워커 연간 사업소득·환급(B3). BE: GET /api/personal-users/{userId}/annual-tax-summary (ApiResponse 래핑) */
export interface WorkplaceIncome {
  workplaceId: number;
  workplaceName: string;
  income: number;
  withheld: number;
}

export interface PersonalAnnualTax {
  year: number;
  totalIncome: number;
  withheldEstimate: number;
  refundPossible: boolean;
  perWorkplace: WorkplaceIncome[];
  guidance: string;
  disclaimer: string;
}

export async function fetchPersonalAnnualTax(userId: number, year: number): Promise<PersonalAnnualTax> {
  const res = await api.get(`/api/personal-users/${userId}/annual-tax-summary`, {year});
  // 개인모드 엔드포인트는 ApiResponse{success,message,data} 로 감싼다
  const body = res.data as {data?: PersonalAnnualTax} & PersonalAnnualTax;
  return body.data ?? body;
}
