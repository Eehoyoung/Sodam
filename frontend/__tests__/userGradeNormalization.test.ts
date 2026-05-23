import { normalizeUserGrade } from '../src/features/auth/utils/grade';

describe('normalizeUserGrade', () => {
  test('maps ROLE_* values correctly', () => {
    expect(normalizeUserGrade('ROLE_MASTER')).toBe('MASTER');
    expect(normalizeUserGrade('ROLE_EMPLOYEE')).toBe('EMPLOYEE');
    expect(normalizeUserGrade('ROLE_USER')).toBe('PERSONAL');
  });

  test('maps plain values correctly', () => {
    expect(normalizeUserGrade('MASTER')).toBe('MASTER');
    expect(normalizeUserGrade('EMPLOYEE')).toBe('EMPLOYEE');
    expect(normalizeUserGrade('PERSONAL')).toBe('PERSONAL');
  });

  test('handles Personal/USER synonyms', () => {
    expect(normalizeUserGrade('Personal')).toBe('PERSONAL');
    expect(normalizeUserGrade('USER')).toBe('PERSONAL');
  });

  test('fallbacks unknown to PERSONAL', () => {
    expect(normalizeUserGrade('SOMETHING_ELSE')).toBe('PERSONAL');
    expect(normalizeUserGrade(undefined)).toBe('PERSONAL');
    expect(normalizeUserGrade(null as any)).toBe('PERSONAL');
  });
});
