package com.rich.sodam.service;

import com.rich.sodam.dto.response.TaxPaymentReadinessResponse;
import com.rich.sodam.exception.PaymentUnavailableException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TaxPaymentReadinessService {

    public static final String CALLBACK_PATH = "/api/billing/tax-orders/callback";
    private final PaymentReadinessService paymentReadinessService;

    public TaxPaymentReadinessResponse readiness() {
        return paymentReadinessService.readiness(PaymentProduct.TAX_SERVICE);
    }

    public void assertAvailable() {
        if (readiness().getMode() == TaxPaymentReadinessResponse.Mode.UNAVAILABLE) {
            throw new PaymentUnavailableException();
        }
    }

}
