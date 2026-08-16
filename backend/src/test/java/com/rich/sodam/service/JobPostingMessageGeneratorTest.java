package com.rich.sodam.service;

import com.rich.sodam.domain.type.JobCategory;
import com.rich.sodam.domain.type.JobWorkType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-4 — 채용공고 소개문 생성 단위 테스트. 실제 네트워크 없이 순수 로직만 검증한다.
 */
class JobPostingMessageGeneratorTest {

    @Test
    @DisplayName("AnthropicTextClient 빈이 없으면(provider 미설정) draft는 null이다(외부 호출 없음)")
    void returnsNullWhenClientAbsent() {
        JobPostingMessageGenerator generator = new JobPostingMessageGenerator(Optional.empty());

        String draft = generator.generate(JobWorkType.REGULAR, JobCategory.CAFE, 11_000,
                LocalTime.of(9, 0), LocalTime.of(18, 0));

        assertThat(draft).isNull();
    }

    @Test
    @DisplayName("HC-1 금지어가 포함된 응답은 검증 실패로 처리한다")
    void rejectsForbiddenPhrase() {
        assertThat(JobPostingMessageGenerator.passesValidation("이 조건이면 100% 안전합니다.")).isFalse();
    }

    @Test
    @DisplayName("응답 길이가 200자를 초과하면 필드 제약 위반으로 검증 실패 처리한다")
    void rejectsWhenTooLong() {
        assertThat(JobPostingMessageGenerator.passesValidation("가".repeat(201))).isFalse();
    }

    @Test
    @DisplayName("HC-10: 성별 제한/우대 표현이 포함되면 검증 실패로 처리한다")
    void rejectsGenderRestriction() {
        assertThat(JobPostingMessageGenerator.passesValidation("여성만 지원 가능합니다.")).isFalse();
        assertThat(JobPostingMessageGenerator.passesValidation("남자만 뽑아요.")).isFalse();
        assertThat(JobPostingMessageGenerator.passesValidation("여성 우대합니다.")).isFalse();
        assertThat(JobPostingMessageGenerator.passesValidation("남성 우대해요.")).isFalse();
    }

    @Test
    @DisplayName("HC-10: 연령 우대/제한 표현이 포함되면 검증 실패로 처리한다")
    void rejectsAgeRestriction() {
        assertThat(JobPostingMessageGenerator.passesValidation("20대 우대합니다.")).isFalse();
        assertThat(JobPostingMessageGenerator.passesValidation("30대 이하만 가능해요.")).isFalse();
        assertThat(JobPostingMessageGenerator.passesValidation("나이 제한이 있어요.")).isFalse();
    }

    @Test
    @DisplayName("HC-10: 결혼여부·병역여부 우대 표현이 포함되면 검증 실패로 처리한다")
    void rejectsMaritalOrMilitaryPreference() {
        assertThat(JobPostingMessageGenerator.passesValidation("미혼 우대합니다.")).isFalse();
        assertThat(JobPostingMessageGenerator.passesValidation("군필 우대해요.")).isFalse();
    }

    @Test
    @DisplayName("금지어·차별 표현 없는 정상 소개문은 검증을 통과한다(오탐 방지)")
    void acceptsCleanNormalMessage() {
        assertThat(JobPostingMessageGenerator.passesValidation(
                "카페에서 함께 일할 정직원을 모집합니다. 성실하신 분이면 누구나 환영해요.")).isTrue();
    }

    @Test
    @DisplayName("프롬프트는 차별 금지·법적 확언 금지를 명시하고 구조화 입력을 포함한다")
    void promptStatesInvariantsAndInputs() {
        String prompt = JobPostingMessageGenerator.buildPrompt(
                JobWorkType.SUBSTITUTE, JobCategory.BAKERY, 12_000, LocalTime.of(10, 0), LocalTime.of(15, 0));

        assertThat(prompt).contains("차별 금지");
        assertThat(prompt).contains("법적 확언");
        assertThat(prompt).contains("당일 대타");
        assertThat(prompt).contains("베이커리");
        assertThat(prompt).contains("12000원");
    }
}
