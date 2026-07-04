package com.rich.sodam.core.payroll.wage;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;

/**
 * 월급제 급여 계산기 — 통상시급 환산 + 기간 일할(日割) 기본급 산정. 단일 책임(SRP).
 *
 * <p><b>통상시급 환산 (근로기준법 시행령 §6②)</b>:
 * 통상시급 = 월급 ÷ 월 통상임금 산정 기준시간. 주 40시간(주 5일·일 8시간) 근로자의 기준시간은
 * <b>209시간</b> = (소정 40h + 유급주휴 8h) × 월평균 주수 4.345주(= 365÷7÷12) — 즉 소정 174h + 주휴 35h.
 * 따라서 <b>주휴수당은 월급에 이미 포함</b>되어 있으며(별도 가산 금지 — 이중지급),
 * 연장·야간·휴일 가산(§56)과 결근·지각 공제의 기준 단가는 모두 이 통상시급이다.
 * {@code contractedWeeklyDays} 약정이 있으면 단시간 근로자 기준시간으로 정교화한다
 * (§18① 비례 원칙: 주 소정 = min(약정일 × 일 소정, 40h), 주휴 = min(주 소정/40 × 8, 8h)).</p>
 *
 * <p><b>일할계산 (중도 입사·퇴사·불완전 정산기간)</b>:
 * 고용노동부 행정해석(근로기준정책과-2432, 2015.6.10 / 근기 68207-690)은
 * "월급 ÷ 해당월 역일수 × 재직 역일수" 방식과 "월급 ÷ 소정근로일수(유급일 포함) × 근무일수" 방식을
 * 모두 인정한다. 본 구현은 <b>역일수(달력일수) 방식</b>을 채택한다 — 실무 표준이고, 소정근로일
 * 데이터(시프트) 없이도 결정적으로 계산되며, 무급 주휴 논쟁 없이 재직기간에 비례한다.
 * 단, 완전 재직한 1개월 정산주기(예: 전월 25일~당월 24일)는 역일수 편차로 과·부족이 생기지 않도록
 * <b>월급 전액</b>을 지급한다(월급제의 정의 — 월의 대소와 무관하게 고정 월급. 근기 68207-690).</p>
 *
 * <p>반올림: 통상시급·금액 모두 원 단위 HALF_UP — 기존 코어({@code Math.round}) 규칙과 동일.</p>
 */
@Component
public class MonthlySalaryCalculator {

    /** 주 40시간제 월 통상임금 산정 기준시간(시행령 §6②). (40h + 주휴 8h) × 4.345주 ≈ 209h. */
    public static final BigDecimal STANDARD_MONTHLY_HOURS = new BigDecimal("209");

    /** 월평균 주수 = 365일 ÷ 7일 ÷ 12개월 ≈ 4.345 (고용노동부 산정 관행). */
    private static final BigDecimal AVG_WEEKS_PER_MONTH = new BigDecimal("4.345");

    private static final BigDecimal STATUTORY_WEEKLY_HOURS = new BigDecimal("40");
    private static final BigDecimal STATUTORY_DAILY_HOURS = new BigDecimal("8");

    /**
     * 통상시급(원, HALF_UP). 가산수당(§56)·결근/지각 공제의 기준 단가.
     *
     * @param monthlySalary        월급(원)
     * @param contractedWeeklyDays 1주 소정근로일 수(null 이면 주 5일=209h 기준)
     * @param regularHoursPerDay   1일 소정근로시간(보통 8h)
     */
    public int ordinaryHourlyWage(int monthlySalary, Integer contractedWeeklyDays, double regularHoursPerDay) {
        return BigDecimal.valueOf(monthlySalary)
                .divide(monthlyStandardHours(contractedWeeklyDays, regularHoursPerDay), 0, RoundingMode.HALF_UP)
                .intValue();
    }

    /**
     * 월 통상임금 산정 기준시간. 주 5일(또는 미설정)이면 법정 209h,
     * 그 외에는 (주 소정 + 비례 주휴) × 4.345주를 시간 단위 HALF_UP.
     * 예) 주 3일·일 8h → (24 + 4.8) × 4.345 = 125.136 → 125h.
     */
    public BigDecimal monthlyStandardHours(Integer contractedWeeklyDays, double regularHoursPerDay) {
        if (contractedWeeklyDays == null || contractedWeeklyDays <= 0) {
            return STANDARD_MONTHLY_HOURS;
        }
        // 주 소정근로시간 = min(약정일수 × 일 소정, 법정 40h) — §50 상한
        BigDecimal weeklyContracted = BigDecimal.valueOf(contractedWeeklyDays)
                .multiply(BigDecimal.valueOf(regularHoursPerDay))
                .min(STATUTORY_WEEKLY_HOURS);
        // 주휴시간 = min(주 소정/40 × 8, 8h) — §55·§18③ 비례
        BigDecimal weeklyHoliday = weeklyContracted
                .divide(STATUTORY_WEEKLY_HOURS, 10, RoundingMode.HALF_UP)
                .multiply(STATUTORY_DAILY_HOURS)
                .min(STATUTORY_DAILY_HOURS);
        BigDecimal hours = weeklyContracted.add(weeklyHoliday)
                .multiply(AVG_WEEKS_PER_MONTH)
                .setScale(0, RoundingMode.HALF_UP);
        // 주 40h(5·6일제)는 법정 관행값 209h와 일치: (40+8)×4.345=208.56→209
        return hours;
    }

    /**
     * 정산기간 기본급(일할 적용, 원 단위 HALF_UP).
     *
     * <ul>
     *   <li>완전 재직 + 정산기간이 정확히 1개월 주기(시작일 ~ 시작일+1개월-1일, 말일 주기 포함)
     *       → <b>월급 전액</b> (역일수 편차 과·부족 방지)</li>
     *   <li>그 외(중도 입사, 부분 기간 정산 등) → 달력월별로
     *       월급 × (해당월 내 재직 역일수 ÷ 해당월 역일수) 합산 — 행정해석 역일수 방식</li>
     * </ul>
     *
     * @param hireDate 입사일(매장별). 기간 시작보다 늦으면 그날부터 기산. null 이면 기간 전체 재직 간주.
     */
    public int proratedBaseSalary(int monthlySalary, LocalDate periodStart, LocalDate periodEnd, LocalDate hireDate) {
        if (periodEnd.isBefore(periodStart)) {
            return 0;
        }
        LocalDate effectiveStart = (hireDate != null && hireDate.isAfter(periodStart)) ? hireDate : periodStart;
        if (effectiveStart.isAfter(periodEnd)) {
            return 0; // 기간 내 재직 없음
        }
        // 완전 재직 1개월 주기(1일~말일, 25일~익월 24일 등) — 월급 전액.
        // plusMonths 는 말일을 자동 보정하므로 2/1~2/28(윤년 2/29)도 정확히 판정된다.
        if (effectiveStart.equals(periodStart)
                && periodEnd.equals(periodStart.plusMonths(1).minusDays(1))) {
            return monthlySalary;
        }
        // 달력월별 역일수 일할 합산
        BigDecimal sum = BigDecimal.ZERO;
        YearMonth month = YearMonth.from(effectiveStart);
        YearMonth lastMonth = YearMonth.from(periodEnd);
        while (!month.isAfter(lastMonth)) {
            LocalDate monthStart = month.atDay(1);
            LocalDate monthEnd = month.atEndOfMonth();
            LocalDate from = effectiveStart.isAfter(monthStart) ? effectiveStart : monthStart;
            LocalDate to = periodEnd.isBefore(monthEnd) ? periodEnd : monthEnd;
            long employedDays = ChronoUnit.DAYS.between(from, to) + 1;
            sum = sum.add(BigDecimal.valueOf(monthlySalary)
                    .multiply(BigDecimal.valueOf(employedDays))
                    .divide(BigDecimal.valueOf(month.lengthOfMonth()), 10, RoundingMode.HALF_UP));
            month = month.plusMonths(1);
        }
        return sum.setScale(0, RoundingMode.HALF_UP).intValue();
    }
}
