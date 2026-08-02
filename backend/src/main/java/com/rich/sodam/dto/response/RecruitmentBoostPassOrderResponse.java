package com.rich.sodam.dto.response;

import com.rich.sodam.domain.RecruitmentBoostPassOrder;
import com.rich.sodam.domain.type.RecruitmentBoostPassProductCode;

import java.time.LocalDateTime;

/**
 * 무제한 패스 주문 응답. FE 결제창은 {orderId, amountKrw, orderName, tossClientKey 별도} 로 결제 요청.
 */
public record RecruitmentBoostPassOrderResponse(
        Long id,
        String orderId,
        RecruitmentBoostPassProductCode productCode,
        String orderName,
        int amountKrw,
        int durationDays,
        String status,
        LocalDateTime paidAt
) {
    public static RecruitmentBoostPassOrderResponse from(RecruitmentBoostPassOrder o) {
        return new RecruitmentBoostPassOrderResponse(
                o.getId(),
                o.getOrderId(),
                o.getProductCode(),
                "채용 부스트 " + o.getProductCode().getDisplayName(),
                o.getAmountKrw(),
                o.getDurationDays(),
                o.getStatus().name(),
                o.getPaidAt()
        );
    }
}
