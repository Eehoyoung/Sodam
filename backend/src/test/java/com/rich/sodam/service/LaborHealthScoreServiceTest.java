package com.rich.sodam.service;

import com.rich.sodam.dto.response.LaborHealthResponse;
import com.rich.sodam.dto.response.LaborRiskResponse;
import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import com.rich.sodam.dto.response.LaborRiskResponse.RiskType;
import com.rich.sodam.dto.response.LaborRiskResponse.Severity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 노무 건강도 점수 산출(WP-7) — DANGER/WARN 가중 감점, 0 하한, BASIC/FULL 필드 분기.
 */
class LaborHealthScoreServiceTest {

    private final LaborRiskService laborRiskService = mock(LaborRiskService.class);
    private final LaborHealthScoreService service = new LaborHealthScoreService(laborRiskService);

    private Item danger(String name) {
        return new Item(RiskType.MIN_WAGE_RISK, Severity.DANGER, 1L, name, "위험 메시지", BigDecimal.ONE);
    }

    private Item warn(String name) {
        return new Item(RiskType.WEEKLY_15H_BOUNDARY, Severity.WARN, 2L, name, "주의 메시지", BigDecimal.ONE);
    }

    @Test
    @DisplayName("리스크가 전혀 없으면 점수 100, 확인 필요 0건")
    void perfectScoreWhenNoRisks() {
        when(laborRiskService.analyze(1L)).thenReturn(new LaborRiskResponse(List.of()));

        LaborHealthResponse res = service.summarize(1L, false);

        assertThat(res.score()).isEqualTo(100);
        assertThat(res.needsAttentionCount()).isZero();
        assertThat(res.dangerCount()).isZero();
        assertThat(res.warnCount()).isZero();
    }

    @Test
    @DisplayName("DANGER 1건 = 100-15=85, WARN 1건 = 100-5=95, 합치면 100-15-5=80")
    void combinesDangerAndWarnPenalties() {
        when(laborRiskService.analyze(1L)).thenReturn(new LaborRiskResponse(List.of(danger("직원1"), warn("직원2"))));

        LaborHealthResponse res = service.summarize(1L, false);

        assertThat(res.dangerCount()).isEqualTo(1);
        assertThat(res.warnCount()).isEqualTo(1);
        assertThat(res.needsAttentionCount()).isEqualTo(2);
        assertThat(res.score()).isEqualTo(80);
    }

    @Test
    @DisplayName("DANGER가 많아 감점이 100을 넘어도 점수는 0 미만으로 내려가지 않는다")
    void scoreFloorsAtZero() {
        List<Item> many = List.of(danger("a"), danger("b"), danger("c"), danger("d"),
                danger("e"), danger("f"), danger("g"), danger("h"));
        when(laborRiskService.analyze(1L)).thenReturn(new LaborRiskResponse(many)); // 8*15=120 > 100

        LaborHealthResponse res = service.summarize(1L, false);

        assertThat(res.score()).isZero();
    }

    @Test
    @DisplayName("includeDetail=false(BASIC)면 items[].message가 전부 null")
    void basicOmitsMessage() {
        when(laborRiskService.analyze(1L)).thenReturn(new LaborRiskResponse(List.of(danger("직원1"))));

        LaborHealthResponse res = service.summarize(1L, false);

        assertThat(res.items()).allMatch(i -> i.message() == null);
        assertThat(res.items().get(0).type()).isEqualTo(RiskType.MIN_WAGE_RISK);
        assertThat(res.items().get(0).severity()).isEqualTo(Severity.DANGER);
    }

    @Test
    @DisplayName("includeDetail=true(FULL)면 items[].message가 원본 그대로 채워진다")
    void fullIncludesMessage() {
        when(laborRiskService.analyze(1L)).thenReturn(new LaborRiskResponse(List.of(danger("직원1"))));

        LaborHealthResponse res = service.summarize(1L, true);

        assertThat(res.items().get(0).message()).isEqualTo("위험 메시지");
    }

    @Test
    @DisplayName("면책 문구가 항상 포함된다 — 참고용 점수이며 최종 판단은 근로감독관·법원 권한")
    void alwaysCarriesDisclaimer() {
        when(laborRiskService.analyze(1L)).thenReturn(new LaborRiskResponse(List.of()));

        LaborHealthResponse res = service.summarize(1L, false);

        assertThat(res.disclaimer()).contains("참고").contains("근로감독관");
    }
}
