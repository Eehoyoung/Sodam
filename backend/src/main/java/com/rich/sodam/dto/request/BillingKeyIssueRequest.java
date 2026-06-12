package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 빌링키 발급 요청 (카드 인증 후 FE 에서 받은 authKey 로 영구 키 교환).
 */
@Getter
@Setter
@NoArgsConstructor
public class BillingKeyIssueRequest {

    @NotBlank(message = "authKey 가 필요합니다.")
    private String authKey;

    @NotNull(message = "구독 플랜이 필요합니다.")
    private PlanType plan;

    /** 청구 주기(월/반년/연). 미지정 시 월납. */
    private BillingCycle billingCycle = BillingCycle.MONTHLY;
}
