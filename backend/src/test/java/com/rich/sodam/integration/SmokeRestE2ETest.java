package com.rich.sodam.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 500 에러를 일으키던 6개 엔드포인트의 회귀 방지 스모크 테스트.
 *
 * 왜 통합 테스트인가?
 * - 단위 테스트로는 Spring MVC 인자 바인딩 / Security / Jackson 직렬화 경로를 잡을 수 없다.
 * - 각 케이스는 사전 시드를 메서드별로 준비하여 테스트 간 의존을 끊는다.
 *
 * 인증은 spring-security-test 의 user() Request Post Processor 로 모킹.
 * dev 프로필로 H2 + InMemoryTokenStore + Mock 외부 통합 활성화.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class SmokeRestE2ETest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeProfileRepository employeeProfileRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private EmployeeStoreRelationRepository employeeStoreRelationRepository;

    private User masterUser;
    private User employeeUser;
    private Store store;

    @BeforeEach
    void setUp() {
        // 사장 — 매장 메모/푸시 발송 액터
        masterUser = new User("master_smoke@example.com", "스모크사장");
        masterUser.setUserGrade(UserGrade.MASTER);
        masterUser.setPassword("$2a$10$dummy");
        masterUser = userRepository.save(masterUser);

        // 직원 — 메모 대상 / 휴가 셀프 신청자 / 푸시 수신자
        employeeUser = new User("employee_smoke@example.com", "스모크직원");
        employeeUser.setUserGrade(UserGrade.EMPLOYEE);
        employeeUser.setPassword("$2a$10$dummy");
        employeeUser = userRepository.save(employeeUser);

        EmployeeProfile profile = new EmployeeProfile(employeeUser);
        employeeProfileRepository.save(profile);

        // 매장 — DevSeed 의 '1234567890' 과 충돌 회피 위해 unique 번호 사용
        String uniqueBizNo = String.valueOf(900_000_0000L + (System.nanoTime() % 100_000_0000L));
        store = new Store(
                "스모크 매장 " + uniqueBizNo.substring(0, 4),
                uniqueBizNo,
                "02-1234-5678",
                "음식점",
                12_000,
                100
        );
        store.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        store = storeRepository.save(store);

        // 직원-매장 관계
        EmployeeStoreRelation rel = new EmployeeStoreRelation(profile, store);
        employeeStoreRelationRepository.save(rel);
    }

    /** Spring Security 인증 컨텍스트를 UserPrincipal 로 모킹. */
    private org.springframework.test.web.servlet.request.RequestPostProcessor asPrincipal(User user) {
        UserPrincipal principal = UserPrincipal.create(user);
        return user(principal);
    }

    // =====================================================================
    // #1 — 직원 메모 PUT 200 + GET 으로 저장 확인
    // =====================================================================
    @Test
    @DisplayName("PUT /api/stores/{storeId}/employees/{employeeId}/memo — 200 + 저장 확인")
    void employeeMemo_putAndGet_ok() throws Exception {
        String memo = "성실. 토요일 가능.";
        Map<String, String> body = Map.of("memo", memo);

        mockMvc.perform(put("/api/stores/{storeId}/employees/{employeeId}/memo",
                        store.getId(), employeeUser.getId())
                        .with(asPrincipal(masterUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memo").value(memo));

        // GET 으로 저장 확인
        mockMvc.perform(get("/api/stores/{storeId}/employees/{employeeId}/memo",
                        store.getId(), employeeUser.getId())
                        .with(asPrincipal(masterUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memo").value(memo));
    }

    // =====================================================================
    // #2 — 약관 동의 회원가입 200
    // =====================================================================
    @Test
    @DisplayName("POST /api/join — 약관 동의 회원가입 200")
    void joinWithAgreements_ok() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("email", "newuser_smoke@example.com");
        body.put("password", "Sodam123!");
        body.put("name", "신규 사용자");
        body.put("ageConfirmed", true);
        body.put("termsAgreed", true);
        body.put("privacyAgreed", true);
        body.put("marketingAgreed", false);

        mockMvc.perform(post("/api/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andDo(print())
                .andExpect(status().isOk());

        assertThat(userRepository.findByEmail("newuser_smoke@example.com")).isPresent();
    }

    // =====================================================================
    // #3 — 휴가 셀프 신청 200
    // =====================================================================
    @Test
    @DisplayName("POST /api/timeoff/self — 셀프 휴가 신청 200")
    void timeOffSelf_ok() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("storeId", store.getId());
        body.put("startDate", LocalDate.now().plusDays(7).toString());
        body.put("endDate", LocalDate.now().plusDays(8).toString());
        body.put("reason", "개인 사유로 휴가 신청합니다.");

        mockMvc.perform(post("/api/timeoff/self")
                        .with(asPrincipal(employeeUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reason").value("개인 사유로 휴가 신청합니다."));
    }

    // =====================================================================
    // #4 — 사장 → 직원 푸시 발송 200
    // =====================================================================
    @Test
    @DisplayName("POST /api/notifications/push-to-employee — 사장 푸시 발송 200")
    void pushToEmployee_ok() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("employeeId", employeeUser.getId());
        body.put("title", "공지");
        body.put("body", "내일 9시까지 출근 부탁드려요.");

        mockMvc.perform(post("/api/notifications/push-to-employee")
                        .with(asPrincipal(masterUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("메시지를 전달했어요."));
    }

    // =====================================================================
    // #5 — 본인 정보 변경 PUT /api/user/me 200 + 변경 반영
    // =====================================================================
    @Test
    @DisplayName("PUT /api/user/me — 본인 이름 변경 200 + 반영")
    void updateMe_ok() throws Exception {
        String newName = "이름변경됨";
        Map<String, String> body = Map.of("name", newName);

        MvcResult result = mockMvc.perform(put("/api/user/me")
                        .with(asPrincipal(employeeUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andDo(print())
                .andExpect(status().isOk())
                .andReturn();

        // 응답에 변경된 이름 포함
        String response = result.getResponse().getContentAsString();
        assertThat(response).contains(newName);

        // DB 반영 확인
        User reloaded = userRepository.findById(employeeUser.getId()).orElseThrow();
        assertThat(reloaded.getName()).isEqualTo(newName);
    }

    // =====================================================================
    // #6 — 월간 출퇴근 200 (비어 있어도 빈 배열)
    // =====================================================================
    @Test
    @DisplayName("GET /api/attendance/employee/{employeeId}/monthly — 비어 있어도 200 + 빈 배열")
    void monthlyAttendance_emptyOk() throws Exception {
        mockMvc.perform(get("/api/attendance/employee/{employeeId}/monthly",
                        employeeUser.getId())
                        .param("year", "2026")
                        .param("month", "5")
                        .with(asPrincipal(employeeUser)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
