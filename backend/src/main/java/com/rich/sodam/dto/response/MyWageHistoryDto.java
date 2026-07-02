package com.rich.sodam.dto.response;

import java.util.List;

/**
 * 직원 본인용 시급 이력 응답 (E-NEW-02 내 시급 이력).
 *
 * <p>본인에게 적용되는 시급(매장 기본 + 개별)의 변경 타임라인. 직원 전용이므로
 * 변경 주체(changedBy)·사장 메모(ownerMemo)는 절대 포함하지 않는다.</p>
 *
 * @param currentHourlyWage 현재 적용 시급(원). 소속 매장이 없으면 null.
 * @param history           변경 이력(적용일 내림차순). 각 항목: effectiveFrom·hourlyWage·scope·reason.
 */
public record MyWageHistoryDto(
        Integer currentHourlyWage,
        List<WageHistoryDto> history
) {
}
