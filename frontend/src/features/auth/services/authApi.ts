import { Linking } from 'react-native';
import api from '../../../common/utils/api';
import {env as sodamEnv} from '../../../common/config/env';

// Lightweight auth API wrapper for RN client

const API_BASE_URL = sodamEnv.apiBaseUrl;
if (sodamEnv.debug) console.log('API_BASE_URL:', API_BASE_URL);
export interface LoginResponse {
  message: string;
  result?: {
    accessToken: string;
    refreshToken: string;
    userId: number;
    userGrade: string;
  };
  code?: string;
}

export interface JoinRequest {
  name: string;
  email: string;
  password: string;
}

export interface JoinOptions {
  purpose?: 'personal' | 'employee' | 'boss';
  userGrade?: 'PERSONAL' | 'EMPLOYEE' | 'MASTER';
}

const toPurposeSlug = (purpose: 'personal' | 'employee' | 'boss'): 'user' | 'employee' | 'master' => {
  return purpose === 'boss' ? 'master' : purpose === 'employee' ? 'employee' : 'user';
};

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>(`/api/login`, { email, password });
    return res.data as any;
  },

  async join(payload: JoinRequest, options?: JoinOptions): Promise<{ message: string } & Partial<LoginResponse>> {
    const headers: Record<string, string> = {};
    const purposeSlug = options?.purpose ? toPurposeSlug(options.purpose) : undefined;
    if (purposeSlug) { headers['X-User-Purpose'] = purposeSlug; }
    if (options?.userGrade) { headers['X-User-Grade'] = options.userGrade; }
    const body: any = { ...payload };
    if (purposeSlug) { body.purpose = purposeSlug; }
    const res = await api.post(`/api/join`, body, { headers });
    return res.data as any;
  },

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>(`/api/auth/refresh`, { refreshToken });
    return res.data as any;
  },

  buildKakaoAuthorizeUrl(): string {
    const clientId = process.env.KAKAO_CLIENT_ID ?? '';
    const redirectUri = sodamEnv.kakaoRedirectUri;
    const base = 'https://kauth.kakao.com/oauth/authorize';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
    });
    return `${base}?${params.toString()}`;
  },

  async openKakaoLogin(): Promise<void> {
    const url = this.buildKakaoAuthorizeUrl();
    // Opens the Kakao consent screen in external browser.
    // Note: Full in-app redirect handling is a follow-up; backend will receive the code and can be polled if needed.
    await Linking.openURL(url);
  },

  async setPurpose(userId: number, purpose: 'personal' | 'employee' | 'boss'): Promise<{ message: string; userGrade?: string }> {
    const slug = toPurposeSlug(purpose);
    const grade = slug === 'master' ? 'MASTER' : slug === 'employee' ? 'EMPLOYEE' : 'PERSONAL';
    const res = await api.post(`/api/users/${userId}/purpose`, { purpose: slug, userGrade: grade });
    return res.data as any;
  },
};

export default authApi;
