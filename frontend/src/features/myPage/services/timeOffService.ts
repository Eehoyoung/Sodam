import api from '../../../common/api/client';
import type {TimeOffResponse} from '../../timeoff/types';

/**
 * 사장 연차/휴가 승인 API (TimeOffApprovalScreen).
 *
 * BE: MasterController — 전부 principal.getId() 기준 본인 소유 매장의 신청만 조회/처리하고,
 * approve/reject 는 StoreAccessGuard.assertMasterOwnsTimeOff 로 BOLA 를 차단한다.
 * 거부는 사유(reason)가 없으면 400 — §60⑤ 시기변경권이 유일한 법적 거부 근거라 입력을 강제한다.
 *
 * 재작성 사유: 이 파일의 기존 구현은 아무 화면에서도 import 되지 않는 죽은 코드였고,
 * 경로(`/api/timeoff/{id}/approve` 등 옛 계약)·응답 타입(엔티티 그대로)이 현재 BE 계약과
 * 전혀 맞지 않아 폐기하고 `/api/master/timeoff/*` 계약에 맞춰 새로 작성했다.
 */

async function fetchPendingTimeOffs(): Promise<TimeOffResponse[]> {
  const res = await api.get<TimeOffResponse[]>('/api/master/timeoff/pending');
  return Array.isArray(res.data) ? res.data : [];
}

async function approveTimeOff(timeOffId: number): Promise<TimeOffResponse> {
  const res = await api.put<TimeOffResponse>(`/api/master/timeoff/${timeOffId}/approve`, {});
  return res.data;
}

async function rejectTimeOff(timeOffId: number, reason: string): Promise<TimeOffResponse> {
  // 거부 사유는 본문(JSON)으로 보낸다 — 개인정보를 담을 수 있어 쿼리스트링·서버 로그 노출을 피한다.
  const res = await api.put<TimeOffResponse>(`/api/master/timeoff/${timeOffId}/reject`, {reason});
  return res.data;
}

async function fetchStorePendingTimeOffs(storeId: number): Promise<TimeOffResponse[]> {
  const res = await api.get<TimeOffResponse[]>(`/api/timeoff/store/${storeId}/status/PENDING`);
  return Array.isArray(res.data) ? res.data : [];
}

async function approveStoreTimeOff(timeOffId: number): Promise<TimeOffResponse> {
  const res = await api.put<TimeOffResponse>(`/api/timeoff/${timeOffId}/approve`, {});
  return res.data;
}

async function rejectStoreTimeOff(timeOffId: number, reason: string): Promise<TimeOffResponse> {
  const res = await api.put<TimeOffResponse>(`/api/timeoff/${timeOffId}/reject`, {reason});
  return res.data;
}

const timeOffService = {
  fetchPendingTimeOffs,
  approveTimeOff,
  rejectTimeOff,
  fetchStorePendingTimeOffs,
  approveStoreTimeOff,
  rejectStoreTimeOff,
};

export default timeOffService;
export {
  fetchPendingTimeOffs,
  approveTimeOff,
  rejectTimeOff,
  fetchStorePendingTimeOffs,
  approveStoreTimeOff,
  rejectStoreTimeOff,
};
