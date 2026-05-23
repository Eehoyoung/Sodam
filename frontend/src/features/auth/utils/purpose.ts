// Purpose popup condition and helpers
// Canonical policy: Show purpose selection popup only for Kakao signup users
// who currently have no userGrade stored on the server, and who have not
// already selected a purpose (one-time only).

export interface PurposePopupCondition {
  isKakaoUser: boolean;
  rawUserGrade?: string | null;
  hasAlreadySelectedPurpose: boolean;
}

// Minimal logic derived from issue requirements
export const shouldShowPurposePopup = ({
  isKakaoUser,
  rawUserGrade,
  hasAlreadySelectedPurpose,
}: PurposePopupCondition): boolean => {
  const noServerGrade = rawUserGrade == null || rawUserGrade === '';
  return Boolean(isKakaoUser && noServerGrade && !hasAlreadySelectedPurpose);
};

export type Purpose = 'personal' | 'employee' | 'boss';
