package com.rich.sodam.exception;

import com.rich.sodam.domain.type.PlanType;
import lombok.Getter;

/**
 * 현재 구독 플랜으로 접근이 허용되지 않는 기능을 호출했을 때.
 * HTTP 402(Payment Required) 로 매핑되어 FE 가 업그레이드(페이월)를 유도한다.
 */
@Getter
public class PlanRequiredException extends RuntimeException {

    /** 접근에 필요한 최소 플랜 */
    private final PlanType requiredPlan;
    /** 현재(사용자) 플랜 */
    private final PlanType currentPlan;

    public PlanRequiredException(PlanType requiredPlan, PlanType currentPlan, String message) {
        super(message);
        this.requiredPlan = requiredPlan;
        this.currentPlan = currentPlan;
    }
}
