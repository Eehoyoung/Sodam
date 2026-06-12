package com.rich.sodam.security.annotation;

import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 플랜 게이팅. 메서드 호출 전 현재 사용자의 활성 구독 플랜이 조건을 만족하는지 검사한다.
 *
 * <ul>
 *   <li>{@code min} — 최소 티어(서열). 기본 STARTER.</li>
 *   <li>{@code features} — 추가로 보유해야 하는 기능. 모두 보유해야 통과(AND).</li>
 * </ul>
 *
 * 불충족 시 {@link com.rich.sodam.exception.PlanRequiredException}(HTTP 402).
 *
 * <p>주의: 이 애너테이션은 게이팅 인프라이며, 실제 엔드포인트 적용은 결제 활성화와 함께
 * 단계적으로 진행한다(수익화 확정안 §9 M3 롤아웃).
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePlan {

    /** 접근에 필요한 최소 플랜 티어. */
    PlanType min() default PlanType.STARTER;

    /** 추가로 요구되는 기능(모두 보유해야 통과). */
    PlanFeature[] features() default {};
}
