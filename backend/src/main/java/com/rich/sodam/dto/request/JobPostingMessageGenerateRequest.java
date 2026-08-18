package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

/**
 * {@code POST /api/stores/{storeId}/job-posting/message-generate} 요청(WP-4, {@code docs/260817} goal) —
 * 구조화 입력만으로 200자 이내 소개문 초안을 생성한다. 이미 작성한 문구를 다듬는 WP-3와 달리
 * 처음부터 만드는 생성 작업이라 message 필드가 없다.
 *
 * @param workType   {@code SUBSTITUTE}(당일 대타) / {@code REGULAR}(정기 채용)
 * @param jobCategory {@link com.rich.sodam.domain.type.JobCategory} 이름
 * @param hourlyWage 제안 시급
 * @param startTime  근무 시작 시각
 * @param endTime    근무 종료 시각
 */
public record JobPostingMessageGenerateRequest(
        @NotNull(message = "근무 형태는 필수입니다.") String workType,
        @NotNull(message = "업종은 필수입니다.") String jobCategory,
        @NotNull(message = "시급은 필수입니다.") Integer hourlyWage,
        @NotNull(message = "근무 시작 시각은 필수입니다.") LocalTime startTime,
        @NotNull(message = "근무 종료 시각은 필수입니다.") LocalTime endTime
) {
}
