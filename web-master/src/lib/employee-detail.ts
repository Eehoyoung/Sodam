import { apiFetchEnveloped } from "./api";

export interface UserDetail {
  id: number;
  email: string;
  name: string;
  role: string | null;
  phone: string | null;
  birthDate: string | null;
  profileCompleted: boolean;
  consentCompleted: boolean;
  locationConsented: boolean;
  createdAt: string;
}

/** 사용자(직원) 상세 — GET /api/user/{userId}, ApiResponse 봉투. 본인 또는 MASTER만 열람 가능(백엔드 강제). */
export function fetchUserDetail(userId: number): Promise<UserDetail> {
  return apiFetchEnveloped<UserDetail>(`/api/user/${userId}`);
}
