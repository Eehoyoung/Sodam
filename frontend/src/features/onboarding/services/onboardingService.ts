import api from '../../../common/api/client';

/** 직원 온보딩 체크리스트(M-NEW-05/E-NEW-08). */
export interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
}

export interface Onboarding {
  employeeId: number;
  storeId: number;
  steps: OnboardingStep[];
  completedCount: number;
  total: number;
  nextStepKey?: string | null;
  nextStepLabel?: string | null;
}

/** storeId+employeeId 가 있으면 사장 조회, 없으면 직원 본인(/my, 소속 매장 자동 해석). */
export async function fetchOnboarding(storeId?: number, employeeId?: number): Promise<Onboarding> {
  if (storeId !== undefined && employeeId !== undefined) {
    const {data} = await api.get<Onboarding>(
      `/api/stores/${storeId}/employees/${employeeId}/onboarding`,
    );
    return data;
  }
  const {data} = await api.get<Onboarding>('/api/onboarding/my');
  return data;
}
