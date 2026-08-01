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
@SpringBootTest(properties = "sodam.security.system-content.admin-user-ids=1")
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

    // ─── WP-00: 무효 토큰 401 / 타 매장 BOLA 403 (계약 기준선 명시) ──────

    @Test
    @DisplayName("WP-00: 무효 토큰(서명 손상) — MASTER 전용 endpoint /api/master/mypage → 401")
    void invalidToken_masterEndpoint_unauthorized() throws Exception {
        mockMvc.perform(get("/api/master/mypage")
                        .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("WP-00: 무효 토큰(서명 손상) — 매장 스코프 endpoint /api/stores/1 → 401")
    void invalidToken_storeScopedEndpoint_unauthorized() throws Exception {
        mockMvc.perform(get("/api/stores/1")
                        .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("WP-00 BOLA: DevSeedRunner 시드 매장(id=1)은 owner userId=1 소유 — 무관한 MASTER principal(id=999999)이 접근하면 StoreAccessGuard가 403으로 차단한다")
    void otherMaster_seedStore_forbidden() throws Exception {
        UserPrincipal unrelatedMaster = new UserPrincipal(999999L, "other-master@x", java.util.List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MASTER")));
        mockMvc.perform(get("/api/stores/1")
                        .with(user(unrelatedMaster)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AUD-001: 매장 소유자 권한만으로 전역 콘텐츠를 작성할 수 없다")
    void storeMaster_globalContentCreate_forbidden() throws Exception {
        UserPrincipal storeMaster = new UserPrincipal(999999L, "store-master@x", java.util.List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MASTER")));

        mockMvc.perform(multipart("/api/tip-info")
                        .param("title", "unauthorized-global-content")
                        .param("content", "must-not-be-created")
                .with(user(storeMaster)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AUD-031: store master cannot create global Q&A content")
    void storeMaster_globalQnaCreate_forbidden() throws Exception {
        UserPrincipal storeMaster = new UserPrincipal(999999L, "store-master@x", java.util.List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MASTER")));

        mockMvc.perform(multipart("/api/qna-info")
                        .param("title", "unauthorized-qna")
                        .param("question", "question")
                        .param("answer", "answer")
                .with(user(storeMaster)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AUD-031: allowlisted system content administrator can create global Q&A content")
    void allowlistedSystemContentAdministrator_canCreateGlobalQnaContent() throws Exception {
        UserPrincipal systemContentAdministrator = new UserPrincipal(1L, "system-content-admin@x", java.util.List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MASTER")));

        mockMvc.perform(multipart("/api/qna-info")
                        .param("title", "authorized-qna")
                        .param("question", "question")
                        .param("answer", "answer")
                        .with(user(systemContentAdministrator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("authorized-qna"));
    }

    @Test
    @DisplayName("AUD-001: 허용 목록의 시스템 콘텐츠 운영자는 기존 콘텐츠 작성 기능을 사용할 수 있다")
    void allowlistedSystemContentAdministrator_canCreateGlobalContent() throws Exception {
        UserPrincipal systemContentAdministrator = new UserPrincipal(1L, "system-content-admin@x", java.util.List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MASTER")));

        mockMvc.perform(multipart("/api/tip-info")
                        .param("title", "authorized-global-content")
                        .param("content", "local-regression-test")
                        .with(user(systemContentAdministrator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("authorized-global-content"));
    }

    @Test
    @DisplayName("AUD-004: 매장 비구성원은 위치·NFC 사전 검증으로 다른 매장 정보를 조회할 수 없다")
    void unrelatedStoreMember_cannotVerifyAnotherStoreAttendanceSignals() throws Exception {
        UserPrincipal unrelatedMaster = new UserPrincipal(999999L, "other-store-master@x", java.util.List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MASTER")));

        mockMvc.perform(post("/api/attendance/verify/location")
                        .contentType("application/json")
                        .content("{\"storeId\":1,\"latitude\":37.5665,\"longitude\":126.9780}")
                        .with(user(unrelatedMaster)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/attendance/verify/nfc")
                        .contentType("application/json")
                        .content("{\"storeId\":1,\"tagId\":\"SODAM-123456\"}")
                        .with(user(unrelatedMaster)))
                .andExpect(status().isForbidden());
    }
}
