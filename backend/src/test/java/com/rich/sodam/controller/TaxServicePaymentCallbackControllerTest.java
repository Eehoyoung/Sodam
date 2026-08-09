package com.rich.sodam.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TaxServicePaymentCallbackControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void successCallbackIsPublicAndRedirectsToRegisteredDeepLink() throws Exception {
        mockMvc.perform(get("/api/billing/tax-orders/callback/success")
                        .param("paymentKey", "PK_123")
                        .param("orderId", "TAX_123")
                        .param("amount", "99000"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location",
                        "sodam://payment/tax-service/success?paymentKey=PK_123&orderId=TAX_123&amount=99000"));
    }

    @Test
    void failCallbackEncodesProviderMessageBeforeRedirect() throws Exception {
        mockMvc.perform(get("/api/billing/tax-orders/callback/fail")
                        .param("code", "PAYMENT_FAILED")
                        .param("message", "승인 실패 & 재시도"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location",
                        "sodam://payment/tax-service/fail?code=PAYMENT_FAILED&message=%EC%8A%B9%EC%9D%B8%20%EC%8B%A4%ED%8C%A8%20%26%20%EC%9E%AC%EC%8B%9C%EB%8F%84"));
    }
}
