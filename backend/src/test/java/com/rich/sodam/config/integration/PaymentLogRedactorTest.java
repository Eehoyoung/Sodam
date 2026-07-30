package com.rich.sodam.config.integration;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentLogRedactorTest {

    @Test
    void redactsPaymentReferenceWithoutRetainingAnyPartOfIt() {
        String paymentKey = "payment-key-must-not-appear-in-logs";

        String redacted = PaymentLogRedactor.redact(paymentKey);

        assertThat(redacted).isEqualTo("[REDACTED]");
        assertThat(redacted).doesNotContain(paymentKey);
    }
}
