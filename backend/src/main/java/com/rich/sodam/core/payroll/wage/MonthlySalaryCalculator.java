package com.rich.sodam.core.payroll.wage;

import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
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

    /**
     * 월평균 주수 정밀값(365÷7÷12 = 4.345238…). 주 소정근로시간 약정 경로 전용 —
     * 근로계약서 정규화({@code LaborContractService.SALARY_WEEKS_PER_MONTH}와 동일)와
     * 산식을 비트 단위로 일치시켜 계약서 통상시급 == 명세서 통상시급을 보장한다.
     * (소정근로일수 폴백 경로는 기존 관행값 4.345 유지 — 209h 회귀 금지)
     */
    private static final double EXACT_AVG_WEEKS_PER_MONTH = 365.0 / 7.0 / 12.0;

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
     * 통상시급(원, HALF_UP) — 주 소정근로시간 약정(근로계약서 전파값) 우선.
     *
     * <p>단시간 월급제(예: 주 5일·일 4h=주 20h)에서 소정근로일수 폴백은 일 8h를 가정해
     * 기준시간이 209h로 과대해지고 통상시급이 계약서의 절반이 되는 버그가 있었다(§56 가산·
     * 결근 공제 과소). 주 소정근로시간이 있으면 계약서와 동일 산식(주 20h → 104h)을 쓴다.</p>
     *
     * @param contractedWeeklyHours 1주 소정근로시간 약정(null/0 이하면 weeklyDays 폴백)
     */
    public int ordinaryHourlyWage(int monthlySalary, Double contractedWeeklyHours,
                                  Integer contractedWeeklyDays, double regularHoursPerDay) {
        return BigDecimal.valueOf(monthlySalary)
                .divide(monthlyStandardHours(contractedWeeklyHours, contractedWeeklyDays, regularHoursPerDay),
                        0, RoundingMode.HALF_UP)
                .intValue();
    }

    /**
     * 월 통상임금 산정 기준시간 — 주 소정근로시간 약정 우선, 없으면 소정근로일수 폴백.
     * {@link #monthlyStandardHoursForWeeklyHours(double)} 참고.
     */
    public BigDecimal monthlyStandardHours(Double contractedWeeklyHours,
                                           Integer contractedWeeklyDays, double regularHoursPerDay) {
        if (contractedWeeklyHours != null && contractedWeeklyHours > 0) {
            return BigDecimal.valueOf(monthlyStandardHoursForWeeklyHours(contractedWeeklyHours));
        }
        return monthlyStandardHours(contractedWeeklyDays, regularHoursPerDay);
    }

    /**
     * 주 소정근로시간 약정 기반 월 통상임금 산정 기준시간(시간 단위 반올림).
     *
     * <p><b>근로계약서 정규화와 단일 산식</b> — {@code LaborContractService} 의 월급제 정규화가
     * 이 메서드에 위임하므로, 계약서에 기재되는 통상시급과 정산(명세서)의 통상시급이 항상 일치한다.
     * 산식: (주 소정 + 주휴) × 4.345238주(365÷7÷12), Math.round.
     * 예) 주 20h → (20 + 4) × 4.345238 = 104.29 → 104h / 주 40h → 48 × 4.345238 = 208.57 → 209h.</p>
     *
     * <p><b>15시간 미만 주휴 0 (§18③)</b>: 1주 소정근로시간 15시간 미만 단시간 근로자는
     * §55(주휴일)가 적용되지 않으므로 주휴시간을 0으로 둔다 — 계약서 경로
     * ({@code LaborContractService.weeklyAllowanceHours})와 동일 규칙. 소정근로일수 폴백 경로
     * ({@link #monthlyStandardHours(Integer, double)})는 비례 주휴만 두고 15h 컷이 없지만,
     * 새 경로는 계약↔명세서 일치를 우선해 계약서 규칙을 따른다(회귀 방지 위해 폴백은 불변).</p>
     */
    public static int monthlyStandardHoursForWeeklyHours(double contractedWeeklyHours) {
        // 주 소정 = min(약정, 법정 40h) — §50 상한
        double weekly = Math.min(contractedWeeklyHours,
                LaborLawConstants.STATUTORY_WEEKLY_HOURS.doubleValue());
        // 주휴 = 15h 미만 0 (§18③) / 이상 min(주 소정/40 × 8, 8h) (§55·§18① 비례)
        double holiday = weekly < LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE.doubleValue()
                ? 0.0
                : Math.min(LaborLawConstants.MAX_WEEKLY_ALLOWANCE_HOURS.doubleValue(),
                weekly / LaborLawConstants.STATUTORY_WEEKLY_HOURS.doubleValue()
                        * LaborLawConstants.STATUTORY_DAILY_HOURS.doubleValue());
        return (int) Math.round((weekly + holiday) * EXACT_AVG_WEEKS_PER_MONTH);
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
