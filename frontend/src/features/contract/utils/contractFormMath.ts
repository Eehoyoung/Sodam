import {dateDigitsToIso, isValidDateDigits} from '../../../common/utils/dateTimeInput';

/**
 * 근로계약서 폼의 순수 계산 헬퍼 — SendContractScreen(H-7)에서 분리했다.
 * 상태·렌더와 무관한 값 계산만 담당하며 로직은 이동 전과 동일하다.
 */

/** 주휴수당 발생 기준(§55) — 주 소정근로 15시간. */
export const WEEKLY_ALLOWANCE_THRESHOLD = 15;

export function isFixedTermAtLeastOneYear(startDigits: string, endDigits: string): boolean {
    if (!isValidDateDigits(startDigits) || !isValidDateDigits(endDigits)) {
        return false;
    }
    const startIso = dateDigitsToIso(startDigits);
    const endIso = dateDigitsToIso(endDigits);
    const [sy, sm, sd] = startIso.split('-').map(Number);
    const [ey, em, ed] = endIso.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const oneYearInclusiveEnd = new Date(start);
    oneYearInclusiveEnd.setFullYear(oneYearInclusiveEnd.getFullYear() + 1);
    oneYearInclusiveEnd.setDate(oneYearInclusiveEnd.getDate() - 1);
    return end >= oneYearInclusiveEnd;
}

export function isFixedTermAtLeastOneMonth(startDigits: string, endDigits: string): boolean {
    if (!isValidDateDigits(startDigits) || !isValidDateDigits(endDigits)) {
        return false;
    }
    const startIso = dateDigitsToIso(startDigits);
    const endIso = dateDigitsToIso(endDigits);
    const [sy, sm, sd] = startIso.split('-').map(Number);
    const [ey, em, ed] = endIso.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const oneMonthInclusiveEnd = new Date(start);
    oneMonthInclusiveEnd.setMonth(oneMonthInclusiveEnd.getMonth() + 1);
    oneMonthInclusiveEnd.setDate(oneMonthInclusiveEnd.getDate() - 1);
    return end >= oneMonthInclusiveEnd;
}

export function ageOn(dateIso: string | null | undefined, referenceIso: string): number | null {
    if (!dateIso) {return null;}
    const [by, bm, bd] = dateIso.split('-').map(Number);
    const [ry, rm, rd] = referenceIso.split('-').map(Number);
    if ([by, bm, bd, ry, rm, rd].some(Number.isNaN)) {return null;}
    let age = ry - by;
    if (rm < bm || (rm === bm && rd < bd)) {
        age -= 1;
    }
    return age;
}

export function weeklyAllowanceHours(weeklyHours: number): number {
    if (weeklyHours < WEEKLY_ALLOWANCE_THRESHOLD) {
        return 0;
    }
    return Math.min(8, (weeklyHours / 40) * 8);
}

export function sanitizeDecimalInput(v: string): string {
    return v.replace(/[^0-9.]/g, '');
}

export function sanitizeIntegerInput(v: string): string {
    return v.replace(/[^0-9]/g, '');
}

export function numberOrZero(raw: string): number {
    const n = Number(raw);
    return raw.trim() === '' || Number.isNaN(n) ? 0 : n;
}
