package com.rich.sodam.dto.response;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class TaxPaymentReadinessResponse {

    public enum Mode {
        MOCK, LIVE, UNAVAILABLE
    }

    private final Mode mode;
    private final String successUrl;
    private final String failUrl;
}
