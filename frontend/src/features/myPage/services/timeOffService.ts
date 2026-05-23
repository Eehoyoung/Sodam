import api from '../../../common/utils/api';

// [API Mapping] TimeOff APIs — Phase 2 minimal integration

export interface TimeOffRequestPayload { employeeId: number; storeId: number; from: string; to: string; reason?: string }
export interface TimeOffItem { id: number; employeeId: number; storeId: number; status: string; from: string; to: string }

async function unwrap<T = any>(promise: Promise<{ data: any }>): Promise<T> {
  const res = await promise;
  const body: any = res.data;
  return (body?.data ?? body) as T;
}

async function create(payload: TimeOffRequestPayload): Promise<{ id: number }> {
  return unwrap<{ id: number }>(api.post(`/api/timeoff`, payload));
}

async function getStoreAll(storeId: number): Promise<TimeOffItem[]> {
  const data = await unwrap<any>(api.get(`/api/timeoff/store/${storeId}`));
  return Array.isArray(data) ? data : [];
}

async function getByStatus(storeId: number, status: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<TimeOffItem[]> {
  const data = await unwrap<any>(api.get(`/api/timeoff/store/${storeId}/status/${status}`));
  return Array.isArray(data) ? data : [];
}

async function getEmployeeAll(employeeId: number): Promise<TimeOffItem[]> {
  const data = await unwrap<any>(api.get(`/api/timeoff/employee/${employeeId}`));
  return Array.isArray(data) ? data : [];
}

async function approve(requestId: number): Promise<{ success: boolean }> {
  return unwrap<{ success: boolean }>(api.put(`/api/timeoff/${requestId}/approve`));
}

async function reject(requestId: number): Promise<{ success: boolean }> {
  return unwrap<{ success: boolean }>(api.put(`/api/timeoff/${requestId}/reject`));
}

const timeOffService = {
  create,
  getStoreAll,
  getByStatus,
  getEmployeeAll,
  approve,
  reject,
};

export default timeOffService;
