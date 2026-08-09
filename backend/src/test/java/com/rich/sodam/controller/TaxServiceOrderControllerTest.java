package com.rich.sodam.controller;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TaxServiceOrderControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private IntegrationProperties integrationProperties;

    private User freeMaster() {
        User user = new User("tax-order-free-master@example.com", "사장");
        user.setUserGrade(UserGrade.MASTER);
        user.setPassword("$2a$10$dummy");
        return userRepository.save(user);
    }

    private RequestPostProcessor asPrincipal(User user) {
        return user(UserPrincipal.create(user));
    }

    private User premiumMaster() {
        User user = new User("tax-order-premium-master@example.com", "사장");
        user.setUserGrade(UserGrade.MASTER);
        user.setPassword("$2a$10$dummy");
        user = userRepository.save(user);
        Subscription subscription = Subscription.pending(user, PlanType.PREMIUM, BillingCycle.MONTHLY, "cust_tax_premium");
        subscription.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        subscriptionRepository.save(subscription);
        return user;
    }

    @AfterEach
    void resetTossReadiness() {
        integrationProperties.getToss().setMode("mock");
        integrationProperties.getToss().setPublicCallbackBaseUrl("");
    }

    @Test
    void freeMasterIsBlockedFromTaxOrderStatefulEndpoints() throws Exception {
        User master = freeMaster();

        mockMvc.perform(post("/api/billing/tax-orders")
                        .param("packageType", "INCOME_TAX_FILING")
                        .with(asPrincipal(master)))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.errorCode").value("PLAN_REQUIRED"));

        mockMvc.perform(post("/api/billing/tax-orders/TAX_MISSING/confirm")
                        .with(asPrincipal(master))
                        .contentType("application/json")
                        .content("{\"paymentKey\":\"PK\",\"amount\":99000}"))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.errorCode").value("PLAN_REQUIRED"));

        mockMvc.perform(get("/api/billing/tax-orders/me").with(asPrincipal(master)))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.errorCode").value("PLAN_REQUIRED"));
    }

    @Test
    void readinessReturnsMockAndValidLiveCallbacksButBlocksInvalidLiveCreate() throws Exception {
        User master = premiumMaster();

        mockMvc.perform(get("/api/billing/tax-orders/payment-readiness"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/billing/tax-orders/payment-readiness").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("MOCK"))
                .andExpect(jsonPath("$.successUrl").value("sodam://payment/tax-service/success"));

        integrationProperties.getToss().setMode("live");
        integrationProperties.getToss().setPublicCallbackBaseUrl("https://pay.sodam.test/");
        mockMvc.perform(get("/api/billing/tax-orders/payment-readiness").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("LIVE"))
                .andExpect(jsonPath("$.successUrl")
                        .value("https://pay.sodam.test/api/billing/tax-orders/callback/success"))
                .andExpect(jsonPath("$.failUrl")
                        .value("https://pay.sodam.test/api/billing/tax-orders/callback/fail"))
                .andExpect(jsonPath("$.successCallbackUrl").doesNotExist())
                .andExpect(jsonPath("$.failCallbackUrl").doesNotExist());

        integrationProperties.getToss().setPublicCallbackBaseUrl("http://pay.sodam.test");
        mockMvc.perform(get("/api/billing/tax-orders/payment-readiness").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("UNAVAILABLE"));

        integrationProperties.getToss().setPublicCallbackBaseUrl("");
        mockMvc.perform(post("/api/billing/tax-orders")
                        .param("packageType", "INCOME_TAX_FILING")
                        .with(asPrincipal(master)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errorCode").value("PAYMENT_UNAVAILABLE"));

        mockMvc.perform(post("/api/billing/tax-orders/TAX_MISSING/confirm")
                        .with(asPrincipal(master))
                        .contentType("application/json")
                        .content("{\"paymentKey\":\"PK\",\"amount\":99000}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errorCode").value("PAYMENT_UNAVAILABLE"));
    }
}
