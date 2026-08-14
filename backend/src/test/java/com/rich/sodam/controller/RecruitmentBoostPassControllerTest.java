package com.rich.sodam.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.RecruitmentBoostPassOrder;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.RecruitmentBoostPassProductCode;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.RecruitmentBoostPassService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 채용 부스트 무제한 패스 API 역할/BOLA 테스트 — 사장 전용 애드온이므로 직원/일반회원 접근 403,
 * 사장 본인 흐름(상태 조회 → 주문 생성 → 승인) 정상 동작을 고정한다
 * (recruitment-monetization-gamification-plan.md §2.5, §7).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RecruitmentBoostPassControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private RecruitmentBoostPassService passService;

    private int emailSeq = 0;

    private User master() {
        User u = new User("boost_pass_ctrl_master" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        u.setPassword("$2a$10$dummy");
        return userRepo.save(u);
    }

    private User employee() {
        User u = new User("boost_pass_ctrl_emp" + (emailSeq++) + "@x.com", "직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        u.setPassword("$2a$10$dummy");
        u = userRepo.save(u);
        employeeProfileRepo.save(new EmployeeProfile(u));
        return u;
    }

    private RequestPostProcessor asPrincipal(User user) {
        return user(UserPrincipal.create(user));
    }

    @Test
    @DisplayName("직원 토큰으로 GET /api/recruitment-boost-passes/me → 403 (MasterOnly)")
    void employeeToken_me_forbidden() throws Exception {
        User emp = employee();

        mockMvc.perform(get("/api/recruitment-boost-passes/me").with(asPrincipal(emp)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("사장 본인 상태 조회 → 200, 비활성 상태 + 상품 3종")
    void masterToken_me_ok() throws Exception {
        User master = master();

        mockMvc.perform(get("/api/recruitment-boost-passes/me").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.products.length()").value(3));
    }

    @Test
    @DisplayName("사장 본인 결제 준비 상태 조회 -> MOCK")
    void masterToken_paymentReadiness_ok() throws Exception {
        User master = master();

        mockMvc.perform(get("/api/recruitment-boost-passes/payment-readiness").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("MOCK"))
                .andExpect(jsonPath("$.successUrl").value("sodam://payment/recruitment-boost-pass/success"))
                .andExpect(jsonPath("$.failUrl").value("sodam://payment/recruitment-boost-pass/fail"));
    }

    @Test
    @DisplayName("사장 본인 주문 생성 → 200, PENDING 상태로 orderId/금액 반환")
    void masterToken_createOrder_ok() throws Exception {
        User master = master();

        mockMvc.perform(post("/api/recruitment-boost-passes/orders")
                        .param("productCode", "THREE_DAY")
                        .with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.amountKrw").value(9900))
                .andExpect(jsonPath("$.durationDays").value(3));
    }

    @Test
    @DisplayName("타인이 생성한 주문의 orderId로 결제 승인 시도 → 400(IllegalState → BAD_REQUEST 매핑), 활성화되지 않음")
    void foreignUser_cannotConfirmSomeoneElsesOrder() throws Exception {
        User owner = master();
        User intruder = master();
        RecruitmentBoostPassOrder order = passService.createOrder(owner.getId(), RecruitmentBoostPassProductCode.THREE_DAY);

        String body = "{\"paymentKey\":\"PK_INTRUDER\",\"amount\":" + order.getAmountKrw() + "}";
        mockMvc.perform(post("/api/recruitment-boost-passes/orders/" + order.getOrderId() + "/confirm")
                        .with(asPrincipal(intruder))
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("사장 본인 결제 승인 → 200, PAID + active=true로 반영")
    void masterToken_confirm_ok() throws Exception {
        User master = master();
        RecruitmentBoostPassOrder order = passService.createOrder(master.getId(), RecruitmentBoostPassProductCode.SEVEN_DAY);

        String body = "{\"paymentKey\":\"PK_OK\",\"amount\":" + order.getAmountKrw() + "}";
        mockMvc.perform(post("/api/recruitment-boost-passes/orders/" + order.getOrderId() + "/confirm")
                        .with(asPrincipal(master))
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));

        mockMvc.perform(get("/api/recruitment-boost-passes/me").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.remainingDays").value(7));
    }

    @Test
    @DisplayName("일반회원 토큰으로 GET /api/recruitment-boost-passes/orders/me → 403 (MasterOnly)")
    void personalToken_myOrders_forbidden() throws Exception {
        User u = new User("boost_pass_ctrl_personal" + (emailSeq++) + "@x.com", "일반회원");
        u.setUserGrade(UserGrade.Personal);
        u.setPassword("$2a$10$dummy");
        u = userRepo.save(u);

        mockMvc.perform(get("/api/recruitment-boost-passes/orders/me").with(asPrincipal(u)))
                .andExpect(status().isForbidden());
    }
}
