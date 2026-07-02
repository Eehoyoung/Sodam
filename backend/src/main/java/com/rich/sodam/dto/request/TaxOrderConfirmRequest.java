package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 세무 주문 결제 승인 요청. 토스 결제창 성공 콜백에서 받은 값.
 */
@Getter
@Setter
@NoArgsConstructor
public class TaxOrderConfirmRequest {

    @NotBlank(message = "paymentKey 가 필요합니다.")
    private String paymentKey;

    @Positive(message = "결제 금액이 올바르지 않습니다.")
    private int amount;
}
