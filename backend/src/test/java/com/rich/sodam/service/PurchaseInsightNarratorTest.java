package com.rich.sodam.service;

import com.rich.sodam.dto.response.MonthlySummaryResponse;
import com.rich.sodam.dto.response.VendorSummaryResponse;
import com.rich.sodam.service.ai.TextGenerationClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * WP-5 — 매입장부 인사이트 코멘트 단위 테스트. 실제 네트워크 없이 순수 로직만 검증한다.
 */
class PurchaseInsightNarratorTest {

    private static List<VendorSummaryResponse> vendors() {
        return List.of(
                new VendorSummaryResponse("행복마트", 500_000, 12, 62.5),
                new VendorSummaryResponse("신선유통", 300_000, 8, 37.5));
    }

    private static List<MonthlySummaryResponse> months() {
        return List.of(
                new MonthlySummaryResponse("2026-07", 700_000),
                new MonthlySummaryResponse("2026-08", 800_000));
    }

    @Test
    @DisplayName("AnthropicTextClient 빈이 없으면(provider 미설정) comment는 null이다(외부 호출 없음)")
    void returnsNullWhenClientAbsent() {
        PurchaseInsightNarrator narrator = new PurchaseInsightNarrator(Optional.empty());

        assertThat(narrator.summarize(vendors(), months())).isNull();
    }

    @Test
    @DisplayName("거래처·월별 데이터가 모두 비어있으면 client 유무와 무관하게 null이다")
    void returnsNullWhenNoData() {
        PurchaseInsightNarrator narrator = new PurchaseInsightNarrator(Optional.empty());

        assertThat(narrator.summarize(List.of(), List.of())).isNull();
    }

    @Test
    @DisplayName("HC-1 금지어가 포함된 응답은 검증 실패로 처리한다")
    void rejectsForbiddenPhrase() {
        assertThat(PurchaseInsightNarrator.passesValidation("이 정도면 100% 안전합니다.")).isFalse();
    }

    @Test
    @DisplayName("응답 길이가 200자를 초과하면 검증 실패로 처리한다")
    void rejectsWhenTooLong() {
        assertThat(PurchaseInsightNarrator.passesValidation("가".repeat(201))).isFalse();
    }

    @Test
    @DisplayName("HC-9: Non-Goal 어휘(재주문 추천·원가율·메뉴마진·POS 연동)가 섞이면 검증 실패로 처리한다")
    void rejectsNonGoalVocabulary() {
        assertThat(PurchaseInsightNarrator.passesValidation("신선유통 쪽으로 재주문 추천 드려요.")).isFalse();
        assertThat(PurchaseInsightNarrator.passesValidation("이번 달 원가율이 낮아졌어요.")).isFalse();
        assertThat(PurchaseInsightNarrator.passesValidation("메뉴마진을 개선해 보세요.")).isFalse();
        assertThat(PurchaseInsightNarrator.passesValidation("POS 연동을 하면 더 편해요.")).isFalse();
        assertThat(PurchaseInsightNarrator.passesValidation("재고차감이 자동으로 됐어요.")).isFalse();
    }

    @Test
    @DisplayName("금지어·Non-Goal 어휘 없는 정상 코멘트는 검증을 통과한다(오탐 방지)")
    void acceptsCleanComment() {
        assertThat(PurchaseInsightNarrator.passesValidation(
                "이번 달은 행복마트 비중이 가장 높았고, 최근 두 달간 매입 합계는 늘어나는 추세예요.")).isTrue();
    }

    @Test
    @DisplayName("프롬프트는 Non-Goal 경계·법적 확언 금지를 명시하고 거래처명을 익명화한다")
    void promptStatesInvariantsAndInputs() {
        String prompt = PurchaseInsightNarrator.buildPrompt(vendors(), months());

        assertThat(prompt).contains("재고 자동 차감");
        assertThat(prompt).contains("원가율");
        assertThat(prompt).contains("메뉴 마진");
        assertThat(prompt).contains("POS 연동");
        assertThat(prompt).contains("법적 확언");
        assertThat(prompt).contains("거래처A=500000원");
        assertThat(prompt).doesNotContain("행복마트", "신선유통");
        assertThat(prompt).contains("2026-07=700000원");
    }

    @Test
    @DisplayName("LLM 응답의 익명 거래처명은 검증 후 실제 표시명으로 복원한다")
    void restoresVendorNameAfterValidation() {
        TextGenerationClient client = readyClient("거래처A의 매입 비중은 62.5%예요.");
        PurchaseInsightNarrator narrator = new PurchaseInsightNarrator(Optional.of(client));

        assertThat(narrator.summarize(vendors(), months()))
                .isEqualTo("행복마트의 매입 비중은 62.5%예요.");
    }

    @Test
    @DisplayName("입력에 없는 숫자나 거래처 라벨을 만든 응답은 폐기한다")
    void rejectsInventedFacts() {
        PurchaseInsightNarrator numberNarrator = new PurchaseInsightNarrator(
                Optional.of(readyClient("거래처A 비중은 99%예요.")));
        PurchaseInsightNarrator vendorNarrator = new PurchaseInsightNarrator(
                Optional.of(readyClient("거래처C 비중이 높아요.")));

        assertThat(numberNarrator.summarize(vendors(), months())).isNull();
        assertThat(vendorNarrator.summarize(vendors(), months())).isNull();
    }

    private static TextGenerationClient readyClient(String response) {
        TextGenerationClient client = mock(TextGenerationClient.class);
        when(client.isReady()).thenReturn(true);
        when(client.complete(org.mockito.ArgumentMatchers.anyString())).thenReturn(response);
        return client;
    }
}
