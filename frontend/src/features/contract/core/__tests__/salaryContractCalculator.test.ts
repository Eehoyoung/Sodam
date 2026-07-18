import {
    calculateMonthlyStandardHours,
    calculateSalaryContract,
} from '../salaryContractCalculator';

const CASE_COUNT = 5000;
const MINIMUM_WAGE_2026 = 10_320;

describe('salaryContractCalculator', () => {
    it('주 40시간 월급제는 주휴 포함 209시간으로 통상시급을 환산한다', () => {
        const result = calculateSalaryContract({
            salaryAmount: 2_156_880,
            salaryPayUnit: 'MONTHLY',
            contractedHoursPerWeek: 40,
            fiveOrMoreEmployees: true,
            minimumHourlyWage: MINIMUM_WAGE_2026,
        });

        expect(calculateMonthlyStandardHours(40)).toBe(209);
        expect(result.minimumRequiredMonthlyBaseSalary).toBe(2_156_880);
        expect(result.ordinaryHourlyWage).toBe(MINIMUM_WAGE_2026);
        expect(result.minimumWageCompliant).toBe(true);
    });

    it('월급제 최저임금은 반올림 통상시급이 아니라 월 기본급 법정 하한으로 판정한다', () => {
        const result = calculateSalaryContract({
            salaryAmount: 2_156_879,
            salaryPayUnit: 'MONTHLY',
            contractedHoursPerWeek: 40,
            fiveOrMoreEmployees: true,
            minimumHourlyWage: MINIMUM_WAGE_2026,
        });

        expect(result.ordinaryHourlyWage).toBe(MINIMUM_WAGE_2026);
        expect(result.minimumRequiredMonthlyBaseSalary).toBe(2_156_880);
        expect(result.minimumWageCompliant).toBe(false);
    });

    it('5인 미만 사업장은 연장 기본임금은 계산하되 야간 가산분은 제외한다', () => {
        const result = calculateSalaryContract({
            salaryAmount: 2_156_880,
            salaryPayUnit: 'MONTHLY',
            contractedHoursPerWeek: 40,
            fixedOvertimeHoursPerMonth: 10,
            fixedNightHoursPerMonth: 10,
            fiveOrMoreEmployees: false,
        });

        expect(result.overtimePay).toBe(103_200);
        expect(result.nightPremiumPay).toBe(0);
    });

    it('5인 이상 사업장은 연장·야간·휴일 법정 가산수당을 월급에 더한다', () => {
        const result = calculateSalaryContract({
            salaryAmount: 2_156_880,
            salaryPayUnit: 'MONTHLY',
            contractedHoursPerWeek: 40,
            fixedOvertimeHoursPerMonth: 10,
            fixedNightHoursPerMonth: 8,
            fixedHolidayHoursWithin8PerMonth: 4,
            fixedHolidayHoursOver8PerMonth: 2,
            fiveOrMoreEmployees: true,
            minimumHourlyWage: MINIMUM_WAGE_2026,
        });

        expect(result.overtimePay).toBe(154_800);
        expect(result.nightPremiumPay).toBe(41_280);
        expect(result.holidayPay).toBe(103_200);
        expect(result.totalMonthlyWage).toBe(2_456_160);
        expect(result.minimumWageCompliant).toBe(true);
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

    it('정규직 월급제 5,000개 조합이 법정 최저 월 기본급 통과/미달을 정확히 판정한다', () => {
        let legalCases = 0;
        let illegalCases = 0;

        for (let caseNo = 0; caseNo < CASE_COUNT; caseNo += 1) {
            const contractedHoursPerWeek = 1 + ((caseNo * 7) % 520) / 10;
            const monthlyStandardHours = Math.max(1, calculateMonthlyStandardHours(contractedHoursPerWeek));
            const probationWageRate = caseNo % 5 === 0 ? 0.9 : 1;
            const requiredMonthlyBaseSalary = Math.ceil(
                MINIMUM_WAGE_2026 * probationWageRate * monthlyStandardHours,
            );
            const legalSalary = requiredMonthlyBaseSalary + ((caseNo * 31) % 300_000);
            const illegalSalary = Math.max(1, requiredMonthlyBaseSalary - 1 - ((caseNo * 17) % 5_000));
            const salaryAmount = caseNo % 4 === 0 ? illegalSalary : legalSalary;
            const fixedOvertimeHoursPerMonth = (caseNo * 3) % 40;
            const fixedNightHoursPerMonth = (caseNo * 5) % 30;
            const fixedHolidayHoursWithin8PerMonth = caseNo % 9;
            const fixedHolidayHoursOver8PerMonth = caseNo % 4;
            const fiveOrMoreEmployees = caseNo % 2 === 0;

            const result = calculateSalaryContract({
                salaryAmount,
                salaryPayUnit: 'MONTHLY',
                contractedHoursPerWeek,
                fixedOvertimeHoursPerMonth,
                fixedNightHoursPerMonth,
                fixedHolidayHoursWithin8PerMonth,
                fixedHolidayHoursOver8PerMonth,
                fiveOrMoreEmployees,
                minimumHourlyWage: MINIMUM_WAGE_2026,
                probationWageRate,
            });

            const ordinaryHourlyWage = Math.round(salaryAmount / monthlyStandardHours);
            const expectedOvertimePay = Math.round(
                ordinaryHourlyWage * fixedOvertimeHoursPerMonth * (fiveOrMoreEmployees ? 1.5 : 1.0),
            );
            const expectedNightPay = Math.round(
                ordinaryHourlyWage * fixedNightHoursPerMonth * (fiveOrMoreEmployees ? 0.5 : 0),
            );
            const expectedHolidayPay = Math.round(
                ordinaryHourlyWage * fixedHolidayHoursWithin8PerMonth * (fiveOrMoreEmployees ? 1.5 : 1.0)
                + ordinaryHourlyWage * fixedHolidayHoursOver8PerMonth * (fiveOrMoreEmployees ? 2.0 : 1.0),
            );
            const legallyCompliant = salaryAmount >= requiredMonthlyBaseSalary;

            if (legallyCompliant) {
                legalCases += 1;
            } else {
                illegalCases += 1;
            }

            expect(result.monthlyStandardHours).toBe(monthlyStandardHours);
            expect(result.minimumRequiredMonthlyBaseSalary).toBe(requiredMonthlyBaseSalary);
            expect(result.ordinaryHourlyWage).toBe(ordinaryHourlyWage);
            expect(result.overtimePay).toBe(expectedOvertimePay);
            expect(result.nightPremiumPay).toBe(expectedNightPay);
            expect(result.holidayPay).toBe(expectedHolidayPay);
            expect(result.totalMonthlyWage).toBe(
                salaryAmount + expectedOvertimePay + expectedNightPay + expectedHolidayPay,
            );
            expect(result.minimumWageCompliant).toBe(legallyCompliant);
        }

        expect(legalCases).toBeGreaterThan(0);
        expect(illegalCases).toBeGreaterThan(0);
        expect(legalCases + illegalCases).toBe(CASE_COUNT);
    });
});
