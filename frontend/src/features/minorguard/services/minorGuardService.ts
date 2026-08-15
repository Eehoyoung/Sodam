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
  /** WP-5: 서류함(기존 document 도메인) 등록 여부 체크리스트 — 원본 내용은 확인하지 않음. */
  guardianConsentOnFile: boolean;
  familyRelationCertOnFile: boolean;
  /** 취직인허증(§64) 보유 체크리스트 — 요건 충족 여부는 앱이 판정하지 않는다(G-17). */
  workPermitOnFile: boolean;
  /** 만 14세 미만 + 친권자 동의서 미확인 — 법정대리인 동의 전 개인정보 처리 자제 경고. */
  personalDataProcessingBlocked: boolean;
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
