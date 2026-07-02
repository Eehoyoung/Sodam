package com.rich.sodam.domain.type;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 플랜 티어 카탈로그·기능·직원수 상한 단위 테스트. 수익화 확정안 §1 기준.
 */
class PlanTypeTest {

    @Test
    @DisplayName("확정 가격: FREE 0 / STARTER 9,900 / PRO 19,900 / PREMIUM 39,900")
    void prices() {
        assertThat(PlanType.FREE.getMonthlyPriceKrw()).isZero();
        assertThat(PlanType.STARTER.getMonthlyPriceKrw()).isEqualTo(9_900);
        assertThat(PlanType.PRO.getMonthlyPriceKrw()).isEqualTo(19_900);
        assertThat(PlanType.PREMIUM.getMonthlyPriceKrw()).isEqualTo(39_900);
    }

    @Test
    @DisplayName("직원 상한: FREE 2 / STARTER 5 / PRO·PREMIUM 무제한")
    void employeeLimits() {
        assertThat(PlanType.FREE.getEmployeeLimit()).isEqualTo(2);
        assertThat(PlanType.STARTER.getEmployeeLimit()).isEqualTo(5);
        assertThat(PlanType.PRO.isUnlimitedEmployees()).isTrue();
        assertThat(PlanType.PREMIUM.isUnlimitedEmployees()).isTrue();

        assertThat(PlanType.FREE.allowsEmployeeCount(2)).isTrue();
        assertThat(PlanType.FREE.allowsEmployeeCount(3)).isFalse();
        assertThat(PlanType.STARTER.allowsEmployeeCount(5)).isTrue();
        assertThat(PlanType.STARTER.allowsEmployeeCount(6)).isFalse();
        assertThat(PlanType.PRO.allowsEmployeeCount(999)).isTrue();
    }

    @Test
    @DisplayName("기능 게이트: 명세서PDF는 STARTER+, 4대보험 신고서·연차는 PRO+")
    void features() {
        assertThat(PlanType.FREE.hasFeature(PlanFeature.PAYSLIP_PDF)).isFalse();
        assertThat(PlanType.STARTER.hasFeature(PlanFeature.PAYSLIP_PDF)).isTrue();

        assertThat(PlanType.STARTER.hasFeature(PlanFeature.INSURANCE_FILING)).isFalse();
        assertThat(PlanType.PRO.hasFeature(PlanFeature.INSURANCE_FILING)).isTrue();
        assertThat(PlanType.PRO.hasFeature(PlanFeature.ANNUAL_LEAVE)).isTrue();

        // PREMIUM 전용
        assertThat(PlanType.PRO.hasFeature(PlanFeature.PARTNER_REFERRAL)).isFalse();
        assertThat(PlanType.PREMIUM.hasFeature(PlanFeature.PARTNER_REFERRAL)).isTrue();
        assertThat(PlanType.PREMIUM.hasFeature(PlanFeature.INSPECTION_EVIDENCE)).isTrue();
    }

    @Test
    @DisplayName("티어 서열: FREE < STARTER < PRO < PREMIUM")
    void tierOrder() {
        assertThat(PlanType.PRO.isAtLeast(PlanType.STARTER)).isTrue();
        assertThat(PlanType.PRO.isAtLeast(PlanType.PRO)).isTrue();
        assertThat(PlanType.STARTER.isAtLeast(PlanType.PRO)).isFalse();
        assertThat(PlanType.PREMIUM.isAtLeast(PlanType.FREE)).isTrue();
        assertThat(PlanType.FREE.isAtLeast(PlanType.STARTER)).isFalse();
    }
}
