package com.rich.sodam.service;

import com.rich.sodam.dto.response.TaxSimulationResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 세무 시뮬레이터 (T-NEW-05) — 누진세율 산출세액·과세표준 경계.
 */
class TaxSimulatorServiceTest {

    private final TaxSimulatorService service = new TaxSimulatorService();

    @Test
    @DisplayName("과세표준 5천만(15% 구간): 750만 − 누진공제 126만 = 624만")
    void midBracket() {
        TaxSimulationResponse res = service.simulate(60_000_000, 10_000_000);
        assertThat(res.taxableIncome()).isEqualTo(50_000_000);
        assertThat(res.estimatedTax()).isEqualTo(6_240_000); // 5천만×15% − 126만
        assertThat(res.effectiveRate()).isGreaterThan(0);
        assertThat(res.disclaimer()).contains("세무사");
    }

    @Test
    @DisplayName("최저 구간(6%): 1천만 × 6% = 60만")
    void lowestBracket() {
        TaxSimulationResponse res = service.simulate(10_000_000, 0);
        assertThat(res.taxableIncome()).isEqualTo(10_000_000);
        assertThat(res.estimatedTax()).isEqualTo(600_000);
    }

    @Test
    @DisplayName("경비가 수입보다 크면 과세표준 0·세액 0")
    void negativeTaxable() {
        TaxSimulationResponse res = service.simulate(5_000_000, 8_000_000);
        assertThat(res.taxableIncome()).isZero();
        assertThat(res.estimatedTax()).isZero();
        assertThat(res.effectiveRate()).isZero();
    }
}
