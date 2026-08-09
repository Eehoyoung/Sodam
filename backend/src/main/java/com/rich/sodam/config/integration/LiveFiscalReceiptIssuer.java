package com.rich.sodam.config.integration;

import com.rich.sodam.config.FiscalReceiptProperties;
import com.rich.sodam.domain.PaymentReceipt;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 실 대행사·발급 주체가 G-2 회신으로 확정될 때 교체할 live 경계. 임의의 외부 API를 호출하지 않아
 * 세무 판단 전 오발급을 막는다; 환경값만으로 mock/live 선택과 필요한 자격증명 자리를 준비한다.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "sodam.fiscal-receipt", name = "mode", havingValue = "live")
public class LiveFiscalReceiptIssuer implements FiscalReceiptIssuer {
    private final FiscalReceiptProperties properties;
    @Override public Result issue(PaymentReceipt receipt) {
        if (properties.getProviderBaseUrl().isBlank() || properties.getApiKey().isBlank()) {
            throw new IllegalStateException("세무 증빙 live 대행사 설정이 비어 있습니다.");
        }
        throw new IllegalStateException("G-2 회신 전에는 세무 증빙 live 발급 대행사를 활성화할 수 없습니다.");
    }
}
