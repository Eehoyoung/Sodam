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
        // CLIENT_INTERCEPT 상품(출근권)은 서버 콜백을 타지 않으므로 여기서 만든 URL 이
        // FE 에서 소비되지 않는다 — LIVE 신호로만 쓰인다. 그래도 형태는 동일하게 채워
        // 응답 계약(mode/successUrl/failUrl)을 상품별로 갈라놓지 않는다.
        // ⚠️ "컨트롤러가 없으니 LIVE 를 막자" 는 판단은 틀렸다(PaymentProduct 주석 참고).
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
