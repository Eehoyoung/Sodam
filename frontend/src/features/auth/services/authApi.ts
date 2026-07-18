import { Linking } from 'react-native';
import api from '../../../common/utils/api';
import {env as sodamEnv} from '../../../common/config/env';

// Lightweight auth API wrapper for RN client

const API_BASE_URL = sodamEnv.apiBaseUrl;
if (sodamEnv.debug) {console.log('API_BASE_URL:', API_BASE_URL);}
export interface LoginResponse {
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    userId: number;
    userGrade: string;
  };
  result?: LoginResponse['data'];
  code?: string;
}

export interface JoinRequest {
  name: string;
  email: string;
  password: string;
}

type PublicSignupGrade = 'PERSONAL' | 'EMPLOYEE' | 'MASTER';

export interface JoinOptions {
  purpose?: 'personal' | 'employee' | 'boss';
  userGrade?: PublicSignupGrade;
  /** 약관 동의 (필수 3종 + 선택 1종). BE JoinDto 매핑. */
  consent?: {
    age: boolean;
    terms: boolean;
    privacy: boolean;
    marketing?: boolean;
  };
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
    const body: JoinRequest & {
      purpose?: 'user' | 'employee' | 'master';
      userGrade?: PublicSignupGrade;
      ageConfirmed?: boolean;
      termsAgreed?: boolean;
      privacyAgreed?: boolean;
      marketingAgreed?: boolean;
    } = { ...payload };
    if (purposeSlug) { body.purpose = purposeSlug; }
    if (options?.userGrade) { body.userGrade = options.userGrade; }
    // BE JoinDto 필수 필드 매핑 (G-A1~G-A4 약관 동의)
    if (options?.consent) {
      body.ageConfirmed = !!options.consent.age;
      body.termsAgreed = !!options.consent.terms;
      body.privacyAgreed = !!options.consent.privacy;
      body.marketingAgreed = !!options.consent.marketing;
    }
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

  /** 이메일 사용 가능 여부 확인. available=true 면 가입 가능. */
  async checkEmail(email: string): Promise<{available: boolean}> {
    const res = await api.get<{data: {available: boolean}}>('/api/auth/email-check', {email});
    return res.data.data ?? {available: false};
  },

  async setPurpose(userId: number, purpose: 'personal' | 'employee' | 'boss'): Promise<{ message: string; userGrade?: string }> {
    const grade = purpose === 'boss' ? 'MASTER' : purpose === 'employee' ? 'EMPLOYEE' : 'PERSONAL';
    const res = await api.post(`/api/users/${userId}/purpose`, { purpose, userGrade: grade });
    return res.data as any;
  },

  /**
   * 동의 수집 (PIPA §22 — 필수/선택 분리, G-2). 카카오 등 소셜 가입 후 동의 보강에 사용.
   * BE: POST /api/auth/consents (ConsentRequestDto).
   */
  async recordConsents(consent: {
    age: boolean;
    terms: boolean;
    privacy: boolean;
    marketing?: boolean;
    locationInfo?: boolean;
  }): Promise<void> {
    await api.post(`/api/auth/consents`, {
      ageConfirmed: !!consent.age,
      termsAgreed: !!consent.terms,
      privacyAgreed: !!consent.privacy,
      marketingAgreed: !!consent.marketing,
      locationInfoAgreed: !!consent.locationInfo,
    });
  },

  /** 위치정보 동의/철회 (위치정보법 §18, G-1). BE: PUT /api/auth/consents/location?agreed= */
  async setLocationConsent(agreed: boolean): Promise<void> {
    await api.put(`/api/auth/consents/location`, undefined, { params: { agreed } });
  },
};

export default authApi;
