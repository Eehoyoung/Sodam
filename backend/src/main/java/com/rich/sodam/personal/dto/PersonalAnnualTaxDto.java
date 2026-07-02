package com.rich.sodam.personal.dto;

import java.util.List;

/**
 * 긱워커 연간 사업소득·환급 신호 (B3/T-NEW-03).
 *
 * <p>멀티 근무지의 연간 소득을 합산하고 3.3% 기납부세액을 추정해 환급 가능성을 안내한다.
 * 신고·환급은 홈택스/정부24 위임(앱은 집계·안내까지만).
 *
 * @param totalIncome     연간 소득 추정(시급×근무시간 합)
 * @param withheldEstimate 3.3% 원천징수 추정(기납부세액)
 * @param refundPossible  환급 가능성 안내 여부
 * @param perWorkplace    근무지별 소득·기납부
 */
public record PersonalAnnualTaxDto(
        int year,
        long totalIncome,
        long withheldEstimate,
        boolean refundPossible,
        List<WorkplaceIncome> perWorkplace,
        String guidance,
        String disclaimer
) {
    public record WorkplaceIncome(Long workplaceId, String workplaceName, long income, long withheld) {
    }
}
