package com.rich.sodam.service;

import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import com.rich.sodam.dto.response.LaborRiskResponse.RiskType;
import com.rich.sodam.dto.response.LaborRiskResponse.Severity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * LLM 내레이터(WP-4) 단위 테스트 — 실제 네트워크 호출 없이 순수 로직(프롬프트 구성·응답 검증·
 * api-key 미설정 시 폴백)만 검증한다. Anthropic 실 호출 경로는 H-6(인간 승인) 전까지 배선만
 * 존재하고 활성화되지 않는다.
 */
class LlmLaborRiskNarratorTest {

    private static Item danger52h() {
        return new Item(RiskType.SCHEDULE_52H_FORECAST, Severity.DANGER, 1L, "직원A",
                "다음 주 확정 근무가 52시간이에요. 주 52시간을 초과할 가능성이 있어요.",
                new BigDecimal("52"));
    }

    @Test
    @DisplayName("api-key 미설정이면 항상 원본 메시지를 그대로 반환한다(외부 호출 없음)")
    void fallsBackToOriginalWhenApiKeyBlank() {
        LlmLaborRiskNarrator narrator = new LlmLaborRiskNarrator(
                "https://api.anthropic.com/v1/messages", "", "claude-haiku-4-5-20251001", 100, 100);
        Item item = danger52h();

        assertThat(narrator.narrate(item)).isEqualTo(item.message());
    }

    @Test
    @DisplayName("HC-1 금지어가 포함된 응답은 검증 실패로 처리한다")
    void rejectsForbiddenPhrase() {
        Item item = danger52h();
        boolean valid = LlmLaborRiskNarrator.passesValidation(
                "직원A의 다음 주 근무가 52시간이라 위반입니다.", item);

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("원래 수치(52)가 사라진 응답은 판정 변형 의심으로 검증 실패 처리한다")
    void rejectsWhenNumberMissing() {
        Item item = danger52h();
        boolean valid = LlmLaborRiskNarrator.passesValidation(
                "직원A의 다음 주 근무 시간이 다소 길어요. 확인해 주세요.", item);

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("금지어 없고 원래 수치가 보존된 자연스러운 재서술은 검증을 통과한다")
    void acceptsCleanRephrasedText() {
        Item item = danger52h();
        boolean valid = LlmLaborRiskNarrator.passesValidation(
                "직원A는 다음 주 52시간 근무가 예정돼 있어요. 주 52시간 한도를 넘어설 가능성이 있으니 확인해 주세요.",
                item);

        assertThat(valid).isTrue();
    }

    @Test
    @DisplayName("프롬프트에 익명 라벨은 포함되지만 실제 직원명은 포함되지 않는다(HC-8)")
    void promptNeverLeaksRealEmployeeName() {
        Item item = danger52h(); // employeeName="직원A" — 실제로는 "김철수" 같은 실명을 가정
        Item withRealName = new Item(item.type(), item.severity(), item.employeeId(), "김철수",
                item.message().replace("직원A", "김철수"), item.value());

        String anonymized = withRealName.message().replace("김철수", LlmLaborRiskNarrator.ANONYMOUS_LABEL);
        String prompt = LlmLaborRiskNarrator.buildPrompt(withRealName, anonymized);

        assertThat(prompt).doesNotContain("김철수");
        assertThat(prompt).contains(LlmLaborRiskNarrator.ANONYMOUS_LABEL);
    }
}
