package com.rich.sodam.dto.response;

import com.rich.sodam.domain.JobAvailabilityDay;

import java.time.LocalDate;
import java.util.List;

/**
 * {@code GET/PUT /api/job-seekers/me} 응답(260711_작업통합.md Part 2 §5.3).
 *
 * <p>PII 최소화(security.md) — phone/email/생년월일 원문은 포함하지 않는다. 좌표도 내부 매칭용이라
 * 응답에 포함하지 않고 주소 문자열만 노출한다.</p>
 *
 * @param eligible          인증채용 자격(소담 출퇴근 이력) 여부 — FE 토글 비활성/안내 분기용
 * @param seeking           구직중 여부
 * @param locations         희망지역(주소만, 좌표 미포함)
 * @param seekingTypes      구직 유형(SUBSTITUTE/REGULAR)
 * @param jobCategories     업종 분류
 * @param availability      요일별 근무 가능 시간
 * @param currentEmployment 현재 소속(활성 재직 없으면 null → FE "휴직중" 표시)
 */
public record JobSeekingProfileResponse(
        boolean eligible,
        boolean seeking,
        List<DesiredLocation> locations,
        List<String> seekingTypes,
        List<String> jobCategories,
        List<JobAvailabilityDay> availability,
        CurrentEmployment currentEmployment
) {

    /** 희망지역 1곳 — 주소만 노출(좌표는 내부 매칭 전용, 응답 미포함). */
    public record DesiredLocation(String address) {
    }

    /** 현재 소속(활성 재직) 1곳 — 복수 활성 소속이면 호출측이 최근 hireDate 항목을 채택해 전달한다. */
    public record CurrentEmployment(String storeName, LocalDate hireDate) {
    }
}
