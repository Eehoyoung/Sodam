package com.rich.sodam.config.integration;

import com.rich.sodam.domain.PaymentReceipt;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** CI·개발용 결정적 증빙 발급 mock. */
@Component
@ConditionalOnProperty(prefix = "sodam.fiscal-receipt", name = "mode", havingValue = "mock", matchIfMissing = true)
public class MockFiscalReceiptIssuer implements FiscalReceiptIssuer {
    @Override public Result issue(PaymentReceipt receipt) {
        return new Result("MOCK-FISCAL-" + receipt.getId());
    }
}
