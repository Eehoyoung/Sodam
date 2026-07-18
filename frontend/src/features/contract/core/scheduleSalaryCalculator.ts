/**
 * 스케줄 기반 월급 자동 산출(월급제 전용) — BE `WorkScheduleCalculator` +
 * `LaborContractService.normalizeSalaryTerms` 와 동일 산식의 FE 미러(실시간 미리보기용).
 * 최종 값은 발급 시 서버가 동일 산식으로 재계산·확정한다(서버 권위).
 *
 * 산식(근로기준법 §50·§53·§56) — 분(minute) 정수 연산으로 부동소수 오차 차단:
 * - 일 실근로 = (퇴근 − 출근) − 휴게. 퇴근 ≤ 출근이면 익일 종료(자정 넘김)
 * - 주 소정 = min(주 실근로, 40h) / 주 연장 = max(Σ일별 8h 초과, 주 실근로 − 40h)
 * - 주 야간 = 근무구간 ∩ 22:00~06:00(휴게 겹침 차감)
 * - 월 환산 계수 365/7/12(≈4.345238) · 월 기준시간 = round((주 소정 + 주휴) × 계수)
 *   [주휴 = 주 소정 15h 미만 0, 이상 min(주 소정/40 × 8, 8)] — 주 40h → 209h
 * - 월 기본급 = 기준시급 × 월 기준시간(정수곱 → 환산 통상시급 == 기준시급)
 * - 고정 연장수당 = round(시급 × 월 연장시간 × (5인 이상 1.5 : 1.0))
 * - 야간가산수당 = round(시급 × 월 야간시간 × (5인 이상 0.5 : 0))
 * - 예상 월 지급액 = 기본급 + 고정연장 + 야간가산 / 연봉 환산 = × 12
 *
 * ⚠ 시급제(HOURLY) 직접 입력 경로(`salaryContractCalculator`)와는 완전 분리 —
 * 시급제는 주휴수당 별도 가산, 월급제는 209h 내재로 규칙이 정반대다.
 */
import type {WorkScheduleDayCode, WorkScheduleDayDto} from '../types';
import {calculateMonthlyStandardHours, formatWon} from './salaryContractCalculator';

/** 월평균 주수 정밀값(365÷7÷12) — BE EXACT_AVG_WEEKS_PER_MONTH 와 동일 산식. */
export const EXACT_AVG_WEEKS_PER_MONTH = 365 / 7 / 12;

const MINUTES_PER_DAY = 24 * 60;
const STATUTORY_DAILY_MINUTES = 8 * 60; // §50② 일 8h
const STATUTORY_WEEKLY_MINUTES = 40 * 60; // §50① 주 40h
/**
 * 야간근로(§56③) 22:00~06:00 을 이틀 타임라인(0~2880분) 위의 창으로 표현.
 * [0,360)=당일 00~06시, [1320,1800)=당일 22시~익일 06시, [2760,2880)=익일 22~24시.
 */
const NIGHT_WINDOWS: ReadonlyArray<readonly [number, number]> = [
    [0, 360],
    [1320, 1800],
    [2760, 2880],
];

const DAY_KO: Record<WorkScheduleDayCode, string> = {
    MONDAY: '월요일',
    TUESDAY: '화요일',
    WEDNESDAY: '수요일',
    THURSDAY: '목요일',
    FRIDAY: '금요일',
    SATURDAY: '토요일',
    SUNDAY: '일요일',
};

export interface ScheduleWeeklyStats {
    /** 주 근무일 수 */
    workingDays: number;
    /** 주 실근로(휴게 제외, 시간) */
    weeklyActualHours: number;
    /** 주 소정 = min(실근로, 40h) */
    weeklyContractedHours: number;
    /** 주 연장 = max(Σ일별 8h 초과, 실근로 − 40h) */
    weeklyOvertimeHours: number;
    /** 주 야간(22~06시 교집합, 휴게 차감) */
    weeklyNightHours: number;
    /** 요일별 실근로(근무 없는 요일은 키 없음) */
    dailyWorkedHours: Partial<Record<WorkScheduleDayCode, number>>;
}

export interface ScheduleSalaryInput {
    schedule: WorkScheduleDayDto[];
    /** 급여 기준시급(원) — 기본값은 매장 기준시급 */
    baseHourlyWage: number;
    fiveOrMoreEmployees: boolean;
    minimumHourlyWage?: number;
    probationWageRate?: number;
}

export interface ScheduleSalaryBreakdown extends ScheduleWeeklyStats {
    monthlyStandardHours: number;
    monthlyOvertimeHours: number;
    monthlyNightHours: number;
    monthlyBaseSalary: number;
    /** 스케줄 모드에서는 항상 기준시급과 동일(기본급이 시급×기준시간 정수곱) */
    ordinaryHourlyWage: number;
    overtimePay: number;
    nightPremiumPay: number;
    expectedMonthlyWage: number;
    /** 연봉 환산 = 예상 월 지급액 × 12 (직접 입력 모드의 기본급×12 와 다름 — 자동 산출 사양) */
    annualizedWage: number;
    minimumWageCompliant: boolean;
}

function toMinutes(time: string): number {
    const hour = Number(time.slice(0, 2));
    const minute = Number(time.slice(3, 5));
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
        throw new Error(`시각 형식이 올바르지 않습니다: ${time}`);
    }
    return hour * 60 + minute;
}

/** 구간 [from, to) 과 야간 창(22~06시)들의 교집합 분 합계. */
function overlapWithNight(from: number, to: number): number {
    let sum = 0;
    for (const [winStart, winEnd] of NIGHT_WINDOWS) {
        sum += Math.max(0, Math.min(to, winEnd) - Math.max(from, winStart));
    }
    return sum;
}

/** 휴게 시각을 근무 타임라인(0~2880분) 위로 사상 — 근무 구간 해석 규칙과 동일. */
function mapBreakOntoTimeline(day: WorkScheduleDayDto, shiftStart: number): [number, number] {
    let breakStart = toMinutes(day.breakStartTime as string);
    if (breakStart < shiftStart) {
        breakStart += MINUTES_PER_DAY;
    }
    let breakEnd = toMinutes(day.breakEndTime as string);
    while (breakEnd <= breakStart) {
        breakEnd += MINUTES_PER_DAY;
    }
    return [breakStart, breakEnd];
}

/**
 * 스케줄 구조 검증 + 주 단위 집계 — BE WorkScheduleCalculator.weeklyStats 미러.
 * 구조 오류(요일 중복, 시업=종업, 휴게 반쪽/근무 밖, 실근로 ≤ 0)는 한국어 메시지의 Error 로 던진다.
 */
export function weeklyStatsFromSchedule(schedule: WorkScheduleDayDto[]): ScheduleWeeklyStats {
    if (!schedule || schedule.length === 0) {
        throw new Error('근무 스케줄에 최소 1개 요일이 필요합니다.');
    }

    const seen = new Set<WorkScheduleDayCode>();
    let totalMinutes = 0;
    let dailyOvertimeMinutes = 0;
    let nightMinutes = 0;
    const dailyWorkedHours: Partial<Record<WorkScheduleDayCode, number>> = {};

    for (const day of schedule) {
        const label = DAY_KO[day.day];
        if (seen.has(day.day)) {
            throw new Error(`${label} 스케줄이 중복 입력되었습니다.`);
        }
        seen.add(day.day);
        if ((day.breakStartTime === null) !== (day.breakEndTime === null)) {
            throw new Error(`${label} 휴게 시작·종료 시각은 함께 입력해야 합니다.`);
        }

        const start = toMinutes(day.startTime);
        let end = toMinutes(day.endTime);
        if (end === start) {
            throw new Error(`${label} 출근·퇴근 시각이 같습니다 — 24시간 근무 스케줄은 지원하지 않습니다.`);
        }
        if (end < start) {
            end += MINUTES_PER_DAY; // 자정 넘김 — 익일 종료
        }
        let worked = end - start;
        let night = overlapWithNight(start, end);

        if (day.breakStartTime !== null && day.breakEndTime !== null) {
            const [breakStart, breakEnd] = mapBreakOntoTimeline(day, start);
            if (breakStart < start || breakEnd > end) {
                throw new Error(
                    `${label} 휴게시간(${day.breakStartTime}~${day.breakEndTime})이 근무시간(${day.startTime}~${day.endTime}) 밖에 있습니다.`,
                );
            }
            worked -= breakEnd - breakStart;
            night -= overlapWithNight(breakStart, breakEnd);
        }
        if (worked <= 0) {
            throw new Error(`${label} 실근로시간이 0 이하입니다 — 출퇴근·휴게 시각을 확인해 주세요.`);
        }

        totalMinutes += worked;
        dailyOvertimeMinutes += Math.max(0, worked - STATUTORY_DAILY_MINUTES);
        nightMinutes += night;
        dailyWorkedHours[day.day] = worked / 60;
    }

    const contractedMinutes = Math.min(totalMinutes, STATUTORY_WEEKLY_MINUTES);
    // 일 기준(§53·§56①1)·주 기준(§50①) 중 큰 쪽 하나만 — 이중계상 금지
    const overtimeMinutes = Math.max(dailyOvertimeMinutes, totalMinutes - STATUTORY_WEEKLY_MINUTES);

    return {
        workingDays: schedule.length,
        weeklyActualHours: totalMinutes / 60,
        weeklyContractedHours: contractedMinutes / 60,
        weeklyOvertimeHours: overtimeMinutes / 60,
        weeklyNightHours: nightMinutes / 60,
        dailyWorkedHours,
    };
}

/** 하루 휴게시간(분). 휴게 미설정이면 0 — §17 대표 휴게 표기용(BE breakMinutesOf 미러). */
export function breakMinutesOfDay(day: WorkScheduleDayDto): number {
    if (day.breakStartTime === null || day.breakEndTime === null) {
        return 0;
    }
    const start = toMinutes(day.startTime);
    const [breakStart, breakEnd] = mapBreakOntoTimeline(day, start);
    return breakEnd - breakStart;
}

/** 스케줄 + 기준시급 → 월급제 급여 산출 — BE normalizeSalaryTerms(스케줄 모드) 미러. */
export function calculateScheduleSalary(input: ScheduleSalaryInput): ScheduleSalaryBreakdown {
    const baseWage = Math.round(input.baseHourlyWage);
    if (!Number.isFinite(baseWage) || baseWage <= 0) {
        throw new Error('스케줄 기반 월급 산출에는 급여 기준시급(원)이 필수입니다.');
    }

    const stats = weeklyStatsFromSchedule(input.schedule);
    // 직접 입력 경로와 동일 산식(주 소정 ≤ 40h 이므로 클램프 무영향) — 40h → 209h
    const monthlyStandardHours = calculateMonthlyStandardHours(stats.weeklyContractedHours);
    const monthlyBaseSalary = baseWage * monthlyStandardHours;
    const ordinaryHourlyWage = baseWage; // 정수곱 구조상 환산 통상시급 == 기준시급 (BE 보장 동일)

    const monthlyOvertimeHours = stats.weeklyOvertimeHours * EXACT_AVG_WEEKS_PER_MONTH;
    const monthlyNightHours = stats.weeklyNightHours * EXACT_AVG_WEEKS_PER_MONTH;
    const overtimePay = Math.round(
        ordinaryHourlyWage * monthlyOvertimeHours * (input.fiveOrMoreEmployees ? 1.5 : 1.0),
    );
    const nightPremiumPay = Math.round(
        ordinaryHourlyWage * monthlyNightHours * (input.fiveOrMoreEmployees ? 0.5 : 0.0),
    );
    const expectedMonthlyWage = monthlyBaseSalary + overtimePay + nightPremiumPay;

    const minimumHourlyWage = input.minimumHourlyWage ?? 0;
    const minimumWageRate =
        input.probationWageRate && input.probationWageRate > 0 ? input.probationWageRate : 1;

    return {
        ...stats,
        monthlyStandardHours,
        monthlyOvertimeHours,
        monthlyNightHours,
        monthlyBaseSalary,
        ordinaryHourlyWage,
        overtimePay,
        nightPremiumPay,
        expectedMonthlyWage,
        annualizedWage: expectedMonthlyWage * 12,
        minimumWageCompliant:
            !minimumHourlyWage || ordinaryHourlyWage >= Math.ceil(minimumHourlyWage * minimumWageRate),
    };
}

/**
 * 산출근거 미리보기 카드 텍스트(사용자 확정 형식) — 예:
 * "주 근무일 5일 · 주 실근로 55.0h · 주 40h 초과 15.0h → 월 고정연장 65.18h"
 * "월 기본급 2,156,880원 / 고정 연장수당 672,643원 / 야간가산 0원(5인 미만 미적용)"
 * "예상 월 지급액 2,829,523원 / 연봉 환산 33,954,276원"
 */
export function buildSchedulePreviewLines(
    breakdown: ScheduleSalaryBreakdown,
    fiveOrMoreEmployees: boolean,
): string[] {
    const hoursLine: string[] = [
        `주 근무일 ${breakdown.workingDays}일`,
        `주 실근로 ${breakdown.weeklyActualHours.toFixed(1)}h`,
    ];
    if (breakdown.weeklyOvertimeHours > 0) {
        hoursLine.push(
            `주 40h 초과 ${breakdown.weeklyOvertimeHours.toFixed(1)}h → 월 고정연장 ${breakdown.monthlyOvertimeHours.toFixed(2)}h`,
        );
    }
    if (breakdown.weeklyNightHours > 0) {
        hoursLine.push(
            `주 야간 ${breakdown.weeklyNightHours.toFixed(1)}h → 월 ${breakdown.monthlyNightHours.toFixed(2)}h`,
        );
    }
    const nightSuffix = fiveOrMoreEmployees ? '' : '(5인 미만 미적용)';
    return [
        hoursLine.join(' · '),
        `월 기본급 ${formatWon(breakdown.monthlyBaseSalary)} / 고정 연장수당 ${formatWon(breakdown.overtimePay)} / 야간가산 ${formatWon(breakdown.nightPremiumPay)}${nightSuffix}`,
        `예상 월 지급액 ${formatWon(breakdown.expectedMonthlyWage)} / 연봉 환산 ${formatWon(breakdown.annualizedWage)}`,
    ];
}

/** 4단계 미리보기 계약서용 임금 구성항목 텍스트 — 실제 발급 시엔 서버 자동 생성이 단일 소스. */
export function buildSchedulePreviewWageComponents(
    breakdown: ScheduleSalaryBreakdown,
    fiveOrMoreEmployees: boolean,
    baseHourlyWage: number,
): string {
    return [
        `[스케줄 자동 산출] 기준시급 ${formatWon(baseHourlyWage)} · 주 소정 ${breakdown.weeklyContractedHours.toFixed(1)}h · 월 기준시간 ${breakdown.monthlyStandardHours}시간(주휴 포함)`,
        ...buildSchedulePreviewLines(breakdown, fiveOrMoreEmployees),
        '최종 산출근거는 발급 시 서버가 동일 산식으로 생성·확정합니다.',
    ].join('\n');
}
