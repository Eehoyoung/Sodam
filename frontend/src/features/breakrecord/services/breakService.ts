import api from '../../../common/api/client';

/**
 * 휴게 부여 증빙(L-NEW-04, 근로기준법 §54).
 * BE: /api/stores/{storeId}/employees/{employeeId}/breaks
 *
 * 휴게는 임금 공제가 아니라 부여 의무. 실제 줬다는 기록을 남겨 임금체불 진정에 대비한다.
 * 임금계산과 독립된 증빙 전용.
 */
export interface BreakRecord {
  id: number;
  employeeId: number;
  storeId: number;
  workDate: string;
  breakMinutes: number;
  grantedConfirmed: boolean;
  memo?: string | null;
  createdAt: string;
}

export interface BreakRecordCreateBody {
  workDate: string;
  breakMinutes: number;
  grantedConfirmed: boolean;
  memo?: string;
}

const base = (storeId: number, employeeId: number) =>
  `/api/stores/${storeId}/employees/${employeeId}/breaks`;

export async function fetchBreaks(storeId: number, employeeId: number): Promise<BreakRecord[]> {
  const {data} = await api.get<BreakRecord[]>(base(storeId, employeeId));
  return data;
}

export async function addBreak(
  storeId: number,
  employeeId: number,
  body: BreakRecordCreateBody,
): Promise<BreakRecord> {
  const {data} = await api.post<BreakRecord>(base(storeId, employeeId), body);
  return data;
}

export async function deleteBreak(
  storeId: number,
  employeeId: number,
  id: number,
): Promise<void> {
  await api.delete(`${base(storeId, employeeId)}/${id}`);
}
