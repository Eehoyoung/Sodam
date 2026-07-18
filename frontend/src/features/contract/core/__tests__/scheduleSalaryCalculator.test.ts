import {
    EXACT_AVG_WEEKS_PER_MONTH,
    calculateScheduleSalary,
    weeklyStatsFromSchedule,
} from '../scheduleSalaryCalculator';
import type {WorkScheduleDayCode, WorkScheduleDayDto} from '../../types';

function day(
    code: WorkScheduleDayCode,
    startTime: string,
    endTime: string,
    breakStartTime: string | null = null,
    breakEndTime: string | null = null,
): WorkScheduleDayDto {
    return {day: code, startTime, endTime, breakStartTime, breakEndTime};
}

/** 일 11h 실근로(10:00~21:00, 휴게 없음) — BE 수용 테스트와 동일 시나리오. */
const ELEVEN_HOUR_DAYS_5: WorkScheduleDayDto[] = [
    day('MONDAY', '10:00', '21:00'),
    day('TUESDAY', '10:00', '21:00'),
    day('WEDNESDAY', '10:00', '21:00'),
    day('THURSDAY', '10:00', '21:00'),
    day('FRIDAY', '10:00', '21:00'),
];

const CASE_COUNT = 5000;
const MINIMUM_WAGE_2026 = 10_320;
const DAY_CODES: WorkScheduleDayCode[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
];

function clock(totalMinutes: number): string {
    const minuteOfDay = ((totalMinutes % 1440) + 1440) % 1440;
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function nightOverlap(from: number, to: number): number {
    const windows: Array<[number, number]> = [[0, 360], [1320, 1800], [2760, 2880]];
    return windows.reduce((sum, [start, end]) => sum + Math.max(0, Math.min(to, end) - Math.max(from, start)), 0);
}

function generatedCase(caseNo: number): {
    schedule: WorkScheduleDayDto[];
    expectedActual: number;
    expectedOvertime: number;
    expectedNight: number;
} {
    const workingDays = (caseNo % 7) + 1;
    const firstDay = (caseNo * 3) % DAY_CODES.length;
    let actualMinutes = 0;
    let dailyOvertimeMinutes = 0;
    let nightMinutes = 0;
    const schedule: WorkScheduleDayDto[] = [];

    for (let idx = 0; idx < workingDays; idx += 1) {
        const start = ((caseNo * 37 + idx * 97) % 48) * 30;
        const duration = 240 + (((caseNo * 11 + idx * 5) % 18) * 30); // 4h~12.5h
        const breakMinutes = ((caseNo + idx) % 4) * 30; // 0/30/60/90m
        const worked = duration - breakMinutes;
        const end = start + duration;
        let breakStart: number | null = null;
        let breakEnd: number | null = null;

        if (breakMinutes > 0) {
            const latestBreakStart = duration - breakMinutes - 30;
            const breakOffset = Math.min(240, Math.max(60, latestBreakStart));
            breakStart = start + breakOffset;
            breakEnd = breakStart + breakMinutes;
        }

        actualMinutes += worked;
        dailyOvertimeMinutes += Math.max(0, worked - 480);
        nightMinutes += nightOverlap(start, end);
        if (breakStart !== null && breakEnd !== null) {
            nightMinutes -= nightOverlap(breakStart, breakEnd);
        }

        schedule.push({
            day: DAY_CODES[(firstDay + idx) % DAY_CODES.length],
            startTime: clock(start),
            endTime: clock(end),
            breakStartTime: breakStart === null ? null : clock(breakStart),
            breakEndTime: breakEnd === null ? null : clock(breakEnd),
        });
    }

    return {
        schedule,
        expectedActual: actualMinutes / 60,
        expectedOvertime: Math.max(dailyOvertimeMinutes, actualMinutes - 2400) / 60,
        expectedNight: nightMinutes / 60,
    };
}

describe('scheduleSalaryCalculator', () => {
    it('기준시급 10,320·5인 미만·주5일·일 11h — BE 수용 테스트 수치와 일치한다', () => {
        const result = calculateScheduleSalary({
            schedule: ELEVEN_HOUR_DAYS_5,
            baseHourlyWage: 10_320,
            fiveOrMoreEmployees: false,
        });

        expect(result.workingDays).toBe(5);
        expect(result.weeklyActualHours).toBe(55);
        expect(result.weeklyContractedHours).toBe(40); // §50 상한
        expect(result.weeklyOvertimeHours).toBe(15); // max(5×3h, 55−40)
        expect(result.monthlyStandardHours).toBe(209); // 주 40h → 209h(주휴 내재)
        expect(result.monthlyBaseSalary).toBe(2_156_880);
        expect(result.ordinaryHourlyWage).toBe(10_320); // 정수곱 구조 — 통상시급 == 기준시급
        expect(result.overtimePay).toBe(672_643); // 15h × 4.345238 × 10,320 × 1.0(5인 미만)
        expect(result.nightPremiumPay).toBe(0);
        expect(result.expectedMonthlyWage).toBe(2_829_523);
        expect(result.annualizedWage).toBe(33_954_276);
    });

    it('주6일(토 추가)이면 주 기준 연장(66−40=26h)이 일 기준(18h)보다 커서 연장이 26h로 잡힌다', () => {
        const result = calculateScheduleSalary({
            schedule: [...ELEVEN_HOUR_DAYS_5, day('SATURDAY', '10:00', '21:00')],
            baseHourlyWage: 10_320,
            fiveOrMoreEmployees: false,
        });

        expect(result.weeklyActualHours).toBe(66);
        expect(result.weeklyOvertimeHours).toBe(26); // max(6×3h=18, 66−40=26) — 이중계상 금지
        expect(result.monthlyBaseSalary).toBe(2_156_880);
        expect(result.overtimePay).toBe(1_165_914);
        expect(result.expectedMonthlyWage).toBe(3_322_794);
        expect(result.annualizedWage).toBe(39_873_528);
    });

    it('자정넘김(20:00~05:00)은 익일 종료로 해석하고 야간(22~06시) 교집합에서 휴게 겹침을 차감한다', () => {
        const noBreak = weeklyStatsFromSchedule([day('SATURDAY', '20:00', '05:00')]);
        expect(noBreak.weeklyActualHours).toBe(9);
        expect(noBreak.weeklyNightHours).toBe(7); // 22:00~05:00

        const withBreak = weeklyStatsFromSchedule([
            day('SATURDAY', '20:00', '05:00', '00:00', '01:00'), // 휴게가 자정 이후 — 익일 사상
        ]);
        expect(withBreak.weeklyActualHours).toBe(8);
        expect(withBreak.weeklyNightHours).toBe(6); // 야간대 휴게 1h 차감
        expect(withBreak.dailyWorkedHours.SATURDAY).toBe(8);

        // 5인 이상이면 야간 0.5배 가산: 6h × 4.345238 × 10,000 × 0.5
        const paid = calculateScheduleSalary({
            schedule: [day('SATURDAY', '20:00', '05:00', '00:00', '01:00')],
            baseHourlyWage: 10_000,
            fiveOrMoreEmployees: true,
        });
        expect(paid.nightPremiumPay).toBe(130_357);
    });

    it('주 소정 15h 미만이면 주휴 0으로 월 기준시간을 환산한다(§18③)', () => {
        const result = calculateScheduleSalary({
            schedule: [day('MONDAY', '10:00', '16:00'), day('TUESDAY', '10:00', '16:00')], // 주 12h
            baseHourlyWage: 10_000,
            fiveOrMoreEmployees: false,
        });

        expect(result.weeklyContractedHours).toBe(12);
        expect(result.monthlyStandardHours).toBe(52); // round(12 × 4.345238) — 주휴 없음
        expect(result.monthlyBaseSalary).toBe(520_000);
        expect(result.weeklyOvertimeHours).toBe(0);
        expect(result.expectedMonthlyWage).toBe(520_000);
    });

    it('휴게 시각을 한쪽만 입력하면 구조 오류로 거부한다', () => {
        expect(() =>
            weeklyStatsFromSchedule([day('MONDAY', '10:00', '18:00', '12:00', null)]),
        ).toThrow('월요일 휴게 시작·종료 시각은 함께 입력해야 합니다.');
    });

    it('휴게가 근무시간 밖이면 거부한다', () => {
        expect(() =>
            weeklyStatsFromSchedule([day('MONDAY', '10:00', '12:00', '13:00', '14:00')]),
        ).toThrow(/휴게시간.*밖에 있습니다/);
    });

    it('정규직 월급제 스케줄 5,000개 조합을 검증한다', () => {
        let legalCases = 0;
        let illegalCases = 0;

        for (let caseNo = 0; caseNo < CASE_COUNT; caseNo += 1) {
            const {schedule, expectedActual, expectedOvertime, expectedNight} = generatedCase(caseNo);
            const baseHourlyWage = 9_000 + ((caseNo * 137) % 8_000);
            const fiveOrMoreEmployees = caseNo % 2 === 0;
            const probationWageRate = caseNo % 5 === 0 ? 0.9 : 1;
            const result = calculateScheduleSalary({
                schedule,
                baseHourlyWage,
                fiveOrMoreEmployees,
                minimumHourlyWage: MINIMUM_WAGE_2026,
                probationWageRate,
            });

            const expectedContracted = Math.min(expectedActual, 40);
            const expectedMonthlyStandardHours = (() => {
                const weeklyHoliday = expectedContracted < 15
                    ? 0
                    : Math.min(8, (expectedContracted / 40) * 8);
                return Math.round((expectedContracted + weeklyHoliday) * EXACT_AVG_WEEKS_PER_MONTH);
            })();
            const expectedMonthlyOvertime = expectedOvertime * EXACT_AVG_WEEKS_PER_MONTH;
            const expectedMonthlyNight = expectedNight * EXACT_AVG_WEEKS_PER_MONTH;
            const expectedOvertimePay = Math.round(
                baseHourlyWage * expectedMonthlyOvertime * (fiveOrMoreEmployees ? 1.5 : 1.0),
            );
            const expectedNightPremiumPay = Math.round(
                baseHourlyWage * expectedMonthlyNight * (fiveOrMoreEmployees ? 0.5 : 0),
            );
            const expectedMonthlyBaseSalary = baseHourlyWage * expectedMonthlyStandardHours;
            const expectedMonthlyWage = expectedMonthlyBaseSalary + expectedOvertimePay + expectedNightPremiumPay;
            const requiredMonthlyBaseSalary = Math.ceil(
                MINIMUM_WAGE_2026 * probationWageRate * expectedMonthlyStandardHours,
            );
            const legallyCompliant = expectedMonthlyBaseSalary >= requiredMonthlyBaseSalary;

            if (legallyCompliant) {
                legalCases += 1;
            } else {
                illegalCases += 1;
            }

            expect(result.workingDays).toBe(schedule.length);
            expect(result.weeklyActualHours).toBeCloseTo(expectedActual, 10);
            expect(result.weeklyContractedHours).toBeCloseTo(expectedContracted, 10);
            expect(result.weeklyOvertimeHours).toBeCloseTo(expectedOvertime, 10);
            expect(result.weeklyNightHours).toBeCloseTo(expectedNight, 10);
            expect(result.monthlyStandardHours).toBe(expectedMonthlyStandardHours);
            expect(result.monthlyOvertimeHours).toBeCloseTo(expectedMonthlyOvertime, 10);
            expect(result.monthlyNightHours).toBeCloseTo(expectedMonthlyNight, 10);
            expect(result.monthlyBaseSalary).toBe(expectedMonthlyBaseSalary);
            expect(result.ordinaryHourlyWage).toBe(baseHourlyWage);
            expect(result.overtimePay).toBe(expectedOvertimePay);
            expect(result.nightPremiumPay).toBe(expectedNightPremiumPay);
            expect(result.expectedMonthlyWage).toBe(expectedMonthlyWage);
            expect(result.annualizedWage).toBe(expectedMonthlyWage * 12);
            expect(result.minimumWageCompliant).toBe(legallyCompliant);
        }

        expect(legalCases).toBeGreaterThan(0);
        expect(illegalCases).toBeGreaterThan(0);
        expect(legalCases + illegalCases).toBe(CASE_COUNT);
    });
});
