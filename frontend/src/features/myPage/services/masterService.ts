import api from '../../../common/utils/api';

// [API Mapping] Master (사장) MyPage APIs — Phase 2 minimal integration

export interface MasterProfile { id: number; name?: string; phone?: string }
export interface StoreStats { storeId: number; employees?: number; todayAttendance?: number; monthPayroll?: number }
export interface OverallStats { stores?: number; employees?: number; monthPayroll?: number }

async function unwrap<T = any>(promise: Promise<{ data: any }>): Promise<T> {
  const res = await promise;
  const body: any = res.data;
  return (body?.data ?? body) as T;
}

async function mypage(): Promise<any> {
  return unwrap<any>(api.get(`/api/master/mypage`));
}

async function getProfile(): Promise<MasterProfile> {
  return unwrap<MasterProfile>(api.get(`/api/master/profile`));
}

async function putProfile(data: Partial<MasterProfile>): Promise<MasterProfile> {
  return unwrap<MasterProfile>(api.put(`/api/master/profile`, data));
}

async function stores(): Promise<any[]> {
  const data = await unwrap<any>(api.get(`/api/master/stores`));
  return Array.isArray(data) ? data : [];
}

async function storeStats(storeId: number): Promise<StoreStats> {
  return unwrap<StoreStats>(api.get(`/api/master/stats/store/${storeId}`));
}

async function overallStats(): Promise<OverallStats> {
  return unwrap<OverallStats>(api.get(`/api/master/stats/overall`));
}

async function timeoffPending(): Promise<any[]> {
  const data = await unwrap<any>(api.get(`/api/master/timeoff/pending`));
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
