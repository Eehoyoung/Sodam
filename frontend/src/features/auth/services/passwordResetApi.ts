import api from '../../../common/api/client';

/**
 * 비밀번호 재설정 OTP 흐름 (G-006).
 *
 * 3 단계:
 *   1. request(email)             → OTP 발송 (5분)
 *   2. verify(email, code)        → resetTicket 발급
 *   3. confirm(ticket, newPwd)    → 비번 변경
 */
export const passwordResetApi = {
    async request(email: string): Promise<void> {
        await api.post('/api/auth/password-reset/request', {email});
    },

    async verify(email: string, code: string): Promise<string> {
        const res = await api.post<{resetTicket: string}>('/api/auth/password-reset/verify', {
            email,
            code,
        });
        return res.data.resetTicket;
    },

    async confirm(resetTicket: string, newPassword: string): Promise<void> {
        await api.post('/api/auth/password-reset/confirm', {resetTicket, newPassword});
    },
};

/**
 * 비밀번호 강도 평가 — BE 의 PasswordResetService.isValidPassword 와 동일 규칙.
 *  - 8자 이상, 대소문자·숫자·특수문자 각 1자 이상
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordCheck {
    hasLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasDigit: boolean;
    hasSpecial: boolean;
    isValid: boolean;
    strength: PasswordStrength;
}

export function checkPassword(pw: string): PasswordCheck {
    const hasLength = pw.length >= 8;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const count = [hasLength, hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
    const isValid = hasLength && hasUpper && hasLower && hasDigit && hasSpecial;
    const strength: PasswordStrength = count <= 2 ? 'weak' : count <= 4 ? 'medium' : 'strong';
    return {hasLength, hasUpper, hasLower, hasDigit, hasSpecial, isValid, strength};
}
