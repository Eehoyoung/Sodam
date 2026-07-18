package com.rich.sodam.dto.response;

import com.rich.sodam.domain.JobAvailabilityDay;

import java.util.List;

/**
 * {@code GET /api/stores/{storeId}/job-seekers} 리스트 항목(260711_작업통합.md Part 2 §5.3).
 *
 * <p>PII 최소화(security.md) — phone/email/생년월일 원문은 절대 포함하지 않는다. {@code age} 만
 * birthDate 기반으로 파생 계산해 노출한다. 엔티티 직접 반환 금지 원칙에 따라 이 DTO 로만 응답한다.</p>
 *
 * @param userId            구직자 사용자 ID
 * @param name              이름
 * @param age               만 나이(birthDate 미입력 시 null)
 * @param currentEmployment 현재 소속(없으면 null → FE "휴직중")
 * @param desiredLocations  희망지역 주소 목록(좌표 미포함)
 * @param seekingTypes      구직 유형(대타/정기 뱃지)
 * @param jobCategories     업종 분류
 * @param categoryMatched   매장 업종({@code Store.businessType}) 매핑과 일치 여부(BE 파생, 매핑 불가 시 false)
 * @param availability      요일별 근무 가능 시간
 * @param availableToday    오늘 요일 근무 가능 여부(BE 파생, Asia/Seoul 기준)
 * @param distanceMeters    두 희망지역 중 가까운 쪽까지의 거리(미터)
 * @param offerStatus       이 매장이 이 구직자에게 보낸 최신 채용 제안({@link com.rich.sodam.domain.JobOffer})의
 *                          유효 상태(null/"PENDING"/"ACCEPTED"/"DECLINED"/"EXPIRED"). 제안을 보낸 적이 없으면
 *                          null. EXPIRED 는 {@code JobOfferService} 의 lazy 판정 헬퍼를 그대로 재사용해 계산한다
 *                          (260711_작업통합.md Part 2 §15.3, offerStatus 필드 갭 해소 — Phase6 팔로우업)
 */
public record JobSeekerListItemResponse(
        Long userId,
        String name,
        Integer age,
        JobSeekingProfileResponse.CurrentEmployment currentEmployment,
        List<String> desiredLocations,
        List<String> seekingTypes,
        List<String> jobCategories,
        boolean categoryMatched,
        List<JobAvailabilityDay> availability,
        boolean availableToday,
        long distanceMeters,
        String offerStatus
) {
}
