package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * {@code PUT /api/stores/{storeId}/job-posting} 요청 — 매장당 활성 공고 1건 upsert(ON/OFF 포함)
 * (260711_작업통합.md Part 2 §19.3).
 *
 * @param workType   {@code SUBSTITUTE}(당일 대타) / {@code REGULAR}(정기 채용)
 * @param jobCategory {@link com.rich.sodam.domain.type.JobCategory} 이름
 * @param workDate   대타면 필수, 정기면 null 허용(서비스에서 검증)
 * @param startTime  근무 시작 시각
 * @param endTime    근무 종료 시각
 * @param hourlyWage 제안 시급
 * @param message    한줄 소개(선택, 200자 이내)
 * @param open       구인중 ON/OFF
 */
public record JobPostingUpsertRequest(
        @NotNull(message = "근무 형태는 필수입니다.") String workType,
        @NotNull(message = "업종은 필수입니다.") String jobCategory,
        LocalDate workDate,
        @NotNull(message = "근무 시작 시각은 필수입니다.") LocalTime startTime,
        @NotNull(message = "근무 종료 시각은 필수입니다.") LocalTime endTime,
        @NotNull(message = "시급은 필수입니다.") Integer hourlyWage,
        @Size(max = 200, message = "소개는 200자 이내로 입력해 주세요.") String message,
        @NotNull(message = "구인중 여부는 필수입니다.") Boolean open
) {
}
