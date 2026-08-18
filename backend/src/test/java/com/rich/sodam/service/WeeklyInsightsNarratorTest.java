package com.rich.sodam.service;

import com.rich.sodam.dto.response.WeeklyInsightsResponse;
import com.rich.sodam.dto.response.WeeklyInsightsResponse.InsightItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-2 — 사장 주간 브리핑 요약 단위 테스트. 실제 네트워크 없이 순수 로직만 검증한다.
 */
class WeeklyInsightsNarratorTest {

    private static WeeklyInsightsResponse sample() {
        return new WeeklyInsightsResponse(1L, LocalDate.now().minusDays(7), 7, List.of(
                new InsightItem("EMPLOYEE_REGISTERED", "직원 등록", 2),
                new InsightItem("FIRST_CHECK_IN", "첫 출근", 1),
                new InsightItem("PURCHASE_SAVED", "매입 기록", 0)
        ), null);
    }

    @Test
    @DisplayName("AnthropicTextClient 빈이 없으면(provider 미설정) summary는 null이다(외부 호출 없음)")
    void returnsNullWhenClientAbsent() {
        WeeklyInsightsNarrator narrator = new WeeklyInsightsNarrator(Optional.empty());

        assertThat(narrator.summarize(sample())).isNull();
    }

    @Test
    @DisplayName("이벤트가 하나도 없으면 client 유무와 무관하게 null이다")
    void returnsNullWhenNoItems() {
        WeeklyInsightsNarrator narrator = new WeeklyInsightsNarrator(Optional.empty());
        WeeklyInsightsResponse empty = new WeeklyInsightsResponse(1L, LocalDate.now(), 7, List.of(), null);

        assertThat(narrator.summarize(empty)).isNull();
    }

    @Test
    @DisplayName("HC-1 금지어가 포함된 요약은 검증 실패로 처리한다")
    void rejectsForbiddenPhrase() {
        boolean valid = WeeklyInsightsNarrator.passesValidation(
                "이번 주 직원 등록 2건은 위반입니다.", sample().items());

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("0보다 큰 카운트가 요약 문장에서 사라지면 검증 실패로 처리한다")
    void rejectsWhenCountMissing() {
        boolean valid = WeeklyInsightsNarrator.passesValidation(
                "이번 주 직원이 새로 등록됐고 첫 출근도 있었어요.", sample().items());

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("금지어 없고 0보다 큰 모든 카운트가 보존된 요약은 검증을 통과한다")
    void acceptsCleanSummary() {
        boolean valid = WeeklyInsightsNarrator.passesValidation(
                "이번 주 직원 등록 2건, 첫 출근 1건이 있었어요.", sample().items());

        assertThat(valid).isTrue();
    }

    @Test
    @DisplayName("프롬프트는 수치 불변·추세 단정 금지·법적 확언 금지를 명시한다")
    void promptStatesInvariants() {
        String prompt = WeeklyInsightsNarrator.buildPrompt(sample());

        assertThat(prompt).contains("숫자를 하나도 바꾸지 말고");
        assertThat(prompt).contains("법적 확언");
        assertThat(prompt).contains("직원 등록=2건");
    }
}
