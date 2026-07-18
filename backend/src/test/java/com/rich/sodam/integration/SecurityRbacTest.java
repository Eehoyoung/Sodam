package com.rich.sodam.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.rich.sodam.security.UserPrincipal;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * RBAC 권한 거부 회귀 테스트.
 *
 * 보안 감사 2026-05-23 P0-1~P0-8 fix 의 회귀 방지.
 * 핵심: EMPLOYEE / PERSONAL 이 MASTER 전용 endpoint 를 호출하면 403,
 *      비인증 호출은 401, 권한 거부는 403, ownership 위반도 403.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class SecurityRbacTest {

    @Autowired MockMvc mockMvc;

    // ─── 비인증 ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("비인증: MASTER 전용 endpoint /api/master/mypage → 401/403")
    void anonymous_masterEndpoint_denied() throws Exception {
        mockMvc.perform(get("/api/master/mypage"))
                .andExpect(status().is(org.hamcrest.Matchers.anyOf(
                        org.hamcrest.Matchers.is(401),
                        org.hamcrest.Matchers.is(403))));
    }

    @Test
    @DisplayName("비인증: 휴가 승인 → 401/403")
    void anonymous_approveTimeOff_denied() throws Exception {
        mockMvc.perform(put("/api/timeoff/1/approve"))
                .andExpect(status().is(org.hamcrest.Matchers.anyOf(
                        org.hamcrest.Matchers.is(401),
                        org.hamcrest.Matchers.is(403))));
    }

    // ─── EMPLOYEE 가 MASTER endpoint 호출 → 403 ─────────────────────────

    @Test
    @DisplayName("EMPLOYEE: /api/master/mypage 호출 → 403 (MasterOnly)")
    void employee_masterMyPage_forbidden() throws Exception {
        mockMvc.perform(get("/api/master/mypage")
                        .with(user("emp@x").authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("MANAGER: /api/master/mypage 호출 → 403 (전역 역할이 아닌 관계 권한으로만 허용)")
    void manager_masterMyPage_forbidden() throws Exception {
        mockMvc.perform(get("/api/master/mypage")
                        .with(user("manager@x").authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MANAGER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("BOSS: /api/master/mypage 호출 → 403 (레거시 전역 역할 차단)")
    void boss_masterMyPage_forbidden() throws Exception {
        mockMvc.perform(get("/api/master/mypage")
                        .with(user("boss@x").authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_BOSS"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("레거시 MANAGER: EmployeeOrMaster API도 관계권한 이관 전에는 403")
    void manager_employeeOrMasterEndpoint_forbidden() throws Exception {
        mockMvc.perform(get("/api/payroll/employee/1/wages")
                        .with(user("manager@x").authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MANAGER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("EMPLOYEE: 시급 변경 POST /api/wages/employee → 403 (MasterOnly)")
    void employee_updateWage_forbidden() throws Exception {
        mockMvc.perform(post("/api/wages/employee")
                        .contentType("application/json")
                        .content("{\"employeeId\":1,\"storeId\":1,\"customHourlyWage\":15000,\"useStoreStandardWage\":false}")
                        .with(user("emp@x").authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("일반 EMPLOYEE: 휴가 승인 → 관계 권한 가드에서 403")
    void employee_approveTimeOff_forbidden() throws Exception {
        UserPrincipal employee = new UserPrincipal(999999L, "emp@x", java.util.List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_EMPLOYEE")));
        mockMvc.perform(put("/api/timeoff/1/approve")
                        .with(user(employee)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("EMPLOYEE: 급여 계산 트리거 POST /api/payroll/calculate → 403 (MasterOnly)")
    void employee_calculatePayroll_forbidden() throws Exception {
        mockMvc.perform(post("/api/payroll/calculate")
                        .contentType("application/json")
                        .content("{\"employeeId\":1,\"storeId\":1,\"startDate\":\"2026-05-01T00:00:00\",\"endDate\":\"2026-05-31T23:59:59\"}")
                        .with(user("emp@x").authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isForbidden());
    }

    // ─── PERSONAL (가입 직후) 이 매장 endpoint 호출 → 403 ───────────────

    @Test
    @DisplayName("PERSONAL: 매장 조회 → 403 (EmployeeOrMaster)")
    void personal_storeEndpoint_forbidden() throws Exception {
        mockMvc.perform(get("/api/timeoff/store?storeId=1")
                        .with(user("p@x").authorities(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_PERSONAL"))))
                .andExpect(status().isForbidden());
    }

    // ─── 비인증 public endpoint 는 허용 ─────────────────────────────────

    @Test
    @DisplayName("비인증: 토스 웹훅은 PublicEndpoint — 200/400/401 가능하지만 403 은 아님")
    void anonymous_webhook_notForbidden() throws Exception {
        // body 빈 토큰 + 서명 없음 → verifySignature 가 401 반환 (정상 동작 — 보안 거부)
        // 어쨌든 403 (PreAuthorize 거부) 은 아님
        mockMvc.perform(post("/api/billing/webhook/toss")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().is(org.hamcrest.Matchers.not(403)));
    }
}
