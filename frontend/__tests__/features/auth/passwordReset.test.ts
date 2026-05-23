import {checkPassword} from '../../../src/features/auth/services/passwordResetApi';

// [Test Mapping] PasswordReset 강도 계산 — BE PasswordResetService.isValidPassword 와 동일 규칙
// - hasLength(>=8) / hasUpper / hasLower / hasDigit / hasSpecial 모두 만족 시 isValid=true
// - strength: count<=2 weak, <=4 medium, ==5 strong

describe('checkPassword', () => {
    describe('isValid 판정', () => {
        it('5개 조건 모두 충족 시 isValid=true, strength=strong', () => {
            const r = checkPassword('Abcdef1!');
            expect(r.hasLength).toBe(true);
            expect(r.hasUpper).toBe(true);
            expect(r.hasLower).toBe(true);
            expect(r.hasDigit).toBe(true);
            expect(r.hasSpecial).toBe(true);
            expect(r.isValid).toBe(true);
            expect(r.strength).toBe('strong');
        });

        it('특수문자 누락 시 isValid=false', () => {
            const r = checkPassword('Abcdef12');
            expect(r.hasSpecial).toBe(false);
            expect(r.isValid).toBe(false);
        });

        it('길이 8 미만이면 isValid=false', () => {
            const r = checkPassword('Ab1!');
            expect(r.hasLength).toBe(false);
            expect(r.isValid).toBe(false);
        });

        it('대문자 누락 시 isValid=false', () => {
            const r = checkPassword('abcdef1!');
            expect(r.hasUpper).toBe(false);
            expect(r.isValid).toBe(false);
        });

        it('숫자 누락 시 isValid=false', () => {
            const r = checkPassword('Abcdefg!');
            expect(r.hasDigit).toBe(false);
            expect(r.isValid).toBe(false);
        });
    });

    describe('strength 계산', () => {
        it('빈 문자열은 weak (count=0)', () => {
            const r = checkPassword('');
            expect(r.hasLength).toBe(false);
            expect(r.hasUpper).toBe(false);
            expect(r.hasLower).toBe(false);
            expect(r.hasDigit).toBe(false);
            expect(r.hasSpecial).toBe(false);
            expect(r.strength).toBe('weak');
            expect(r.isValid).toBe(false);
        });

        it('한 종류만(소문자만, 짧음) → weak', () => {
            const r = checkPassword('abc');
            // count = 1 (hasLower) → weak
            expect(r.strength).toBe('weak');
            expect(r.isValid).toBe(false);
        });

        it('count=2 (소문자+숫자 짧음) → weak', () => {
            const r = checkPassword('abc1');
            // hasLower + hasDigit = 2 → weak
            expect(r.strength).toBe('weak');
        });

        it('count=3 (길이+소문자+숫자) → medium', () => {
            const r = checkPassword('abcdefgh1');
            // hasLength, hasLower, hasDigit
            expect(r.strength).toBe('medium');
            expect(r.isValid).toBe(false);
        });

        it('count=4 (특수문자 누락, 나머지 OK) → medium', () => {
            const r = checkPassword('Abcdefg1');
            // hasLength, hasUpper, hasLower, hasDigit = 4
            expect(r.strength).toBe('medium');
            expect(r.isValid).toBe(false);
        });

        it('count=5 (전부 충족) → strong', () => {
            const r = checkPassword('StrongP@ss1');
            expect(r.strength).toBe('strong');
            expect(r.isValid).toBe(true);
        });
    });
});
