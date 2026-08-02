package com.rich.sodam.dto.response;

import com.rich.sodam.domain.AttendanceCreditChargeOrder;
import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;

import java.time.LocalDateTime;

/**
 * 출근권 충전 주문 응답. FE 결제창은 {orderId, amountKrw, orderName, tossClientKey 별도} 로 결제 요청.
 */
public record AttendanceCreditChargeOrderResponse(
        Long id,
        String orderId,
        AttendanceCreditChargePackCode packCode,
        String orderName,
        int amountKrw,
        int creditQuantity,
        int bonusCreditQuantity,
        int ticketQuantity,
        String status,
        LocalDateTime paidAt
) {
    public static AttendanceCreditChargeOrderResponse from(AttendanceCreditChargeOrder o) {
        return new AttendanceCreditChargeOrderResponse(
                o.getId(),
                o.getOrderId(),
                o.getPackCode(),
                o.getPackCode().getDisplayName(),
                o.getAmountKrw(),
                o.getCreditQuantity(),
                o.getBonusCreditQuantity(),
                o.getTicketQuantity(),
                o.getStatus().name(),
                o.getPaidAt()
        );
    }
}
