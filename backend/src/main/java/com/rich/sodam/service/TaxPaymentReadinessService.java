package com.rich.sodam.service;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.dto.response.TaxPaymentReadinessResponse;
import com.rich.sodam.exception.PaymentUnavailableException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;

@Service
@RequiredArgsConstructor
public class TaxPaymentReadinessService {

    public static final String CALLBACK_PATH = "/api/billing/tax-orders/callback";
    private static final String MOCK_SUCCESS_URL = "sodam://payment/tax-service/success";
    private static final String MOCK_FAIL_URL = "sodam://payment/tax-service/fail";

    private final IntegrationProperties integrationProperties;

    public TaxPaymentReadinessResponse readiness() {
        return switch (integrationProperties.getToss().resolvedMode()) {
            case MOCK -> new TaxPaymentReadinessResponse(TaxPaymentReadinessResponse.Mode.MOCK,
                    MOCK_SUCCESS_URL, MOCK_FAIL_URL);
            case LIVE -> liveReadiness();
            case OFF -> unavailable();
        };
    }

    public void assertAvailable() {
        if (readiness().getMode() == TaxPaymentReadinessResponse.Mode.UNAVAILABLE) {
            throw new PaymentUnavailableException();
        }
    }

    private TaxPaymentReadinessResponse liveReadiness() {
        URI baseUrl = validHttpsBaseUrl(integrationProperties.getToss().getPublicCallbackBaseUrl());
        if (baseUrl == null) {
            return unavailable();
        }
        String base = baseUrl.toString().replaceAll("/+$", "");
        return new TaxPaymentReadinessResponse(TaxPaymentReadinessResponse.Mode.LIVE,
                base + CALLBACK_PATH + "/success", base + CALLBACK_PATH + "/fail");
    }

    private URI validHttpsBaseUrl(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(value.trim());
            if (!uri.isAbsolute() || !"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                    || uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null) {
                return null;
            }
            return uri;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private TaxPaymentReadinessResponse unavailable() {
        return new TaxPaymentReadinessResponse(TaxPaymentReadinessResponse.Mode.UNAVAILABLE, null, null);
    }
}
