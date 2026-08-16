package com.rich.sodam.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-1 — 출퇴근 정정 사유 다듬기 단위 테스트. 실제 네트워크 없이 순수 로직만 검증한다.
 * AnthropicTextClient 빈이 없는(= provider 미설정) 경로가 이 프로젝트의 기본값이므로
 * Optional.empty() 로 그 상태를 재현한다.
 */
class AttendanceCorrectionReasonRefinerTest {

    @Test
    @DisplayName("AnthropicTextClient 빈이 없으면(provider 미설정) 원본 사유를 그대로 반환한다(외부 호출 없음)")
    void returnsOriginalWhenClientAbsent() {
        AttendanceCorrectionReasonRefiner refiner = new AttendanceCorrectionReasonRefiner(Optional.empty());

        assertThat(refiner.refine("사장님이 퇴근 처리를 늦게 눌러주셔서 실제 퇴근시간과 달라요")).isEqualTo("사장님이 퇴근 처리를 늦게 눌러주셔서 실제 퇴근시간과 달라요");
    }

    @Test
    @DisplayName("HC-1 금지어가 포함된 응답은 검증 실패로 처리한다")
    void rejectsForbiddenPhrase() {
        boolean valid = AttendanceCorrectionReasonRefiner.passesValidation(
                "이건 명백히 위반입니다.", "원본 사유");

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("응답 길이가 200자를 초과하면 필드 제약 위반으로 검증 실패 처리한다")
    void rejectsWhenTooLong() {
        String tooLong = "가".repeat(201);
        boolean valid = AttendanceCorrectionReasonRefiner.passesValidation(tooLong, "원본 사유");

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("원본에 없던 전화번호 패턴이 응답에 새로 생기면 검증 실패 처리한다(HC-8 방어)")
    void rejectsWhenPhoneNumberAppears() {
        boolean valid = AttendanceCorrectionReasonRefiner.passesValidation(
                "010-1234-5678 로 연락 주세요", "사장님이 퇴근 처리를 늦게 눌러주셨어요");

        assertThat(valid).isFalse();
    }

    @Test
    @DisplayName("금지어 없고 길이·PII 문제 없는 자연스러운 재서술은 검증을 통과한다")
    void acceptsCleanRephrasedText() {
        boolean valid = AttendanceCorrectionReasonRefiner.passesValidation(
                "사장님께서 퇴근 처리를 늦게 눌러 실제 퇴근 시각과 기록이 달라요.", "원본 사유");

        assertThat(valid).isTrue();
    }

    @Test
    @DisplayName("프롬프트는 사실관계 변경 금지·법적 확언 금지를 명시한다")
    void promptStatesInvariants() {
        String prompt = AttendanceCorrectionReasonRefiner.buildPrompt("원본 사유");

        assertThat(prompt).contains("새로 지어내거나 바꾸지 마라");
        assertThat(prompt).contains("법적 확언");
        assertThat(prompt).contains("원본 사유");
    }
}
