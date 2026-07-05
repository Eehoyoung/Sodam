export type ContractPayType = 'HOURLY' | 'SALARY';
export type SalaryPayUnit = 'MONTHLY' | 'ANNUAL';

const STATUTORY_WEEKLY_HOURS = 40;
const STATUTORY_DAILY_HOURS = 8;
const WEEKLY_ALLOWANCE_THRESHOLD = 15;
const WEEKS_PER_MONTH = 365 / 7 / 12;

export interface SalaryContractInput {
    salaryAmount: number;
    salaryPayUnit: SalaryPayUnit;
    contractedHoursPerWeek: number;
    fixedOvertimeHoursPerMonth?: number;
    fixedNightHoursPerMonth?: number;
    fixedHolidayHoursWithin8PerMonth?: number;
    fixedHolidayHoursOver8PerMonth?: number;
    fiveOrMoreEmployees: boolean;
    minimumHourlyWage?: number;
    probationWageRate?: number;
}

export interface SalaryContractBreakdown {
    monthlyBaseSalary: number;
    monthlyStandardHours: number;
    weeklyPaidHolidayHours: number;
    ordinaryHourlyWage: number;
    overtimePay: number;
    nightPremiumPay: number;
    holidayPay: number;
    totalMonthlyWage: number;
    annualizedWage: number;
    minimumWageCompliant: boolean;
}

export function calculateWeeklyPaidHolidayHours(contractedHoursPerWeek: number): number {
    if (contractedHoursPerWeek < WEEKLY_ALLOWANCE_THRESHOLD) {
        return 0;
    }
    return Math.min(STATUTORY_DAILY_HOURS, (Math.min(contractedHoursPerWeek, STATUTORY_WEEKLY_HOURS) / STATUTORY_WEEKLY_HOURS) * STATUTORY_DAILY_HOURS);
}

export function calculateMonthlyStandardHours(contractedHoursPerWeek: number): number {
    const weeklyRegularHours = Math.min(Math.max(contractedHoursPerWeek, 0), STATUTORY_WEEKLY_HOURS);
    const weeklyPaidHolidayHours = calculateWeeklyPaidHolidayHours(weeklyRegularHours);
    return Math.round((weeklyRegularHours + weeklyPaidHolidayHours) * WEEKS_PER_MONTH);
}

export function calculateSalaryContract(input: SalaryContractInput): SalaryContractBreakdown {
    const salaryAmount = Math.max(0, input.salaryAmount || 0);
    const monthlyBaseSalary = input.salaryPayUnit === 'ANNUAL'
        ? Math.round(salaryAmount / 12)
        : Math.round(salaryAmount);
    const monthlyStandardHours = Math.max(1, calculateMonthlyStandardHours(input.contractedHoursPerWeek));
    const ordinaryHourlyWage = Math.round(monthlyBaseSalary / monthlyStandardHours);
    const overtimeHours = Math.max(0, input.fixedOvertimeHoursPerMonth ?? 0);
    const nightHours = Math.max(0, input.fixedNightHoursPerMonth ?? 0);
    const holidayWithin8Hours = Math.max(0, input.fixedHolidayHoursWithin8PerMonth ?? 0);
    const holidayOver8Hours = Math.max(0, input.fixedHolidayHoursOver8PerMonth ?? 0);

    const overtimeMultiplier = input.fiveOrMoreEmployees ? 1.5 : 1.0;
    const nightPremiumMultiplier = input.fiveOrMoreEmployees ? 0.5 : 0.0;
    const holidayWithin8Multiplier = input.fiveOrMoreEmployees ? 1.5 : 1.0;
    const holidayOver8Multiplier = input.fiveOrMoreEmployees ? 2.0 : 1.0;

    const overtimePay = Math.round(ordinaryHourlyWage * overtimeHours * overtimeMultiplier);
    const nightPremiumPay = Math.round(ordinaryHourlyWage * nightHours * nightPremiumMultiplier);
    const holidayPay = Math.round(
        ordinaryHourlyWage * holidayWithin8Hours * holidayWithin8Multiplier
        + ordinaryHourlyWage * holidayOver8Hours * holidayOver8Multiplier,
    );
    const totalMonthlyWage = monthlyBaseSalary + overtimePay + nightPremiumPay + holidayPay;
    const minimumHourlyWage = input.minimumHourlyWage ?? 0;
    const minimumWageRate = input.probationWageRate && input.probationWageRate > 0
        ? input.probationWageRate
        : 1;

    return {
        monthlyBaseSalary,
        monthlyStandardHours,
        weeklyPaidHolidayHours: calculateWeeklyPaidHolidayHours(input.contractedHoursPerWeek),
        ordinaryHourlyWage,
        overtimePay,
        nightPremiumPay,
        holidayPay,
        totalMonthlyWage,
        annualizedWage: totalMonthlyWage * 12,
        minimumWageCompliant: !minimumHourlyWage || ordinaryHourlyWage >= Math.ceil(minimumHourlyWage * minimumWageRate),
    };
}

export function formatWon(value: number): string {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

export function buildSalaryWageComponents(
    breakdown: SalaryContractBreakdown,
    salaryPayUnit: SalaryPayUnit,
    fiveOrMoreEmployees: boolean,
): string {
    const premiumText = fiveOrMoreEmployees
        ? '상시근로자 5인 이상 사업장 기준으로 연장 1.5배, 야간 0.5배 가산분, 휴일 8시간 이내 1.5배/초과 2.0배를 적용합니다.'
        : '상시근로자 5인 미만 사업장 기준으로 연장·야간·휴일 가산분은 적용하지 않고, 실제 추가 근로시간의 기본임금은 별도 산정합니다.';

    return [
        `${salaryPayUnit === 'ANNUAL' ? '연봉제' : '월급제'} 기본급 ${formatWon(breakdown.monthlyBaseSalary)}(월 환산, 주휴 포함)`,
        `통상시급 ${formatWon(breakdown.ordinaryHourlyWage)} = 월 기본급 ÷ 월 통상임금 산정 기준시간 ${breakdown.monthlyStandardHours}시간`,
        `고정 연장수당 ${formatWon(breakdown.overtimePay)}, 야간가산수당 ${formatWon(breakdown.nightPremiumPay)}, 휴일근로수당 ${formatWon(breakdown.holidayPay)}`,
        `예상 월 지급액 ${formatWon(breakdown.totalMonthlyWage)} / 연 환산 ${formatWon(breakdown.annualizedWage)}`,
        premiumText,
    ].join('\n');
}
