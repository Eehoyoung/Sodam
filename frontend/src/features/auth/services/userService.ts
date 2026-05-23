import api from '../../../common/utils/api';

// [API Mapping] User APIs — Phase 2 minimal integration
// - POST /api/users/{userId}/purpose
// - GET /api/user/{userId}
// - PUT /api/user/{employeeId}

export interface PurposePayload { purpose: 'EMPLOYER' | 'EMPLOYEE' }
export interface UserProfile { id: number; name?: string; role?: string; phone?: string }

async function setPurpose(userId: number, data: PurposePayload): Promise<{ success: boolean }>{
  const res = await api.post(`/api/users/${userId}/purpose`, data);
  const body: any = res.data;
  return body?.data || body || { success: true };
}

async function getUser(userId: number): Promise<UserProfile>{
  const res = await api.get(`/api/user/${userId}`);
  const body: any = res.data;
  return body?.data || body;
}

async function updateEmployee(employeeId: number, data: Partial<UserProfile>): Promise<UserProfile>{
  const res = await api.put(`/api/user/${employeeId}`, data);
  const body: any = res.data;
  return body?.data || body;
}

const userService = {
  setPurpose,
  getUser,
  updateEmployee,
};

export default userService;
