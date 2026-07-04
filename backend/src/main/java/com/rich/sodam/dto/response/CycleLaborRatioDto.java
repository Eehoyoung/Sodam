package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 현재 급여 정산주기 기준 인건비율 + 직전 주기 비교.
 *
 * @param cycleStart     현재 진행 중인 정산주기 시작일
 * @param cycleEnd       현재 진행 중인 정산주기 마감일
 * @param laborCost      주기 내(오늘까지) 인건비 합(원)
 * @param sales          주기 내(오늘까지) 매출 합(원, 입력 건 없으면 null)
 * @param ratio          인건비/매출 (sales 가 null/0 이면 null)
 * @param prevCycleRatio 직전 주기 전체 비율 (산출 불가 시 null)
 */
public record CycleLaborRatioDto(LocalDate cycleStart, LocalDate cycleEnd,
                                 Long laborCost, Long sales, Double ratio, Double prevCycleRatio) {
}
