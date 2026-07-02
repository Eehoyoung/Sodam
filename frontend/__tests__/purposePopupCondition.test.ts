import { shouldShowPurposePopup } from '../src/features/auth/utils/purpose';

describe('shouldShowPurposePopup', () => {
  test('shows popup only for Kakao users without server grade and not already selected', () => {
    expect(shouldShowPurposePopup({ isKakaoUser: true, rawUserGrade: undefined, hasAlreadySelectedPurpose: false })).toBe(true);
    expect(shouldShowPurposePopup({ isKakaoUser: true, rawUserGrade: null, hasAlreadySelectedPurpose: false })).toBe(true);
    expect(shouldShowPurposePopup({ isKakaoUser: true, rawUserGrade: '', hasAlreadySelectedPurpose: false })).toBe(true);
  });

  test('does not show for email/password users even if NORMAL', () => {
    expect(shouldShowPurposePopup({ isKakaoUser: false, rawUserGrade: 'NORMAL', hasAlreadySelectedPurpose: false })).toBe(false);
    expect(shouldShowPurposePopup({ isKakaoUser: false, rawUserGrade: undefined, hasAlreadySelectedPurpose: false })).toBe(false);
  });

  test('does not show if already selected once', () => {
    expect(shouldShowPurposePopup({ isKakaoUser: true, rawUserGrade: undefined, hasAlreadySelectedPurpose: true })).toBe(false);
  });

  test('does not show if server already has grade', () => {
    expect(shouldShowPurposePopup({ isKakaoUser: true, rawUserGrade: 'EMPLOYEE', hasAlreadySelectedPurpose: false })).toBe(false);
    expect(shouldShowPurposePopup({ isKakaoUser: true, rawUserGrade: 'MASTER', hasAlreadySelectedPurpose: false })).toBe(false);
    expect(shouldShowPurposePopup({ isKakaoUser: true, rawUserGrade: 'NORMAL', hasAlreadySelectedPurpose: false })).toBe(false);
  });
});
