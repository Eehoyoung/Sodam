package com.rich.sodam.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.EmployeeProfileRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 출근권(AttendanceCredit) API 역할/BOLA 테스트 — 사장 전용 재화이므로 직원/일반회원 접근 403,
 * 사장 본인 조회/체크인 정상 동작을 고정한다(recruitment-monetization-gamification-plan.md §2, §5).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AttendanceCreditControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;

    private int emailSeq = 0;

    private User master() {
        User u = new User("attendance_credit_ctrl_master" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        u.setPassword("$2a$10$dummy");
        return userRepo.save(u);
    }

    private User employee() {
        User u = new User("attendance_credit_ctrl_emp" + (emailSeq++) + "@x.com", "직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        u.setPassword("$2a$10$dummy");
        u = userRepo.save(u);
        employeeProfileRepo.save(new EmployeeProfile(u));
        return u;
    }

    private User personal() {
        User u = new User("attendance_credit_ctrl_personal" + (emailSeq++) + "@x.com", "일반회원");
        u.setUserGrade(UserGrade.Personal);
        u.setPassword("$2a$10$dummy");
        return userRepo.save(u);
    }

    private RequestPostProcessor asPrincipal(User user) {
        return user(UserPrincipal.create(user));
    }

    @Test
    @DisplayName("직원 토큰으로 GET /api/attendance-credits/me → 403 (MasterOnly)")
    void employeeToken_getSummary_forbidden() throws Exception {
        User emp = employee();

        mockMvc.perform(get("/api/attendance-credits/me").with(asPrincipal(emp)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("일반회원 토큰으로 POST /api/attendance-credits/check-in → 403 (MasterOnly)")
    void personalToken_checkIn_forbidden() throws Exception {
        User personal = personal();

        mockMvc.perform(post("/api/attendance-credits/check-in").with(asPrincipal(personal)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("사장 본인 조회 → 200, 체크인 전이므로 잔액 0")
    void masterToken_getSummary_ok() throws Exception {
        User master = master();

        mockMvc.perform(get("/api/attendance-credits/me").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(0))
                .andExpect(jsonPath("$.checkedInToday").value(false))
                .andExpect(jsonPath("$.weeklyGrid.length()").value(7));
    }

    @Test
    @DisplayName("사장 본인 체크인 → 201, 지급 수량만큼 잔액 반영")
    void masterToken_checkIn_created() throws Exception {
        User master = master();

        mockMvc.perform(post("/api/attendance-credits/check-in").with(asPrincipal(master)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.grantedQuantity").isNumber())
                .andExpect(jsonPath("$.balance").value(org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.currentStreak").value(1));
    }

    @Test
    @DisplayName("같은 날 중복 체크인 → 409")
    void masterToken_duplicateCheckIn_conflict() throws Exception {
        User master = master();

        mockMvc.perform(post("/api/attendance-credits/check-in").with(asPrincipal(master)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/attendance-credits/check-in").with(asPrincipal(master)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("ATTENDANCE_CREDIT_ALREADY_CHECKED_IN"));
    }

    @Test
    @DisplayName("체크인 후 조회 → checkedInToday=true, 잔액이 체크인 응답과 일치")
    void masterToken_getSummary_afterCheckIn_reflectsBalance() throws Exception {
        User master = master();

        String checkInResponse = mockMvc.perform(post("/api/attendance-credits/check-in").with(asPrincipal(master)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int grantedBalance = objectMapper.readTree(checkInResponse).get("balance").asInt();

        mockMvc.perform(get("/api/attendance-credits/me").with(asPrincipal(master)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checkedInToday").value(true))
                .andExpect(jsonPath("$.balance").value(grantedBalance));
    }
}
