package com.rich.sodam.dto.request;

import com.rich.sodam.domain.JobAvailabilityDay;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * {@code PUT /api/job-seekers/me} 요청 — 구직 상태 토글 + 부분 업데이트(260711_작업통합.md Part 2 §5.2).
 *
 * <p>{@code seeking} 을 제외한 모든 필드는 선택(null 이면 기존 저장값 유지 — OFF→ON 재전환 시 데이터
 * 복구 사양). 도메인 규칙 검증(희망지역 2개·구직유형 1개 이상·업종 1~3개·요일 1개 이상·야간 불허 등)은
 * DTO 가 아닌 {@code JobSeekingService} 가 수행한다(api-design.md — 이중 검증 금지).</p>
 *
 * @param seeking           구직 상태(필수) — true 전환 시 서비스가 완비 검증을 수행한다
 * @param locationAddresses 희망지역 주소(선택) — 전달 시 정확히 2개(공백 제외)
 * @param seekingTypes      구직 유형(선택) — {@code SUBSTITUTE}/{@code REGULAR}
 * @param jobCategories     업종 분류(선택) — {@link com.rich.sodam.domain.type.JobCategory} 이름, 1~3개
 * @param availability      요일별 근무 가능 시간(선택) — 요일 중복 금지, 야간(종료≤시작) v1 불허
 */
public record JobSeekingUpdateRequest(
        @NotNull(message = "구직 상태는 필수입니다.") Boolean seeking,
        List<String> locationAddresses,
        List<String> seekingTypes,
        List<String> jobCategories,
        List<JobAvailabilityDay> availability
) {
}
