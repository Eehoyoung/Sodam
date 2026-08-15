package com.rich.sodam.service;

import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import com.rich.sodam.dto.response.LaborRiskResponse.RiskType;
import com.rich.sodam.dto.response.LaborRiskResponse.Severity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 기본 내레이터(WP-4) — 규칙 엔진 문구를 그대로 반환(외부 호출 0).
 */
class TemplateLaborRiskNarratorTest {

    private final TemplateLaborRiskNarrator narrator = new TemplateLaborRiskNarrator();

    @Test
    @DisplayName("item.message()를 변형 없이 그대로 반환한다")
    void passesThroughMessageUnchanged() {
        Item item = new Item(RiskType.MIN_WAGE_RISK, Severity.DANGER, 1L, "직원1",
                "적용 시급 9,000원이 2026년 최저임금(10,320원) 미만이에요. 즉시 인상이 필요해요.",
                new BigDecimal("9000"));

        assertThat(narrator.narrate(item)).isEqualTo(item.message());
    }

    @Test
    @DisplayName("employeeId·value가 없는 매장 단위 항목(HEADCOUNT_THRESHOLD)도 그대로 반환한다")
    void passesThroughStoreLevelItem() {
        Item item = new Item(RiskType.HEADCOUNT_THRESHOLD, Severity.WARN, null, null,
                "최근 1개월 상시근로자 참고 산정 4.9명 — 5인 경계에 근접했을 가능성이 있어요.",
                new BigDecimal("4.9"));

        assertThat(narrator.narrate(item)).isEqualTo(item.message());
    }
}
