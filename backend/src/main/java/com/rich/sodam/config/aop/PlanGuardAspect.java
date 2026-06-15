package com.rich.sodam.config.aop;

import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.PlanAccessService;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

/**
 * {@link RequirePlan} 가 붙은 메서드 호출 전에 현재 사용자의 구독 플랜을 검사한다.
 * 불충족 시 {@link com.rich.sodam.exception.PlanRequiredException}(402) 전파.
 */
@Aspect
@Component
@RequiredArgsConstructor
public class PlanGuardAspect {

    private final PlanAccessService planAccessService;

    @Before("@annotation(requirePlan)")
    public void enforcePlan(RequirePlan requirePlan) {
        planAccessService.assertAccess(requirePlan.min(), requirePlan.features());
    }
}
