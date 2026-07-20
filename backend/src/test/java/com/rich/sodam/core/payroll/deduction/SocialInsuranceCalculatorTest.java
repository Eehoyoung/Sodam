package com.rich.sodam.core.payroll.deduction;

import com.rich.sodam.core.payroll.constant.SocialInsuranceRates;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 4대보험 근로자 부담 공제 계산 검증(2026 요율) + 명세서 항목별 내역(§48②).
 *
 * <p>국민연금 상·하한 캡은 매년 7.1 갱신되는 날짜 의존 값이라({@link SocialInsuranceRates}),
 * 캡 관련 테스트는 무인자 {@code nationalPension(int)}(=오늘 날짜)가 아니라 날짜를 명시하는
 * {@code nationalPension(int, LocalDate)}로 특정 적용 구간을 고정해서 검증한다 — 그렇지 않으면
 * 스위트가 다음 캡 갱신일을 지나가는 순간 실패한다.</p>
 *
 * <p>무인자 {@code nationalPension(int)}이 실제로 벽시계가 아니라 주입된 {@link Clock}을 쓰는지는
 * {@link #nationalPensionConvenienceOverload_usesInjectedClock_notWallClock()}에서
 * 6/30·7/1 두 시점을 {@link Clock#fixed}로 고정해 별도 검증한다.</p>
 */
class SocialInsuranceCalculatorTest {

    private final SocialInsuranceCalculator calculator =
            new SocialInsuranceCalculator(Clock.systemDefaultZone());

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

    /**
     * 무인자 {@code nationalPension(int)} 편의 오버로드가 벽시계({@code LocalDate.now()})가 아니라
     * 생성자로 주입된 {@link Clock}을 사용해 "오늘"을 판정하는지 검증한다. 하한 캡이 6/30→7/1 로
     * 40만→41만 원 갱신되므로, 같은 보수(30만원)에 대해 두 시점의 결과가 달라야 한다.
     *
     * <p>이 테스트는 {@link SocialInsuranceCalculator}가 {@code LocalDate.now()}를 직접 호출하면
     * (Clock 주입 전 상태) 시스템 시각에 좌우되어 재현 불가능해지고, Clock 을 무시한 채 상수를
     * 반환하도록 잘못 리팩터링해도(예: 항상 6/30 캡 적용) 실패한다 — 즉 진짜 경계 전환을 검증한다.</p>
     */
    @Test
    @DisplayName("무인자 nationalPension(int)은 벽시계가 아니라 주입된 Clock 기준 7/1 경계를 반영한다")
    void nationalPensionConvenienceOverload_usesInjectedClock_notWallClock() {
        ZoneId seoul = ZoneId.of("Asia/Seoul");
        Clock beforeRenewal = Clock.fixed(
                LocalDate.of(2026, 6, 30).atStartOfDay(seoul).toInstant(), seoul);
        Clock afterRenewal = Clock.fixed(
                LocalDate.of(2026, 7, 1).atStartOfDay(seoul).toInstant(), seoul);

        SocialInsuranceCalculator beforeCalculator = new SocialInsuranceCalculator(beforeRenewal);
        SocialInsuranceCalculator afterCalculator = new SocialInsuranceCalculator(afterRenewal);

        // 보수 30만원 < 두 구간 하한 모두 → 하한 캡이 그대로 기준소득월액이 된다.
        assertThat(beforeCalculator.nationalPension(300_000))
                .as("6/30(경신 전): 하한 40만원 기준")
                .isEqualTo(19_000);
        assertThat(afterCalculator.nationalPension(300_000))
                .as("7/1(경신 후): 하한 41만원 기준")
                .isEqualTo(19_475);

        // 인자 있는 오버로드로 같은 날짜를 직접 넘긴 결과와도 일치해야 한다(경로 위임 확인).
        assertThat(beforeCalculator.nationalPension(300_000))
                .isEqualTo(calculator.nationalPension(300_000, LocalDate.of(2026, 6, 30)));
        assertThat(afterCalculator.nationalPension(300_000))
                .isEqualTo(calculator.nationalPension(300_000, LocalDate.of(2026, 7, 1)));
    }
}
