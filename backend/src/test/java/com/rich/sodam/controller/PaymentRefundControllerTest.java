package com.rich.sodam.controller;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 환불·증빙은 사장 개인 결제 리소스라 직원·매니저 계정에 열리지 않아야 한다. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PaymentRefundControllerTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;

    private User createUser(UserGrade grade, String email) {
        User user = new User(email, "테스트"); user.setUserGrade(grade); user.setPassword("$2a$10$dummy");
        return userRepository.save(user);
    }
    private RequestPostProcessor principal(User user) { return user(UserPrincipal.create(user)); }

    @Test @DisplayName("직원과 매니저 등 EMPLOYEE 등급은 환불·영수증 API가 403이다")
    void employeeAndManagerAreForbidden() throws Exception {
        User employee = createUser(UserGrade.EMPLOYEE, "refund-employee@x.com");
        mockMvc.perform(get("/api/billing/receipts/me").with(principal(employee))).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/billing/refunds").with(principal(employee)).contentType("application/json")
                .content("{\"sourceType\":\"SUBSCRIPTION\",\"orderId\":\"ORD_1\",\"reason\":\"환불\"}"))
                .andExpect(status().isForbidden());
    }

    @Test @DisplayName("사장은 본인 증빙 목록을 조회할 수 있다")
    void masterCanReadOwnReceipts() throws Exception {
        User master = createUser(UserGrade.MASTER, "refund-master@x.com");
        mockMvc.perform(get("/api/billing/receipts/me").with(principal(master))).andExpect(status().isOk());
    }
}
