package com.rich.sodam.dto.response;

import com.rich.sodam.domain.DailySales;

import java.time.LocalDate;

/**
 * 일일 매출 응답. 미입력 날짜는 목록에 포함되지 않는다(FE가 빈 날짜를 채움).
 */
public record DailySalesResponse(LocalDate saleDate, Long amount) {

    public static DailySalesResponse from(DailySales sales) {
        return new DailySalesResponse(sales.getSaleDate(), sales.getAmount());
    }
}
