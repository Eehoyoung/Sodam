package com.rich.sodam.config;

import com.rich.sodam.domain.type.FiscalDocumentType;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 세무사 회신이 오면 document-type 한 줄만 바꿔 발급 대상을 정한다. 기본 NONE은 법적 대상·
 * 발급시점을 코드가 임의로 정하지 않는 안전값이다.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sodam.fiscal-receipt")
public class FiscalReceiptProperties {
    private String mode = "mock";
    private FiscalDocumentType defaultDocumentType = FiscalDocumentType.NONE;
    private String providerBaseUrl = "";
    private String apiKey = "";
}
