package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * 일일 매출 입력(사장) 요청. 같은 날 재입력 시 금액이 수정된다(upsert).
 *
 * @param saleDate 매출 발생일 (YYYY-MM-DD)
 * @param amount   매출액(원, 0 이상 — 음수는 400)
 */
public record DailySalesUpsertRequest(
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate saleDate,
        @NotNull @PositiveOrZero Long amount
) {
}
