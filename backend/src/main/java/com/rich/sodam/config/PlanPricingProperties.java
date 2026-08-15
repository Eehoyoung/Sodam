package com.rich.sodam.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 플랜 월정액 override 인프라(WP-8: 가격 구조 배선 — 실행 아님).
 *
 * <p>모든 override 값은 <b>미설정 시 null</b>이며, null이면 현행({@link com.rich.sodam.domain.type.PlanType}
 * enum에 선언된 값)을 그대로 유지한다. 실제 값 적용은 환경변수/설정으로만 가능하다
 * (예: {@code SODAM_PRICING_STARTER_MONTHLY_KRW}).
 *
 * <p>⚠️ 가격 변경은 인간 승인 사안이므로(게이트 H-7), 여기서 값을 채워 배포하는 것 자체가
 * 승인 게이트다. 코드는 "끼워넣을 자리"만 제공한다({@link com.rich.sodam.config.AbTestProperties}
 * 선례와 동일 철학). 이 클래스 자체를 만드는 이번 작업에서는 실제 가격 숫자를 바꾸지 않는다.
 *
 * <p>FREE는 항상 0원이라 override 대상이 아니다. PlanType enum의 선언 순서(티어 서열)는
 * 건드리지 않는다 — 가격은 이 설정으로만 조정한다.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sodam.pricing")
public class PlanPricingProperties {

    /** STARTER 월정액 override(원). null = 현행값(PlanType.STARTER 선언값) 유지. */
    private Integer starterMonthlyKrw;

    /** PRO 월정액 override(원). null = 현행값 유지. */
    private Integer proMonthlyKrw;

    /** PREMIUM 월정액 override(원). null = 현행값 유지. */
    private Integer premiumMonthlyKrw;
}
