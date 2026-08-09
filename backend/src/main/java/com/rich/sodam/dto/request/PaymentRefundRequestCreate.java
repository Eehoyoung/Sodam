package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.PaymentSourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PaymentRefundRequestCreate {
    @NotNull private PaymentSourceType sourceType;
    @NotBlank @Size(max = 80) private String orderId;
    @NotBlank @Size(min = 2, max = 500) private String reason;
}
