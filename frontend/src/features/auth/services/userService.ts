import api from '../../../common/utils/api';

// [API Mapping] User APIs — Phase 2 minimal integration
// - POST /api/users/{userId}/purpose
// - GET /api/user/{userId}
// - PUT /api/user/{employeeId}
// - PUT /api/user/me/profile-basics  (회원가입 후 1회성 보강)

export interface PurposePayload { purpose: 'EMPLOYER' | 'EMPLOYEE' }
export interface UserProfile { id: number; name?: string; role?: string; phone?: string; profileCompleted?: boolean }

export interface ProfileBasicsPayload {
  /** 휴대폰 — 하이픈 포함/미포함 모두 허용 (BE 가 숫자만 저장) */
  phone: string;
  name?: string;
  /** ISO YYYY-MM-DD (선택) */
  birthDate?: string;
}

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

/**
 * 회원가입 후 프로필 기본정보 보강.
 * BE EmployeeWageUpdateDto 처럼 silent fail 회피 위해 phone 누락 시 throw fail-fast.
 */
async function updateProfileBasics(payload: ProfileBasicsPayload): Promise<UserProfile & {profileCompleted: boolean}>{
  if (!payload.phone?.trim()) {
    throw new Error('PHONE_REQUIRED');
  }
  const res = await api.put<any>(`/api/user/me/profile-basics`, {
    phone: payload.phone.trim(),
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- blank name/birthDate must become undefined (omit field), so ?? would keep the empty string
    name: payload.name?.trim() || undefined,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- blank name/birthDate must become undefined (omit field), so ?? would keep the empty string
    birthDate: payload.birthDate || undefined,
  });
  const body: any = res.data;
  const data = body?.data ?? body ?? {};
  return {
    id: data.userId ?? data.id,
    name: data.name,
    phone: data.phone,
    profileCompleted: !!data.profileCompleted,
  };
}

const userService = {
  setPurpose,
  getUser,
  updateEmployee,
  updateProfileBasics,
};

export default userService;
