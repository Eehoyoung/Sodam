package com.rich.sodam.service;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.dto.response.TaxPaymentReadinessResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;

@Service
@RequiredArgsConstructor
public class PaymentReadinessService {

    private final IntegrationProperties integrationProperties;

    public TaxPaymentReadinessResponse readiness(PaymentProduct product) {
        return switch (integrationProperties.getToss().resolvedMode()) {
            case MOCK -> new TaxPaymentReadinessResponse(
                    TaxPaymentReadinessResponse.Mode.MOCK,
                    product.getMockSuccessUrl(),
                    product.getMockFailUrl());
            case LIVE -> liveReadiness(product);
            case OFF -> unavailable();
        };
    }

    private TaxPaymentReadinessResponse liveReadiness(PaymentProduct product) {
        URI baseUrl = validHttpsBaseUrl(integrationProperties.getToss().getPublicCallbackBaseUrl());
        if (baseUrl == null) {
            return unavailable();
        }
        String base = baseUrl.toString().replaceAll("/+$", "");
        return new TaxPaymentReadinessResponse(
                TaxPaymentReadinessResponse.Mode.LIVE,
                base + product.getCallbackPath() + "/success",
                base + product.getCallbackPath() + "/fail");
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
