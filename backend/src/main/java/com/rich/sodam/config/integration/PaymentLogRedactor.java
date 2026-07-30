package com.rich.sodam.config.integration;

/** 결제 식별자·주문 참조값을 운영 로그에 남기지 않기 위한 최소 유틸리티. */
public final class PaymentLogRedactor {

    private static final String REDACTED = "[REDACTED]";

    private PaymentLogRedactor() {
    }

    public static String redact(String value) {
        return REDACTED;
    }
}
