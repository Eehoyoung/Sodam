package com.rich.sodam.service;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PaymentProduct {
    TAX_SERVICE(
            "/api/billing/tax-orders/callback",
            "sodam://payment/tax-service/success",
            "sodam://payment/tax-service/fail"),
    ATTENDANCE_CREDIT(
            "/attendance-credit-charge",
            "sodam://payment/attendance-credit/success",
            "sodam://payment/attendance-credit/fail");

    private final String callbackPath;
    private final String mockSuccessUrl;
    private final String mockFailUrl;
}
