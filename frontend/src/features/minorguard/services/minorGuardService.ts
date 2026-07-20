import api from '../../../common/api/client';

/**
 * 연소근로자(만 18세 미만) 가드 (L-NEW-01).
 * BE: GET /api/stores/{storeId}/employees/{employeeId}/minor-guard
 *
 * 친권자 동의서 등 PII 원본은 저장하지 않고, 필요 플래그·안내만 받는다.
 */
export interface MinorGuard {
  employeeId: number;
  minor: boolean;
  age: number | null;
  dailyHourLimit: number;
  weeklyHourLimit: number;
  nightWorkRestricted: boolean;
  consentRequired: boolean;
  guidance: string;
  disclaimer: string;
}

export async function fetchMinorGuard(
  storeId: number,
  employeeId: number,
): Promise<MinorGuard> {
  const {data} = await api.get<MinorGuard>(
    `/api/stores/${storeId}/employees/${employeeId}/minor-guard`,
  );
  return data;
}
