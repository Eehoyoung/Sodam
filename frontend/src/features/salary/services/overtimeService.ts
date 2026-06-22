import api from '../../../common/utils/api';

/**
 * 연장근로 한도(주 52h, §53) 경보 (B5/L-NEW-02).
 * BE: GET /api/stores/{storeId}/overtime-check?year=&month=
 *
 * 소담은 연장수당 금액은 계산하면서 주 52시간(소정40+연장12) 한도 위반은 막아주지 못했다.
 * 위반 시 형사처벌(§110)이라, 명세서 발급 전 사장에게 위반 주를 경보한다. 추정·노무사 검토 전.
 */
export interface OvertimeViolation {
  employeeId: number;
  employeeName: string;
  /** 해당 주 시작일(월요일, YYYY-MM-DD) */
  weekStart: string;
  /** 그 주 실근로시간 합계 */
  weeklyHours: number;
  /** 52시간 초과분 */
  overBy: number;
}

export interface OvertimeCheck {
  storeId: number;
  from: string;
  to: string;
  violations: OvertimeViolation[];
  hasViolation: boolean;
  disclaimer: string;
}

export async function fetchOvertimeCheck(
  storeId: number,
  year: number,
  month: number,
): Promise<OvertimeCheck> {
  const {data} = await api.get<OvertimeCheck>(
    `/api/stores/${storeId}/overtime-check`,
    {params: {year, month}},
  );
  return data;
}
