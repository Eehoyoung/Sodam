package com.rich.sodam.service;

import com.rich.sodam.dto.request.JobPostingMessageGenerateRequest;
import com.rich.sodam.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WP-4 — 소개문 생성(generateMessage) 배선 테스트. 테스트 프로필은 sodam.ai.provider가 미설정이라
 * AnthropicTextClient 빈이 없다 — 이 스위트는 "구조화 입력 파싱→생성기 위임"과
 * "provider 미설정 시 draft=null" 을 함께 실측한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class JobPostingServiceMessageGenerateTest {

    @Autowired private JobPostingService service;

    @Test
    @DisplayName("정상 구조화 입력 → provider 미설정 상태에서 draft=null(외부 호출 0)")
    void generateFallsBackToNullWhenProviderUnset() {
        JobPostingMessageGenerateRequest request = new JobPostingMessageGenerateRequest(
                "REGULAR", "CAFE", 11_000, LocalTime.of(9, 0), LocalTime.of(18, 0));

        String draft = service.generateMessage(request);

        assertThat(draft).isNull();
    }

    @Test
    @DisplayName("잘못된 근무형태 코드는 JOB_POSTING_INVALID_WORK_TYPE 400으로 거부된다")
    void invalidWorkTypeIsRejected() {
        JobPostingMessageGenerateRequest request = new JobPostingMessageGenerateRequest(
                "NOT_A_TYPE", "CAFE", 11_000, LocalTime.of(9, 0), LocalTime.of(18, 0));

        assertThatThrownBy(() -> service.generateMessage(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo("JOB_POSTING_INVALID_WORK_TYPE"));
    }

    @Test
    @DisplayName("잘못된 업종 코드는 JOB_POSTING_INVALID_CATEGORY 400으로 거부된다")
    void invalidCategoryIsRejected() {
        JobPostingMessageGenerateRequest request = new JobPostingMessageGenerateRequest(
                "REGULAR", "NOT_A_CATEGORY", 11_000, LocalTime.of(9, 0), LocalTime.of(18, 0));

        assertThatThrownBy(() -> service.generateMessage(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo("JOB_POSTING_INVALID_CATEGORY"));
    }
}
