import {
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
});
