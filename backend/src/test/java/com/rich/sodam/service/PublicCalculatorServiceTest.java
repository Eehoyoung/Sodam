package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.dto.response.PublicCalculatorResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WP-A — 비로그인 공개 계산기.
 *
 * <p>경계값(주 15시간·40시간)과 <b>면책 문구 존재</b>를 함께 고정한다. 면책은 취향이 아니라
 * 3자 교차검증이 정한 배포 조건이라, 빠지면 테스트가 깨져야 한다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
class PublicCalculatorServiceTest {

    @Autowired private PublicCalculatorService service;

    // ── 주휴수당 경계 ──────────────────────────────────────────────

    @Test
    @DisplayName("주 15시간 미만이면 주휴수당이 발생하지 않는다")
    void under15HoursIsNotEligible() {
        var result = service.weeklyHoliday(14.9, 10_000);

        assertThat(result.eligible()).isFalse();
        assertThat(result.weeklyAllowance()).isZero();
    }

    @Test
    @DisplayName("주 15시간 정각은 발생 요건을 충족한다 — 경계 포함")
    void exactly15HoursIsEligible() {
        var result = service.weeklyHoliday(15.0, 10_000);

        assertThat(result.eligible()).isTrue();
        // 15/40 * 8시간 = 3시간 → 30,000원
        assertThat(result.allowanceHours()).isEqualTo(3.0);
        assertThat(result.weeklyAllowance()).isEqualTo(30_000L);
    }

    @Test
    @DisplayName("주 40시간이면 상한 8시간이 적용된다")
    void fortyHoursGetsMaxEightHours() {
        var result = service.weeklyHoliday(40.0, 10_000);

        assertThat(result.allowanceHours()).isEqualTo(8.0);
        assertThat(result.weeklyAllowance()).isEqualTo(80_000L);
    }

    @Test
    @DisplayName("주 40시간을 넘겨도 주휴수당은 8시간을 넘지 않는다")
    void overFortyHoursIsCappedAtEight() {
        var result = service.weeklyHoliday(52.0, 10_000);

        assertThat(result.allowanceHours()).isEqualTo(8.0);
        assertThat(result.weeklyAllowance()).isEqualTo(80_000L);
    }

    @Test
    @DisplayName("주휴수당 응답에는 노무 검토가 지정한 한계 고지가 포함된다")
    void weeklyHolidayCarriesRequiredNotices() {
        var result = service.weeklyHoliday(20.0, 10_000);

        assertThat(result.notices())
                .anyMatch(n -> n.contains("결근"))
                .anyMatch(n -> n.contains("15시간"))
                .anyMatch(n -> n.contains("1350"));
        assertThat(result.disclaimer()).isEqualTo(PublicCalculatorResponse.COMMON_DISCLAIMER);
    }

    // ── 최저임금 ──────────────────────────────────────────────────

    @Test
    @DisplayName("최저임금 미달이면 부족액을 알려준다")
    void belowMinimumReportsShortfall() {
        int year = LocalDate.now().getYear();
        long minimum = MinimumWage.hourlyFor(year).longValue();

        var result = service.minimumWage(year, (int) minimum - 500);

        assertThat(result.meetsMinimum()).isFalse();
        assertThat(result.shortfall()).isEqualTo(500L);
    }

    @Test
    @DisplayName("최저임금 이상이면 부족액이 0이다")
    void atOrAboveMinimumHasNoShortfall() {
        int year = LocalDate.now().getYear();
        long minimum = MinimumWage.hourlyFor(year).longValue();

        var result = service.minimumWage(year, (int) minimum);

        assertThat(result.meetsMinimum()).isTrue();
        assertThat(result.shortfall()).isZero();
    }

    // ── 4대보험 ───────────────────────────────────────────────────

    @Test
    @DisplayName("4대보험은 항목 합계가 총액과 일치하고 실수령 추정이 그만큼 줄어든다")
    void socialInsuranceBreakdownIsConsistent() {
        int gross = 3_000_000;

        var result = service.socialInsurance(gross);

        assertThat(result.total()).isEqualTo(
                result.nationalPension() + result.healthInsurance()
                        + result.longTermCare() + result.employmentIns());
        assertThat(result.netEstimate()).isEqualTo(gross - result.total());
        assertThat(result.notices()).anyMatch(n -> n.contains("소득세"));
    }

    // ── 입력 검증 ─────────────────────────────────────────────────

    @Test
    @DisplayName("0 이하 금액은 거부한다")
    void nonPositiveInputsAreRejected() {
        assertThatThrownBy(() -> service.weeklyHoliday(20, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.socialInsurance(-1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.weeklyHoliday(-1, 10_000))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
