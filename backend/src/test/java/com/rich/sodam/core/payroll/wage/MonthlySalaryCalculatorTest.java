package com.rich.sodam.core.payroll.wage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 월급제 계산기 경계값 테스트.
 *
 * <p>검증 기준:
 * <ul>
 *   <li>통상시급 = 월급 ÷ 209h (근로기준법 시행령 §6②, 주 40h 근로자)</li>
 *   <li>일할계산 = 월급 ÷ 해당월 역일수 × 재직 역일수 (고용노동부 행정해석 방식),
 *       완전 재직 1개월 주기는 월급 전액</li>
 * </ul></p>
 */
class MonthlySalaryCalculatorTest {

    private final MonthlySalaryCalculator calculator = new MonthlySalaryCalculator();

    @Nested
    @DisplayName("통상시급 환산")
    class OrdinaryHourlyWage {

        @Test
        @DisplayName("월 220만원 ÷ 209h = 10,526원 (HALF_UP)")
        void standard209() {
            // 2,200,000 / 209 = 10,526.315... → 10,526
            assertThat(calculator.ordinaryHourlyWage(2_200_000, null, 8.0)).isEqualTo(10_526);
        }

        @Test
        @DisplayName("주 5일 약정은 미설정(null)과 동일하게 209h 기준")
        void fiveDaysEquals209() {
            assertThat(calculator.ordinaryHourlyWage(2_200_000, 5, 8.0))
                    .isEqualTo(calculator.ordinaryHourlyWage(2_200_000, null, 8.0));
        }

        @Test
        @DisplayName("월 기준시간: 주5일=209h, 주6일도 40h 캡으로 209h, 주3일=125h")
        void monthlyStandardHours() {
            assertThat(calculator.monthlyStandardHours(5, 8.0)).isEqualByComparingTo(new BigDecimal("209"));
            assertThat(calculator.monthlyStandardHours(null, 8.0)).isEqualByComparingTo(new BigDecimal("209"));
            // 주 6일 × 8h = 48h → 법정 40h 캡 → 209h
            assertThat(calculator.monthlyStandardHours(6, 8.0)).isEqualByComparingTo(new BigDecimal("209"));
            // 주 3일 × 8h = 24h + 비례주휴 4.8h = 28.8h × 4.345주 = 125.136 → 125h
            assertThat(calculator.monthlyStandardHours(3, 8.0)).isEqualByComparingTo(new BigDecimal("125"));
        }

        @Test
        @DisplayName("단시간(주3일) 월급제 통상시급 = 월급 ÷ 125h")
        void partTimeOrdinaryWage() {
            // 1,300,000 / 125 = 10,400
            assertThat(calculator.ordinaryHourlyWage(1_300_000, 3, 8.0)).isEqualTo(10_400);
        }
    }

    @Nested
    @DisplayName("주 소정근로시간 약정 경로 (근로계약서와 동일 산식 — V37)")
    class WeeklyHoursPath {

        @Test
        @DisplayName("주 20h(일 4h·주 5일) → 기준시간 104h — 계약서와 동일, 209h 아님")
        void twentyHoursGives104() {
            // (20 + 주휴 4) × 4.345238 = 104.2857 → 104
            assertThat(MonthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(20.0)).isEqualTo(104);
            assertThat(calculator.monthlyStandardHours(20.0, 5, 8.0))
                    .isEqualByComparingTo(new BigDecimal("104"));
        }

        @Test
        @DisplayName("주 20h 월급 100만 → 통상시급 9,615원 (100만÷104h) — 종전 209h 분모(4,785원)의 2배 정상화")
        void twentyHoursOrdinaryWageMatchesContract() {
            // 1,000,000 / 104 = 9,615.38 → 9,615
            assertThat(calculator.ordinaryHourlyWage(1_000_000, 20.0, 5, 8.0)).isEqualTo(9_615);
        }

        @Test
        @DisplayName("주 40h → 209h — 법정 관행값과 일치(전일제 회귀 없음)")
        void fortyHoursGives209() {
            // (40 + 8) × 4.345238 = 208.57 → 209
            assertThat(MonthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(40.0)).isEqualTo(209);
            assertThat(calculator.ordinaryHourlyWage(2_200_000, 40.0, null, 8.0)).isEqualTo(10_526);
        }

        @Test
        @DisplayName("주 48h 약정도 법정 40h 캡 → 209h (§50)")
        void cappedAtStatutory40() {
            assertThat(MonthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(48.0)).isEqualTo(209);
        }

        @Test
        @DisplayName("15h 경계: 15h는 주휴 3h 포함(78h), 14.9h는 주휴 0(65h) — §18③, 계약서 규칙과 동일")
        void fifteenHourBoundary() {
            // 15h: (15 + 15/40×8=3) × 4.345238 = 78.21 → 78
            assertThat(MonthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(15.0)).isEqualTo(78);
            // 14.9h: 주휴 0 → 14.9 × 4.345238 = 64.74 → 65
            assertThat(MonthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(14.9)).isEqualTo(65);
            // 14h: 주휴 0 → 14 × 4.345238 = 60.83 → 61
            assertThat(MonthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(14.0)).isEqualTo(61);
        }

        @Test
        @DisplayName("주 소정근로시간 미설정(null/0)이면 기존 weeklyDays 폴백 — 회귀 없음")
        void fallsBackToWeeklyDaysPath() {
            assertThat(calculator.monthlyStandardHours(null, null, 8.0))
                    .isEqualByComparingTo(new BigDecimal("209"));
            assertThat(calculator.monthlyStandardHours(0.0, 3, 8.0))
                    .isEqualByComparingTo(new BigDecimal("125"));
            assertThat(calculator.ordinaryHourlyWage(2_200_000, null, null, 8.0)).isEqualTo(10_526);
        }
    }

    @Nested
    @DisplayName("일할계산 (중도 입사·부분 기간)")
    class Proration {

        private static final int SALARY = 2_200_000;

        @Test
        @DisplayName("완전 재직 + 1일~말일 주기 → 월급 전액")
        void fullCalendarMonth() {
            assertThat(calculator.proratedBaseSalary(SALARY,
                    LocalDate.of(2025, 4, 1), LocalDate.of(2025, 4, 30),
                    LocalDate.of(2024, 1, 1))).isEqualTo(SALARY);
        }

        @Test
        @DisplayName("완전 재직 + 25일~익월 24일 주기(정산주기) → 월급 전액 (역일수 편차 없음)")
        void fullCycleCrossingMonths() {
            assertThat(calculator.proratedBaseSalary(SALARY,
                    LocalDate.of(2025, 5, 25), LocalDate.of(2025, 6, 24),
                    LocalDate.of(2024, 1, 1))).isEqualTo(SALARY);
        }

        @Test
        @DisplayName("2월(말일 28일) 완전 재직 → 월급 전액 (plusMonths 말일 보정)")
        void februaryFullMonth() {
            assertThat(calculator.proratedBaseSalary(SALARY,
                    LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28),
                    LocalDate.of(2024, 1, 1))).isEqualTo(SALARY);
        }

        @Test
        @DisplayName("월중 입사(4/16) → 월급 × 15/30")
        void midMonthHire() {
            assertThat(calculator.proratedBaseSalary(SALARY,
                    LocalDate.of(2025, 4, 1), LocalDate.of(2025, 4, 30),
                    LocalDate.of(2025, 4, 16))).isEqualTo(1_100_000);
        }

        @Test
        @DisplayName("기간 첫날 입사 → 월급 전액 (일할 아님)")
        void hireOnPeriodStart() {
            assertThat(calculator.proratedBaseSalary(SALARY,
                    LocalDate.of(2025, 4, 1), LocalDate.of(2025, 4, 30),
                    LocalDate.of(2025, 4, 1))).isEqualTo(SALARY);
        }

        @Test
        @DisplayName("말일(4/30) 입사 → 월급 × 1/30 = 73,333원")
        void hireOnLastDay() {
            // 2,200,000 × 1/30 = 73,333.33 → 73,333
            assertThat(calculator.proratedBaseSalary(SALARY,
                    LocalDate.of(2025, 4, 1), LocalDate.of(2025, 4, 30),
                    LocalDate.of(2025, 4, 30))).isEqualTo(73_333);
        }

        @Test
        @DisplayName("기간 이후 입사 → 0원")
        void hireAfterPeriod() {
            assertThat(calculator.proratedBaseSalary(SALARY,
                    LocalDate.of(2025, 4, 1), LocalDate.of(2025, 4, 30),
                    LocalDate.of(2025, 5, 1))).isZero();
        }

        @Test
        @DisplayName("부분 기간 정산(6/1~6/15, 중도퇴사 등) → 월급 × 15/30")
        void partialPeriod() {
            assertThat(calculator.proratedBaseSalary(SALARY,
                    LocalDate.of(2025, 6, 1), LocalDate.of(2025, 6, 15),
                    LocalDate.of(2024, 1, 1))).isEqualTo(1_100_000);
        }

        @Test
        @DisplayName("월 경계에 걸친 부분 기간은 달력월별 역일수로 합산")
        void partialPeriodAcrossMonths() {
            // 5/25~6/10, 입사 6/1 → 6월분만: 2,200,000 × 10/30 = 733,333.33 → 733,333
            assertThat(calculator.proratedBaseSalary(SALARY,
                    LocalDate.of(2025, 5, 25), LocalDate.of(2025, 6, 10),
                    LocalDate.of(2025, 6, 1))).isEqualTo(733_333);
        }
    }
}
