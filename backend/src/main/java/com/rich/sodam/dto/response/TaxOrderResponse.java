package com.rich.sodam.dto.response;

import com.rich.sodam.domain.TaxServiceOrder;
import com.rich.sodam.domain.type.TaxPackage;

import java.time.LocalDateTime;

/**
 * 세무 주문 응답. FE 결제창은 {orderId, amount, orderName, tossClientKey 별도} 로 결제 요청.
 */
public record TaxOrderResponse(
        Long id,
        String orderId,
        TaxPackage packageType,
        String orderName,
        int amount,
        String status,
        LocalDateTime paidAt
) {
    public static TaxOrderResponse from(TaxServiceOrder o) {
        return new TaxOrderResponse(
                o.getId(),
                o.getOrderId(),
                o.getPackageType(),
                o.getPackageType().getDisplayName(),
                o.getCustomerAmount(),
                o.getStatus().name(),
                o.getPaidAt()
        );
    }
}
