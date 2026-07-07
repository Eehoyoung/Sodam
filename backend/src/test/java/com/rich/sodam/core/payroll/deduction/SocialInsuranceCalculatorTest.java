package com.rich.sodam.core.payroll.deduction;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 4대보험 근로자 부담 공제 계산 검증(2026 요율) + 명세서 항목별 내역(§48②).
 *
 * <p>국민연금 상·하한 캡은 매년 7.1 갱신되는 날짜 의존 값이라({@link SocialInsuranceRates}),
 * 캡 관련 테스트는 무인자 {@code nationalPension(int)}(=오늘 날짜)가 아니라 날짜를 명시하는
 * {@code nationalPension(int, LocalDate)}로 특정 적용 구간을 고정해서 검증한다 — 그렇지 않으면
 * 스위트가 다음 캡 갱신일을 지나가는 순간 실패한다.</p>
 */
class SocialInsuranceCalculatorTest {

    private final SocialInsuranceCalculator calculator = new SocialInsuranceCalculator();

    @Test
    @DisplayName("국민연금 4.75%: 보수 200만 → 95,000원")
    void nationalPension() {
        assertThat(calculator.nationalPension(2_000_000)).isEqualTo(95_000);
    }

    @Test
    @DisplayName("국민연금 하한 캡(2025.7.1~2026.6.30 적용분): 보수 30만(<40만) → 하한 40만 기준 19,000원")
    void nationalPensionFloorCap() {
        assertThat(calculator.nationalPension(300_000, LocalDate.of(2025, 8, 1))).isEqualTo(19_000);
    }

    @Test
    @DisplayName("국민연금 상한 캡(2025.7.1~2026.6.30 적용분): 보수 700만(>637만) → 상한 637만 기준 302,575원")
    void nationalPensionCeilingCap() {
        assertThat(calculator.nationalPension(7_000_000, LocalDate.of(2025, 8, 1))).isEqualTo(302_575);
    }

    @Test
    @DisplayName("국민연금 하한 캡(2026.7.1~ 적용분): 보수 30만(<41만) → 하한 41만 기준 19,475원")
    void nationalPensionFloorCap_afterJuly2026() {
        assertThat(calculator.nationalPension(300_000, LocalDate.of(2026, 7, 1))).isEqualTo(19_475);
    }

    @Test
    @DisplayName("국민연금 상한 캡(2026.7.1~ 적용분): 보수 700만(>659만) → 상한 659만 기준 313,025원")
    void nationalPensionCeilingCap_afterJuly2026() {
        assertThat(calculator.nationalPension(7_000_000, LocalDate.of(2026, 7, 1))).isEqualTo(313_025);
    }

    @Test
    @DisplayName("건강보험 3.595%: 보수 200만 → 71,900원")
    void healthInsurance() {
        assertThat(calculator.healthInsurance(2_000_000)).isEqualTo(71_900);
    }

    @Test
    @DisplayName("장기요양: 건강보험료 × 0.13139 (보수월액 아님)")
    void longTermCareOnHealthPremium() {
        int health = calculator.healthInsurance(2_000_000); // 71,900
        int expected = (int) (health * 0.13139); // 9,446
        assertThat(calculator.longTermCare(2_000_000)).isEqualTo(expected);
    }

    @Test
    @DisplayName("고용보험 0.9%: 보수 200만 → 18,000원")
    void employmentInsurance() {
        assertThat(calculator.employmentInsurance(2_000_000)).isEqualTo(18_000);
    }

    @Test
    @DisplayName("항목별 내역 합계 = 총공제액")
    void breakdownSumsToTotal() {
        DeductionBreakdown b = calculator.breakdown(2_000_000);
        assertThat(b.total()).isEqualTo(calculator.totalEmployeeDeduction(2_000_000));
        assertThat(b.nationalPension()).isEqualTo(95_000);
        assertThat(b.employmentInsurance()).isEqualTo(18_000);
    }
}
