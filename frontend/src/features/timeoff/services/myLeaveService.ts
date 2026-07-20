import api from '../../../common/api/client';
import type {TimeOffCreatePayload, TimeOffResponse} from '../types';

/**
 * 직원 본인 잔여 연차 (E-NEW-03).
 * BE: GET /api/timeoff/my/leave-balance → MyLeaveBalanceDto.
 *
 * 발생(추정·출근율 100% 가정) − 승인된 휴가 사용일수 = 잔여. 참고용 추정치(면책 노출).
 */

export interface MyLeaveBalance {
  /** 발생 연차일수(추정) */
  entitledDays: number;
  /** 승인된 휴가 사용일수 */
  usedDays: number;
  /** 잔여 연차일수 */
  remainingDays: number;
  /** 5인 이상 사업장 여부(연차 적용 대상) */
  fiveOrMoreApplicable: boolean;
  /** 면책 문구(참고용 추정 안내) */
  disclaimer: string;
}

async function getMyLeaveBalance(): Promise<MyLeaveBalance> {
  const res = await api.get<MyLeaveBalance>('/api/timeoff/my/leave-balance');
  const raw = (res.data as {data?: MyLeaveBalance})?.data ?? res.data;
  return {
    entitledDays: raw?.entitledDays ?? 0,
    usedDays: raw?.usedDays ?? 0,
    remainingDays: raw?.remainingDays ?? 0,
    fiveOrMoreApplicable: raw?.fiveOrMoreApplicable ?? false,
    disclaimer: raw?.disclaimer ?? '참고용 추정이에요. 실제와 다를 수 있어요.',
  };
}

/**
 * 직원 본인 휴가 셀프 신청.
 * BE: POST /api/timeoff/self → TimeOffResponse (leaveType/unit 생략 시 ANNUAL/FULL_DAY).
 */
async function createTimeOffRequest(payload: TimeOffCreatePayload): Promise<TimeOffResponse> {
  const res = await api.post<TimeOffResponse>('/api/timeoff/self', payload);
  return res.data;
}

export const myLeaveService = {getMyLeaveBalance, createTimeOffRequest};

export default myLeaveService;
