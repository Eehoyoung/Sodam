package com.rich.sodam.dto.response;

import java.util.List;

/**
 * 두루누리·고용지원금 자격 자동판정 (B7/M-NEW-03).
 *
 * <p>사장 대상 사업주 지원금. 자격 가능성 안내까지만 — 실제 신청·지원액은 근로복지공단/정부24 위임.
 *
 * @param storeUnder10  근로자 10인 미만(두루누리 사업장 요건) 충족
 * @param eligibleCount 지원 가능 추정 직원 수
 * @param candidates    직원별 판정
 */
public record SubsidyEligibilityResponse(
        Long storeId,
        int employeeCount,
        boolean storeUnder10,
        int eligibleCount,
        List<Candidate> candidates,
        String guidance,
        String disclaimer
) {
    public record Candidate(Long employeeId, String employeeName, Integer monthlyWageEstimate, boolean eligible) {
    }
}
