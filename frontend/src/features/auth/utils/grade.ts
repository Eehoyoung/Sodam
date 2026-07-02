// Utility to normalize backend userGrade strings into canonical values
// Canonical values used by frontend: 'NORMAL' | 'EMPLOYEE' | 'MASTER'

export type CanonicalGrade = 'PERSONAL' | 'EMPLOYEE' | 'MASTER';

const TRIM_RE = /[^A-Z_]/g;

export function normalizeUserGrade(input?: string | null): CanonicalGrade {
  if (!input) {return 'PERSONAL';}
  const raw = String(input).toUpperCase().replace(TRIM_RE, '');

  // Handle common variants
  // MASTER
  if (raw === 'MASTER' || raw === 'ROLE_MASTER' || raw === 'BOSS' || raw === 'ROLE_BOSS') {
    return 'MASTER';
  }
  // EMPLOYEE
  if (raw === 'EMPLOYEE' || raw === 'ROLE_EMPLOYEE' || raw === 'STAFF' || raw === 'ROLE_STAFF') {
    return 'EMPLOYEE';
  }
  // NORMAL / USER / PERSONAL
  if (raw === 'PERSONAL' || raw === 'USER' || raw === 'ROLE_USER' || raw === 'PERSONAL' || raw === 'ROLE_PERSONAL') {
    return 'PERSONAL';
  }

  // Fallback: treat unknown as NORMAL for safety
  return 'PERSONAL';
}

export function purposeToGrade(purpose: 'personal' | 'employee' | 'boss'): CanonicalGrade {
  switch (purpose) {
    case 'boss':
      return 'MASTER';
    case 'employee':
      return 'EMPLOYEE';
    default:
      return 'PERSONAL';
  }
}

export function gradeToPurposeSlug(grade: CanonicalGrade): 'user' | 'employee' | 'master' {
  switch (grade) {
    case 'MASTER':
      return 'master';
    case 'EMPLOYEE':
      return 'employee';
    default:
      return 'user';
  }
}
