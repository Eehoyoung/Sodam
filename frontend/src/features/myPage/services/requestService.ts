import api from '../../../common/api/client';

/** 내 요청 현황(정정·휴가 통합). BE: GET /api/requests/my */
export type MyRequestType = 'correction' | 'timeoff';
export type MyRequestStatus = 'pending' | 'approved' | 'rejected';

export interface MyRequest {
  type: MyRequestType;
  id: number;
  title: string;
  date: string;
  status: MyRequestStatus;
  reason?: string | null;
  rejectReason?: string | null;
}

export async function fetchMyRequests(): Promise<MyRequest[]> {
  const {data} = await api.get<MyRequest[]>('/api/requests/my');
  return data;
}
