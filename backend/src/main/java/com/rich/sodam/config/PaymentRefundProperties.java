package com.rich.sodam.config;

import com.rich.sodam.config.integration.IntegrationProperties;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 환불 신청을 PG 취소까지 자동 처리할 환경. 기본 MOCK은 CI/샌드박스 흐름만 완결하고, live 자동
 * 환불은 환불정책·세무 회신 후 환경값 한 줄로만 연다.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sodam.payment-refund")
public class PaymentRefundProperties {
    private String autoProcessMode = "mock";
    public boolean allows(IntegrationProperties.Mode tossMode) {
        return autoProcessMode != null && autoProcessMode.trim().equalsIgnoreCase(tossMode.name());
    }
}
