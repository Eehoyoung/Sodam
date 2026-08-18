package com.rich.sodam.service;

import com.rich.sodam.service.ai.AnthropicTextClient;
import com.rich.sodam.service.ai.PiiPatterns;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * WP-3 — 채용 지원 메시지 다듬기 단위 테스트. 실제 네트워크 없이 순수 로직만 검증한다.
 */
class JobApplicationMessageRefinerTest {

    @Test
    @DisplayName("AnthropicTextClient 빈이 없으면(provider 미설정) 원본 메시지를 그대로 반환한다(외부 호출 없음)")
    void returnsOriginalWhenClientAbsent() {
        JobApplicationMessageRefiner refiner = new JobApplicationMessageRefiner(Optional.empty());

        assertThat(refiner.refine("안녕하세요, 평일 저녁 시간대 가능합니다.")).isEqualTo("안녕하세요, 평일 저녁 시간대 가능합니다.");
    }

    @Test
    @DisplayName("refine() 호출 전 전화번호를 마스킹하면 프롬프트에 원본 번호가 남지 않는다(HC-8) — masking은 refine()의 책임")
    void maskingHappensBeforePromptBuild() {
        String masked = PiiPatterns.maskPhoneLike("연락은 010-1234-5678 로 주세요", "[연락처]");
        String prompt = JobApplicationMessageRefiner.buildPrompt(masked);

        assertThat(prompt).doesNotContain("010-1234-5678");
        assertThat(prompt).contains("[연락처]");
    }

    @Test
    @DisplayName("refine() 은 실제로 client.complete() 호출 전에 전화번호를 마스킹해서 보낸다(HC-8 end-to-end)")
    void refineMasksPhoneBeforeSendingToClient() {
        AnthropicTextClient mockClient = mock(AnthropicTextClient.class);
        when(mockClient.isReady()).thenReturn(true);
        when(mockClient.complete(anyString())).thenAnswer(invocation -> {
            String prompt = invocation.getArgument(0, String.class);
            assertThat(prompt).doesNotContain("010-1234-5678").contains("[연락처]");
            return "연락 주시면 [연락처]로 답변드릴게요.";
        });
        JobApplicationMessageRefiner refiner = new JobApplicationMessageRefiner(Optional.of(mockClient));

        String result = refiner.refine("연락은 010-1234-5678 로 주세요");

        assertThat(result).isEqualTo("연락 주시면 [연락처]로 답변드릴게요.");
    }

    @Test
    @DisplayName("HC-1 금지어가 포함된 응답은 검증 실패로 처리한다")
    void rejectsForbiddenPhrase() {
        boolean valid = JobApplicationMessageRefiner.passesValidation(
                "이 정도면 100% 채용 안전합니다.", "원본 메시지");

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("응답 길이가 200자를 초과하면 필드 제약 위반으로 검증 실패 처리한다")
    void rejectsWhenTooLong() {
        String tooLong = "가".repeat(201);
        boolean valid = JobApplicationMessageRefiner.passesValidation(tooLong, "원본 메시지");

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("원본에 없던 전화번호 패턴이 응답에 새로 생기면 검증 실패 처리한다(HC-8 방어)")
    void rejectsWhenPhoneNumberAppearsInResponse() {
        boolean valid = JobApplicationMessageRefiner.passesValidation(
                "010-9999-8888 로 연락 주세요", "안녕하세요, 평일 저녁 가능합니다.");

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("원문에 있던(마스킹 전) 전화번호 패턴이 응답에도 그대로 남아있는 경우는 신규 유입이 아니므로 통과한다")
    void allowsPhonePatternThatExistedInOriginal() {
        boolean valid = JobApplicationMessageRefiner.passesValidation(
                "연락처는 010-1234-5678 입니다.", "연락처는 010-1234-5678 입니다.");

        assertThat(valid).isTrue();
    }

    @Test
    @DisplayName("금지어 없고 길이·PII 문제 없는 자연스러운 재서술은 검증을 통과한다")
    void acceptsCleanRephrasedText() {
        boolean valid = JobApplicationMessageRefiner.passesValidation(
                "안녕하세요. 평일 저녁 시간대에 근무 가능합니다. 잘 부탁드립니다.", "원본 메시지");

        assertThat(valid).isTrue();
    }

    @Test
    @DisplayName("프롬프트는 사실관계 지어내기 금지·마스킹 유지·법적 확언 금지를 명시한다")
    void promptStatesInvariants() {
        String prompt = JobApplicationMessageRefiner.buildPrompt("원본 메시지");

        assertThat(prompt).contains("새로 지어내거나 추가하지 마라");
        assertThat(prompt).contains("법적 확언");
        assertThat(prompt).contains("원본 메시지");
    }
}
