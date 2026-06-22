import api from '../../../common/utils/api';

/** 급여 미리보기(D0 aha). BE: GET /api/stores/{storeId}/payroll-preview */
export interface PayrollPreview {
  hourlyWage: number;
  weeklyHours: number;
  weeklyBasic: number;
  weeklyAllowance: number;
  monthlyBasic: number;
  monthlyAllowance: number;
  monthlyGross: number;
  weeklyAllowanceEligible: boolean;
  disclaimer: string;
}

export async function fetchPayrollPreview(
  storeId: number,
  hourlyWage: number,
  weeklyHours: number,
): Promise<PayrollPreview> {
  const {data} = await api.get<PayrollPreview>(
    `/api/stores/${storeId}/payroll-preview`,
    {params: {hourlyWage, weeklyHours}},
  );
  return data;
}
