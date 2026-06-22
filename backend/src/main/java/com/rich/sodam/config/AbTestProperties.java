package com.rich.sodam.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * A/B 실험 플래그 인프라(key-ready). 과금·패키징 default 는 절대 바꾸지 않는다.
 *
 * <p>모든 override 값은 <b>미설정 시 null</b> 이며, null 이면 현행(코드의 default) 동작을 그대로 유지한다.
 * 실제 값 적용은 환경변수/설정으로만 가능하다(예: {@code SODAM_AB_FREE_EMPLOYEE_LIMIT}).
 *
 * <p>⚠️ 과금·패키징 변경은 인간 승인 사안이므로, 여기서 값을 채워 배포하는 것 자체가 승인 게이트다.
 * 코드는 "끼워넣을 자리"만 제공한다.
 *
 * application-{profile}.yml 의 'sodam.ab.*' 트리에서 매핑된다.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sodam.ab")
public class AbTestProperties {

    /**
     * FREE 플랜 직원 상한 override(2→3 A/B 실험용). null = 현행값(코드 default) 유지.
     * 설정 시에만 {@code PlanType.FREE} 상한을 덮어쓴다.
     */
    private Integer freeEmployeeLimit;

    /**
     * FREE 플랜에 월 1회 무료 명세서 발급 허용 override. null = 현행(미허용) 유지.
     */
    private Boolean freeMonthlyPayslip;

    public boolean hasFreeEmployeeLimitOverride() {
        return freeEmployeeLimit != null;
    }

    public boolean isFreeMonthlyPayslipEnabled() {
        return Boolean.TRUE.equals(freeMonthlyPayslip);
    }
}
