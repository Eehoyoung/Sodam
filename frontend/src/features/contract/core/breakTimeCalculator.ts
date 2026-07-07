/**
 * 근무시간에 따른 법정 최소 휴게시간 자동 산출/자동 배치 — BE `BreakTimeCalculator`
 * (core/payroll/wage) 와 동일 산식의 FE 미러(실시간 입력폼 자동입력용).
 * 최종 값은 발급 시 서버가 동일 산식으로 재계산·확정한다(서버 권위).
 *
 * 근로기준법 §54① "근로시간이 4시간인 경우에는 30분 이상, 8시간인 경우에는 1시간 이상의
 * 휴게시간을 근로시간 도중에 부여하여야 한다" — 시업 직후·종업 직전 배치는 "도중" 요건을
 * 충족하지 못하므로 근무 구간 정중앙에 배치한다. 법은 분할 부여를 요구하지 않으므로 단일
 * 구간으로 산출한다. 야간(자정 넘김) 시프트는 WorkScheduleCalculator 와 동일하게
 * 퇴근 ≤ 출근이면 익일 종료로 해석한다.
 */
import {isValidTimeDigits} from '../../../common/utils/dateTimeInput';

const MINUTES_PER_DAY = 24 * 60;
const FOUR_HOURS_MINUTES = 4 * 60;
const EIGHT_HOURS_MINUTES = 8 * 60;

/** §54① 8시간 이상 근무 시 법정 최소 휴게(분). */
export const MIN_BREAK_MINUTES_OVER_8H = 60;
/** §54① 4시간 이상 근무 시 법정 최소 휴게(분). */
export const MIN_BREAK_MINUTES_OVER_4H = 30;

/** 근무시간(분) 기준 §54 법정 최소 휴게시간(분). 4시간 미만은 법정 의무 없음(0). */
export function requiredBreakMinutes(workedMinutes: number): number {
    if (workedMinutes >= EIGHT_HOURS_MINUTES) {
        return MIN_BREAK_MINUTES_OVER_8H;
    }
    if (workedMinutes >= FOUR_HOURS_MINUTES) {
        return MIN_BREAK_MINUTES_OVER_4H;
    }
    return 0;
}

export interface BreakWindowMinutes {
    /** 자정 기준 0~1439분 */
    breakStartMinutes: number;
    breakEndMinutes: number;
}

/**
 * 출퇴근 시각(자정 기준 분)으로 법정 최소 휴게시간을 자동 산출하고, 근무 구간 정중앙에
 * 배치한 휴게 시작·종료(분)를 반환한다. 법정 휴게 의무가 없는 4시간 미만 근무는 null.
 *
 * @param endMinutes 시업(startMinutes) 이하이면 익일 종료로 해석(야간 시프트)
 */
export function autoBreakWindowMinutes(startMinutes: number, endMinutes: number): BreakWindowMinutes | null {
    let end = endMinutes;
    if (end <= startMinutes) {
        end += MINUTES_PER_DAY; // 자정 넘김 — 익일 종료
    }
    const worked = end - startMinutes;
    const breakMinutes = requiredBreakMinutes(worked);
    if (breakMinutes === 0) {
        return null;
    }
    // 근무 구간 정중앙 배치 — 시업 직후/종업 직전을 피해 "근로시간 도중" 요건을 항상 만족.
    const breakStart = startMinutes + Math.floor((worked - breakMinutes) / 2);
    const breakEnd = breakStart + breakMinutes;
    return {
        breakStartMinutes: breakStart % MINUTES_PER_DAY,
        breakEndMinutes: breakEnd % MINUTES_PER_DAY,
    };
}

function digitsToMinutes(digits: string): number {
    const hour = Number(digits.slice(0, 2));
    const minute = Number(digits.slice(2, 4));
    return hour * 60 + minute;
}

function minutesToDigits(minutes: number): string {
    const hour = Math.floor(minutes / 60).toString().padStart(2, '0');
    const minute = (minutes % 60).toString().padStart(2, '0');
    return `${hour}${minute}`;
}

export interface AutoBreakDigits {
    breakStart: string; // 4자리 숫자(HHmm)
    breakEnd: string;
}

/**
 * 출퇴근 시각 4자리 숫자 입력값으로 휴게 시작·종료(4자리 숫자)를 자동 산출한다.
 * 입력이 아직 완전하지 않거나(4자리 미만) 법정 휴게 의무가 없는 근무(4시간 미만)면 null —
 * 이 경우 휴게 입력란은 비워 둔다.
 */
export function autoBreakDigitsFromTimeDigits(startDigits: string, endDigits: string): AutoBreakDigits | null {
    if (!isValidTimeDigits(startDigits) || !isValidTimeDigits(endDigits)) {
        return null;
    }
    const window = autoBreakWindowMinutes(digitsToMinutes(startDigits), digitsToMinutes(endDigits));
    if (!window) {
        return null;
    }
    return {
        breakStart: minutesToDigits(window.breakStartMinutes),
        breakEnd: minutesToDigits(window.breakEndMinutes),
    };
}
