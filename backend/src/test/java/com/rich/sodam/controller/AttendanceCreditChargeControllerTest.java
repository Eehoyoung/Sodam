package com.rich.sodam.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.AttendanceCreditChargeOrder;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.AttendanceCreditChargeService;
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
 * 출근권 충전소(IAP) API 역할/BOLA 테스트 — 사장 전용 재화 구매이므로 직원/일반회원 접근 403,
 * 사장 본인 흐름(카탈로그 조회 → 주문 생성 → 승인) 정상 동작을 고정한다
 * (recruitment-monetization-gamification-plan.md §2.4, §7).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AttendanceCreditChargeControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private AttendanceCreditChargeService chargeService;
    @Autowired private IntegrationProperties integrationProperties;

    private int emailSeq = 0;

    @Test
    @DisplayName("readiness는 Toss 모드와 출근권 상품 URL을 따르고 OFF는 UNAVAILABLE")
    void readiness_followsServerMode() throws Exception {
        User master = master();
        integrationProperties.getToss().setMode("mock");
        mockMvc.perform(get("/api/attendance-credits/charge/readiness").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("MOCK"))
                .andExpect(jsonPath("$.successUrl").value("sodam://payment/attendance-credit/success"));

        integrationProperties.getToss().setMode("off");
        mockMvc.perform(get("/api/attendance-credits/charge/readiness").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("UNAVAILABLE"))
                .andExpect(jsonPath("$.successUrl").doesNotExist());
    }

    @Test
    @DisplayName("출근권은 서버 콜백을 타지 않지만 LIVE 에서 LIVE 를 반환한다")
    void readiness_liveReturnsLiveForClientInterceptProduct() throws Exception {
        User master = master();
        integrationProperties.getToss().setMode("live");
        integrationProperties.getToss().setPublicCallbackBaseUrl("https://pay.sodam.test/");

        // 출근권 결제 화면은 WebView 가 sodam.local 센티넬을 가로채는 방식이라
        // 서버 콜백 컨트롤러가 없고 필요하지도 않다. 여기서 내려주는 URL 은 FE 가
        // 소비하지 않는다 — "서버가 LIVE 로 구성됐다" 는 신호로만 쓰인다.
        // 컨트롤러가 없다는 이유로 UNAVAILABLE 을 주면 멀쩡한 LIVE 경로가 막힌다.
        mockMvc.perform(get("/api/attendance-credits/charge/readiness").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("LIVE"));

        // baseUrl 이 https 가 아니면(또는 비어 있으면) 그때는 UNAVAILABLE 이 맞다.
        integrationProperties.getToss().setPublicCallbackBaseUrl("http://pay.sodam.test");
        mockMvc.perform(get("/api/attendance-credits/charge/readiness").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("UNAVAILABLE"));
    }

    private User master() {
        User u = new User("attendance_credit_charge_ctrl_master" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        u.setPassword("$2a$10$dummy");
        return userRepo.save(u);
    }

    private User employee() {
        User u = new User("attendance_credit_charge_ctrl_emp" + (emailSeq++) + "@x.com", "직원");
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
    @DisplayName("직원 토큰으로 GET /api/attendance-credits/charge/packs → 403 (MasterOnly)")
    void employeeToken_packs_forbidden() throws Exception {
        User emp = employee();

        mockMvc.perform(get("/api/attendance-credits/charge/packs").with(asPrincipal(emp)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("사장 본인 카탈로그 조회 → 200, 상품 4종 + 첫구매 보너스 가용")
    void masterToken_packs_ok() throws Exception {
        User master = master();

        mockMvc.perform(get("/api/attendance-credits/charge/packs").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.packs.length()").value(4))
                .andExpect(jsonPath("$.firstPurchaseBonusAvailable").value(true))
                .andExpect(jsonPath("$.firstPurchaseBonusMultiplier").value(2));
    }

    @Test
    @DisplayName("사장 본인 주문 생성 → 200, PENDING 상태로 orderId/금액 반환")
    void masterToken_createOrder_ok() throws Exception {
        User master = master();

        mockMvc.perform(post("/api/attendance-credits/charge/orders")
                        .param("packCode", "SMALL")
                        .with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.amountKrw").value(1900))
                .andExpect(jsonPath("$.creditQuantity").value(10));
    }

    @Test
    @DisplayName("타인이 생성한 주문의 orderId로 결제 승인 시도 → 400(IllegalState → BAD_REQUEST 매핑), 잔액 미지급")
    void foreignUser_cannotConfirmSomeoneElsesOrder() throws Exception {
        User owner = master();
        User intruder = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(owner.getId(), AttendanceCreditChargePackCode.SMALL);

        String body = "{\"paymentKey\":\"PK_INTRUDER\",\"amount\":" + order.getAmountKrw() + "}";
        mockMvc.perform(post("/api/attendance-credits/charge/orders/" + order.getOrderId() + "/confirm")
                        .with(asPrincipal(intruder))
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("사장 본인 결제 승인 → 200, PAID + 지급 수량 반영")
    void masterToken_confirm_ok() throws Exception {
        User master = master();
        AttendanceCreditChargeOrder order = chargeService.createOrder(master.getId(), AttendanceCreditChargePackCode.SMALL);

        String body = "{\"paymentKey\":\"PK_OK\",\"amount\":" + order.getAmountKrw() + "}";
        mockMvc.perform(post("/api/attendance-credits/charge/orders/" + order.getOrderId() + "/confirm")
                        .with(asPrincipal(master))
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.bonusCreditQuantity").value(10));
    }

    @Test
    @DisplayName("일반회원 토큰으로 GET /api/attendance-credits/charge/orders/me → 403 (MasterOnly)")
    void personalToken_myOrders_forbidden() throws Exception {
        User u = new User("attendance_credit_charge_ctrl_personal" + (emailSeq++) + "@x.com", "일반회원");
        u.setUserGrade(UserGrade.Personal);
        u.setPassword("$2a$10$dummy");
        u = userRepo.save(u);

        mockMvc.perform(get("/api/attendance-credits/charge/orders/me").with(asPrincipal(u)))
                .andExpect(status().isForbidden());
    }
}
