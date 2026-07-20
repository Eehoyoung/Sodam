import api from '../../../common/api/client';

// [API Mapping] Master (사장) MyPage APIs — Phase 2 minimal integration

export interface MasterProfile { id: number; name?: string; phone?: string }
export interface StoreStats { storeId: number; employees?: number; todayAttendance?: number; monthPayroll?: number }
export interface OverallStats { stores?: number; employees?: number; monthPayroll?: number }

// BE 응답은 {data: T} 래퍼이거나 곧바로 T — 둘 다 허용해 언래핑.
interface ApiEnvelope<T> { data?: T }

async function unwrap<T>(promise: Promise<{ data: unknown }>): Promise<T> {
  const res = await promise;
  const body = res.data as ApiEnvelope<T> | T;
  const inner = (body as ApiEnvelope<T>)?.data;
  return (inner ?? body) as T;
}

async function mypage(): Promise<unknown> {
  return unwrap<unknown>(api.get(`/api/master/mypage`));
}

async function getProfile(): Promise<MasterProfile> {
  return unwrap<MasterProfile>(api.get(`/api/master/profile`));
}

async function putProfile(data: Partial<MasterProfile>): Promise<MasterProfile> {
  return unwrap<MasterProfile>(api.put(`/api/master/profile`, data));
}

async function stores(): Promise<unknown[]> {
  const data = await unwrap<unknown>(api.get(`/api/master/stores`));
  return Array.isArray(data) ? data : [];
}

async function storeStats(storeId: number): Promise<StoreStats> {
  return unwrap<StoreStats>(api.get(`/api/master/stats/store/${storeId}`));
}

async function overallStats(): Promise<OverallStats> {
  return unwrap<OverallStats>(api.get(`/api/master/stats/overall`));
}

async function timeoffPending(): Promise<unknown[]> {
  const data = await unwrap<unknown>(api.get(`/api/master/timeoff/pending`));
  return Array.isArray(data) ? data : [];
}

async function approve(requestId: number): Promise<{ success: boolean }> {
  return unwrap<{ success: boolean }>(api.put(`/api/master/timeoff/${requestId}/approve`));
}

async function reject(requestId: number): Promise<{ success: boolean }> {
  return unwrap<{ success: boolean }>(api.put(`/api/master/timeoff/${requestId}/reject`));
}

const masterService = {
  mypage,
  getProfile,
  putProfile,
  stores,
  storeStats,
  overallStats,
  timeoffPending,
  approve,
  reject,
};

export default masterService;
