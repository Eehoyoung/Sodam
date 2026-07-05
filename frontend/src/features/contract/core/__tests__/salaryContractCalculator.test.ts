import {
    calculateMonthlyStandardHours,
    calculateSalaryContract,
} from '../salaryContractCalculator';

describe('salaryContractCalculator', () => {
    it('주 40시간 월급제는 주휴 포함 209시간으로 통상시급을 환산한다', () => {
        const result = calculateSalaryContract({
            salaryAmount: 2_090_000,
            salaryPayUnit: 'MONTHLY',
            contractedHoursPerWeek: 40,
            fiveOrMoreEmployees: true,
            minimumHourlyWage: 10_000,
        });

        expect(calculateMonthlyStandardHours(40)).toBe(209);
        expect(result.ordinaryHourlyWage).toBe(10_000);
        expect(result.minimumWageCompliant).toBe(true);
    });

    it('5인 미만 사업장은 연장 기본임금은 계산하되 야간 가산분은 제외한다', () => {
        const result = calculateSalaryContract({
            salaryAmount: 2_090_000,
            salaryPayUnit: 'MONTHLY',
            contractedHoursPerWeek: 40,
            fixedOvertimeHoursPerMonth: 10,
            fixedNightHoursPerMonth: 10,
            fiveOrMoreEmployees: false,
        });

        expect(result.overtimePay).toBe(100_000);
        expect(result.nightPremiumPay).toBe(0);
    });

    it('연봉제는 12개월로 나눈 월 기본급을 기준으로 계산한다', () => {
        const result = calculateSalaryContract({
            salaryAmount: 36_000_000,
            salaryPayUnit: 'ANNUAL',
            contractedHoursPerWeek: 40,
            fiveOrMoreEmployees: true,
        });

        expect(result.monthlyBaseSalary).toBe(3_000_000);
        expect(result.annualizedWage).toBe(result.totalMonthlyWage * 12);
    });
});
