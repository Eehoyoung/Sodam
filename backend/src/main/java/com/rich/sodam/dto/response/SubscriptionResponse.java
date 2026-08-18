package com.rich.sodam.dto.response;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.SubscriptionStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class SubscriptionResponse {
    private Long id;
    private PlanType plan;
    private SubscriptionStatus status;
    private BillingCycle billingCycle;
    private String cardLabel;
    private LocalDateTime currentPeriodEndAt;
    private LocalDateTime nextBillingAt;
    /** 해지 예약 시각. null 이 아니면 기간 말에 만료된다(자동갱신 중단). */
    private LocalDateTime cancelledAt;

    public static SubscriptionResponse from(Subscription s) {
        return new SubscriptionResponse(
                s.getId(),
                s.getPlan(),
                s.getStatus(),
                s.getBillingCycle(),
                s.getCardLabel(),
                s.getCurrentPeriodEndAt(),
                s.getNextBillingAt(),
                s.getCancelledAt()
        );
    }
}
