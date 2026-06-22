import api from '../../../common/utils/api';

/** 두루누리·고용지원금 자격(B7). BE: GET /api/stores/{storeId}/subsidy/eligibility */
export interface SubsidyCandidate {
  employeeId: number;
  employeeName: string;
  monthlyWageEstimate?: number | null;
  eligible: boolean;
}

export interface SubsidyEligibility {
  storeId: number;
  employeeCount: number;
  storeUnder10: boolean;
  eligibleCount: number;
  candidates: SubsidyCandidate[];
  guidance: string;
  disclaimer: string;
}

export async function fetchSubsidyEligibility(storeId: number): Promise<SubsidyEligibility> {
  const {data} = await api.get<SubsidyEligibility>(`/api/stores/${storeId}/subsidy/eligibility`);
  return data;
}
