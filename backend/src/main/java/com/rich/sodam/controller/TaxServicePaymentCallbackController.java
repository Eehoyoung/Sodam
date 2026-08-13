package com.rich.sodam.controller;

import com.rich.sodam.security.annotation.PublicEndpoint;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/billing/tax-orders/callback")
public class TaxServicePaymentCallbackController {

    private static final String SUCCESS_DEEP_LINK = "sodam://payment/tax-service/success";
    private static final String FAIL_DEEP_LINK = "sodam://payment/tax-service/fail";

    @PublicEndpoint
    @GetMapping("/success")
    public ResponseEntity<Void> success(
            @RequestParam(required = false) String paymentKey,
            @RequestParam(required = false) String orderId,
            @RequestParam(required = false) String amount) {
        return redirect(SUCCESS_DEEP_LINK, "paymentKey", paymentKey, "orderId", orderId, "amount", amount);
    }

    @PublicEndpoint
    @GetMapping("/fail")
    public ResponseEntity<Void> fail(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String message,
            @RequestParam(required = false) String orderId) {
        return redirect(FAIL_DEEP_LINK, "code", code, "message", message, "orderId", orderId);
    }

    private ResponseEntity<Void> redirect(String deepLink, String... queryPairs) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(deepLink);
        for (int index = 0; index < queryPairs.length; index += 2) {
            if (queryPairs[index + 1] != null && !queryPairs[index + 1].isBlank()) {
                builder.queryParam(queryPairs[index], queryPairs[index + 1]);
            }
        }
        return ResponseEntity.status(HttpStatus.FOUND).location(builder.build().encode().toUri()).build();
    }
}
