package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 일자별 인건비율. 매출 미입력/0원이면 ratio 는 null (FE 에서 "매출 입력 필요" 표시).
 *
 * @param date      일자
 * @param laborCost 해당 일자 출퇴근 기록 기반 인건비 합(원)
 * @param sales     해당 일자 매출(원, 미입력이면 null)
 * @param ratio     인건비/매출 (sales 가 null/0 이면 null)
 */
public record DailyLaborRatioDto(LocalDate date, Long laborCost, Long sales, Double ratio) {
}
