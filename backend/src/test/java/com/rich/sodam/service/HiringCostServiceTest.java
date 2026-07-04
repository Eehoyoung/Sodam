package com.rich.sodam.service;

import com.rich.sodam.dto.response.HiringCostResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 채용 총비용 시뮬레이터 — 주휴 15h 기준·사업주 4대보험·월환산(4.345) 계산 검증.
 */
class HiringCostServiceTest {

    private final HiringCostService service = new HiringCostService();

    @Test
    @DisplayName("시급 11,000원 · 주 20시간 — 기본급·주휴수당(월환산)·합계가 관례식과 일치")
    void simulateTwentyHours() {
        HiringCostResponse res = service.simulate(11_000, 20);

        // 기본급 = 11,000 × 20 × 4.345 = 955,900
        assertThat(res.monthlyBaseWage()).isEqualTo(955_900L);
        // 주휴 = (20/40)×8h = 4h → 11,000 × 4 × 4.345 = 191,180
        assertThat(res.weeklyAllowanceEligible()).isTrue();
        assertThat(res.weeklyAllowance()).isEqualTo(191_180L);
        assertThat(res.monthlyGrossWage()).isEqualTo(1_147_080L);

        // 사업주 4대보험 — 국민연금 4.75%(캡 내), 건강 3.595%+장기요양, 고용 1.15%, 산재 평균 1.47%
        assertThat(res.employerInsurance().nationalPension()).isEqualTo(54_486L);
        assertThat(res.employerInsurance().total()).isEqualTo(
                res.employerInsurance().nationalPension()
                        + res.employerInsurance().healthInsurance()
                        + res.employerInsurance().employmentInsurance()
                        + res.employerInsurance().industrialAccident());

        // 퇴직금 적립 = 월급여/12
        assertThat(res.monthlySeveranceAccrual()).isEqualTo(95_590L);
        // 총비용 = 월급여 + 보험 사업주분 + 퇴직 적립
        assertThat(res.monthlyTotalCost()).isEqualTo(
                res.monthlyGrossWage() + res.employerInsurance().total() + res.monthlySeveranceAccrual());
    }

    @Test
    @DisplayName("주 15시간 미만이면 주휴수당 0 (미발생)")
    void noAllowanceBelowFifteenHours() {
        HiringCostResponse res = service.simulate(11_000, 10);

        assertThat(res.weeklyAllowanceEligible()).isFalse();
        assertThat(res.weeklyAllowance()).isZero();
        assertThat(res.monthlyBaseWage()).isEqualTo(477_950L); // 11,000×10×4.345
        assertThat(res.monthlyGrossWage()).isEqualTo(res.monthlyBaseWage());
    }

    @Test
    @DisplayName("주 40시간 초과여도 주휴시간은 8시간 상한")
    void allowanceCappedAtEightHours() {
        HiringCostResponse res40 = service.simulate(10_320, 40);
        HiringCostResponse res52 = service.simulate(10_320, 52);

        // 40h 와 52h 모두 주휴 8h → 주휴수당 동일
        assertThat(res52.weeklyAllowance()).isEqualTo(res40.weeklyAllowance());
    }

    @Test
    @DisplayName("경계 검증 — 시급 1,000~1,000,000 / 주 1~52시간 밖이면 400(IllegalArgument)")
    void validatesInputRange() {
        assertThatThrownBy(() -> service.simulate(999, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.simulate(1_000_001, 20)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.simulate(11_000, 0.5)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.simulate(11_000, 52.5)).isInstanceOf(IllegalArgumentException.class);
        // 경계값 자체는 허용
        assertThat(service.simulate(1_000, 1)).isNotNull();
        assertThat(service.simulate(1_000_000, 52)).isNotNull();
    }
}
