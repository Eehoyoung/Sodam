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

    public static SubscriptionResponse from(Subscription s) {
        return new SubscriptionResponse(
                s.getId(),
                s.getPlan(),
                s.getStatus(),
                s.getBillingCycle(),
                s.getCardLabel(),
                s.getCurrentPeriodEndAt(),
                s.getNextBillingAt()
        );
    }
}
