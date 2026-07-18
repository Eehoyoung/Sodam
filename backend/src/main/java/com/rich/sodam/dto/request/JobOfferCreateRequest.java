package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * {@code POST /api/stores/{storeId}/job-offers} 요청 — 사장이 구직자에게 보내는 채용 제안
 * (260711_작업통합.md Part 2 §15.3).
 *
 * <p>업무 규칙 검증(대상 구직 여부·구직 유형 일치·대타 근무일 필수 등)은 DTO 가 아닌
 * {@code JobOfferService} 가 수행한다(api-design.md — 이중 검증 금지).</p>
 *
 * @param targetUserId 수신 구직자 사용자 ID
 * @param workType     {@code SUBSTITUTE}(당일 대타) / {@code REGULAR}(정기 채용)
 * @param workDate     대타면 필수, 정기면 null 허용(서비스에서 검증)
 * @param startTime    근무 시작 시각
 * @param endTime      근무 종료 시각
 * @param hourlyWage   제안 시급
 * @param message      한줄 메시지(선택, 200자 이내)
 */
public record JobOfferCreateRequest(
        @NotNull(message = "대상 구직자는 필수입니다.") Long targetUserId,
        @NotNull(message = "근무 형태는 필수입니다.") String workType,
        LocalDate workDate,
        @NotNull(message = "근무 시작 시각은 필수입니다.") LocalTime startTime,
        @NotNull(message = "근무 종료 시각은 필수입니다.") LocalTime endTime,
        @NotNull(message = "제안 시급은 필수입니다.") Integer hourlyWage,
        @Size(max = 200, message = "메시지는 200자 이내로 입력해 주세요.") String message
) {
}
