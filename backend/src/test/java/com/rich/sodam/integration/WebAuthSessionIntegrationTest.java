package com.rich.sodam.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.config.WebSessionSecurityConfig;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.session.MapSessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 사장님 웹 콘솔(Phase 0) 세션 인증 통합 테스트 — docs/260726/04_보안정책.md 완료기준 C2~C5 검증.
 *
 * <p>{@code sodam.security.trust-forwarded-headers=true} 로 이 테스트 클래스 전용 Spring 컨텍스트를
 * 격리시킨다 — {@link com.rich.sodam.config.RateLimitFilter}/{@code LoginLockoutService}/
 * {@code WebLoginAccountRateLimiter} 는 전부 싱글턴 in-memory 상태를 갖고 있어, 다른 테스트 클래스와
 * 컨텍스트를 공유하면 누적된 rate-limit/잠금 상태가 테스트 간에 새어 들어가 flaky 해진다. 이 프로퍼티
 * 오버라이드가 Spring 테스트 컨텍스트 캐시 키를 다르게 만들어 이 클래스만의 새 컨텍스트를 보장하고,
 * 동시에 {@code X-Forwarded-For} 헤더로 테스트별/요청별 IP 를 자유롭게 통제할 수 있게 해준다
 * (IP 기준 rate limit 과 계정 기준 잠금을 서로 간섭 없이 독립적으로 검증하기 위함).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "sodam.security.trust-forwarded-headers=true",
        "sodam.security.trusted-proxy-ips=127.0.0.1"
})
@Transactional
class WebAuthSessionIntegrationTest {

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
    @Autowired
    private MasterProfileRepository masterProfileRepository;
    @Autowired
    private MasterStoreRelationRepository masterStoreRelationRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private MapSessionRepository mapSessionRepository;

    private static final String RAW_PASSWORD = "Sodam123!";
    private static int ipCounter = 1;

    private Store store;

    @BeforeEach
    void setUp() {
        String uniqueBizNo = String.valueOf(910_000_0000L + (System.nanoTime() % 100_000_0000L));
        store = new Store("웹콘솔 테스트 매장 " + uniqueBizNo.substring(0, 4), uniqueBizNo,
                "02-1234-5678", "카페", 12_000, 100);
        store.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        store = storeRepository.save(store);
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────────

    private User createMaster(String email) {
        User user = new User(email, "웹콘솔 사장");
        user.setUserGrade(UserGrade.MASTER);
        user.setPassword(passwordEncoder.encode(RAW_PASSWORD));
        user = userRepository.save(user);
        MasterProfile profile = masterProfileRepository.save(new MasterProfile(user));
        masterStoreRelationRepository.save(new MasterStoreRelation(profile, store));
        return user;
    }

    private User createActiveManager(String email) {
        User user = new User(email, "웹콘솔 매니저");
        user.setUserGrade(UserGrade.EMPLOYEE);
        user.setPassword(passwordEncoder.encode(RAW_PASSWORD));
        user = userRepository.save(user);
        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(user));
        EmployeeStoreRelation relation = new EmployeeStoreRelation(profile, store);
        relation.draftManagerAppointment(EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE), LocalDateTime.now());
        relation.activateManagerDelegation(1L, relation.getManagerDelegationVersion(), LocalDateTime.now());
        employeeStoreRelationRepository.save(relation);
        return user;
    }

    /** 다음 테스트/요청 그룹 전용 사설 IP — X-Forwarded-For 로 IP 버킷을 서로 격리한다. */
    private String nextIp() {
        return "10.20." + (ipCounter++) + ".1";
    }

    private String loginBody(String email, String password) throws Exception {
        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("password", password);
        return objectMapper.writeValueAsString(body);
    }

    private MvcResult performLogin(String email, String password, String ip) throws Exception {
        return mockMvc.perform(post("/api/web/auth/login")
                        .header("X-Forwarded-For", ip)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, password)))
                .andDo(print())
                .andReturn();
    }

    private String extractCookieValue(MockHttpServletResponse response, String cookieName) {
        for (String header : response.getHeaders("Set-Cookie")) {
            String prefix = cookieName + "=";
            if (header.startsWith(prefix)) {
                String rest = header.substring(prefix.length());
                int semi = rest.indexOf(';');
                return semi >= 0 ? rest.substring(0, semi) : rest;
            }
        }
        return null;
    }

    // ── #1: 로그인 성공 시 세션 쿠키 + CSRF 쿠키 속성 ────────────────

    @Test
    @DisplayName("#1 POST /api/web/auth/login 성공 시 sodam_web_sid(HttpOnly/Secure/SameSite=Strict) + CSRF 쿠키 발급")
    void login_success_setsSessionAndCsrfCookies() throws Exception {
        String email = "web-login-1@example.com";
        createMaster(email);

        MvcResult result = performLogin(email, RAW_PASSWORD, nextIp());
        MockHttpServletResponse response = result.getResponse();

        assertThat(response.getStatus()).isEqualTo(200);

        java.util.List<String> setCookieHeaders = response.getHeaders("Set-Cookie");
        String sessionCookieHeader = setCookieHeaders.stream()
                .filter(h -> h.startsWith(WebSessionSecurityConfig.SESSION_COOKIE_NAME + "="))
                .findFirst().orElseThrow(() -> new AssertionError("세션 쿠키 미발급"));
        assertThat(sessionCookieHeader).contains("HttpOnly");
        assertThat(sessionCookieHeader).contains("Secure");
        assertThat(sessionCookieHeader).containsIgnoringCase("SameSite=Strict");

        String csrfCookieHeader = setCookieHeaders.stream()
                .filter(h -> h.startsWith("sodam_web_csrf="))
                .findFirst().orElseThrow(() -> new AssertionError("CSRF 쿠키 미발급"));
        assertThat(csrfCookieHeader).doesNotContain("HttpOnly"); // JS 가 읽어야 함
        assertThat(csrfCookieHeader).containsIgnoringCase("SameSite=Strict");
    }

    // ── #2: 세션만으로 기존 보호 리소스 접근 200 (JWT 불필요, principal 정규화 검증) ──

    @Test
    @DisplayName("#2 세션 쿠키만으로 기존 /api/stores/master/current 200 (JWT 없이 인가 통과)")
    void sessionOnly_grantsAccessToExistingProtectedResource() throws Exception {
        String email = "web-login-2@example.com";
        User master = createMaster(email);

        MvcResult loginResult = performLogin(email, RAW_PASSWORD, nextIp());
        String sessionValue = extractCookieValue(loginResult.getResponse(), WebSessionSecurityConfig.SESSION_COOKIE_NAME);
        assertThat(sessionValue).isNotNull();

        mockMvc.perform(get("/api/stores/master/current")
                        .cookie(new jakarta.servlet.http.Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, sessionValue)))
                .andDo(print())
                .andExpect(status().isOk());
    }

    // ── #3: 매니저 세션으로 @MasterOnly API 호출 시 403 ──────────────

    @Test
    @DisplayName("#3 매니저 세션으로 @MasterOnly 매장 운영시간 조회 시 403 (전역 역할 우회 없음)")
    void managerSession_masterOnlyEndpoint_forbidden() throws Exception {
        String email = "web-login-3@example.com";
        createActiveManager(email);

        MvcResult loginResult = performLogin(email, RAW_PASSWORD, nextIp());
        assertThat(loginResult.getResponse().getStatus()).isEqualTo(200);
        String sessionValue = extractCookieValue(loginResult.getResponse(), WebSessionSecurityConfig.SESSION_COOKIE_NAME);

        mockMvc.perform(get("/api/stores/{storeId}/operating-hours", store.getId())
                        .cookie(new jakarta.servlet.http.Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, sessionValue)))
                .andDo(print())
                .andExpect(status().isForbidden());
    }

    // ── #4: CSRF 헤더 없이 상태변경 요청(로그아웃) 시 403 ────────────

    @Test
    @DisplayName("#4 CSRF 헤더 없이 POST /api/web/auth/logout 403, 올바른 헤더 포함 시 200")
    void logout_withoutCsrfHeader_forbidden_withHeader_ok() throws Exception {
        String email = "web-login-4@example.com";
        createMaster(email);

        MvcResult loginResult = performLogin(email, RAW_PASSWORD, nextIp());
        String sessionValue = extractCookieValue(loginResult.getResponse(), WebSessionSecurityConfig.SESSION_COOKIE_NAME);
        String csrfValue = extractCookieValue(loginResult.getResponse(), "sodam_web_csrf");
        assertThat(csrfValue).isNotNull();

        // CSRF 헤더 없이 로그아웃 시도 → 403
        mockMvc.perform(post("/api/web/auth/logout")
                        .header("Origin", "http://localhost:3000")
                        .cookie(new jakarta.servlet.http.Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, sessionValue)))
                .andDo(print())
                .andExpect(status().isForbidden());

        // 올바른 CSRF 헤더 포함 시 정상 로그아웃 200
        mockMvc.perform(post("/api/web/auth/logout")
                        .header("Origin", "http://localhost:3000")
                        .header("X-Sodam-CSRF", csrfValue)
                        .cookie(new jakarta.servlet.http.Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, sessionValue)))
                .andDo(print())
                .andExpect(status().isOk());
    }

    // ── #5: 계정 연속 실패 5회 → 6번째(올바른 비번이어도) 423 잠김 ───

    @Test
    @DisplayName("#5 동일 계정 로그인 5회 연속 실패 후 6번째(올바른 비번) 423 계정 잠금")
    void accountLockout_after5ConsecutiveFailures_locksEvenWithCorrectPassword() throws Exception {
        String email = "web-login-5@example.com";
        createMaster(email);

        // 서로 다른 IP 에서 실패시켜 "IP 기준 rate limit"이 아니라 "계정 기준 잠금"만 격리 검증한다.
        for (int i = 0; i < 5; i++) {
            MvcResult r = performLogin(email, "WrongPassword!", nextIp());
            assertThat(r.getResponse().getStatus()).isEqualTo(401);
        }

        // 6번째 — 이번엔 올바른 비밀번호를 쓰더라도 이미 잠긴 계정이라 423 이어야 한다.
        MvcResult locked = performLogin(email, RAW_PASSWORD, nextIp());
        assertThat(locked.getResponse().getStatus()).isEqualTo(423);
        assertThat(locked.getResponse().getContentAsString()).contains("ACCOUNT_LOCKED");
    }

    // ── #6: IP 기준 rate limit 초과 시 429 ────────────────────────────

    @Test
    @DisplayName("#6 동일 IP 에서 6회 연속 로그인 시도 시 429 (IP 기준 5/분)")
    void ipRateLimit_exceeds5PerMinute_returns429() throws Exception {
        String ip = nextIp();
        for (int i = 0; i < 5; i++) {
            String email = "web-login-6-" + i + "@example.com";
            createMaster(email);
            MvcResult r = performLogin(email, "WrongPassword!", ip);
            assertThat(r.getResponse().getStatus()).isEqualTo(401);
        }

        // 6번째 요청 — 다른 계정이어도 같은 IP 라 rate limit(429) 에 걸려야 한다.
        String lastEmail = "web-login-6-last@example.com";
        createMaster(lastEmail);
        MvcResult limited = performLogin(lastEmail, RAW_PASSWORD, ip);
        assertThat(limited.getResponse().getStatus()).isEqualTo(429);
    }

    // ── #7: 세션 만료 후 보호 리소스 접근 시 401(403 아님) ───────────

    @Test
    @DisplayName("#7 세션 만료 후 보호 리소스 접근 시 401")
    void expiredSession_protectedResource_returns401() throws Exception {
        String email = "web-login-7@example.com";
        createMaster(email);

        MvcResult loginResult = performLogin(email, RAW_PASSWORD, nextIp());
        String sessionValue = extractCookieValue(loginResult.getResponse(), WebSessionSecurityConfig.SESSION_COOKIE_NAME);
        assertThat(sessionValue).isNotNull();

        // 세션이 실제로 만료된 상황을 시뮬레이션 — 저장소에서 직접 삭제(= 만료와 동등 효과: 더 이상 조회되지 않음).
        mapSessionRepository.deleteById(sessionValue);

        mockMvc.perform(get("/api/stores/master/current")
                        .cookie(new jakarta.servlet.http.Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, sessionValue)))
                .andDo(print())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    // ── 보너스: GET /api/web/auth/me ─────────────────────────────────

    @Test
    @DisplayName("GET /api/web/auth/me — 세션 유효 시 200 + 사용자 정보, 세션 없으면 401")
    void me_returnsUser_whenSessionValid_unauthorizedOtherwise() throws Exception {
        String email = "web-login-8@example.com";
        User master = createMaster(email);

        MvcResult loginResult = performLogin(email, RAW_PASSWORD, nextIp());
        String sessionValue = extractCookieValue(loginResult.getResponse(), WebSessionSecurityConfig.SESSION_COOKIE_NAME);

        mockMvc.perform(get("/api/web/auth/me")
                        .cookie(new jakarta.servlet.http.Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, sessionValue)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(master.getId()))
                .andExpect(jsonPath("$.email").value(email));

        mockMvc.perform(get("/api/web/auth/me"))
                .andDo(print())
                .andExpect(status().isUnauthorized());
    }

    // ── #10: 세션 고정(Session Fixation) 방어 — 로그인 전/후 세션ID가 달라야 한다 ──

    @Test
    @DisplayName("#10 로그인 전 보유하던 세션ID를 그대로 실어 로그인해도 새 세션ID가 발급되고, 옛 세션ID는 무효화된다")
    void login_withPreExistingSessionCookie_regeneratesSessionIdAndInvalidatesOld() throws Exception {
        String email = "web-login-10@example.com";
        createMaster(email);

        // 1) "공격자가 심어둔" 것으로 간주할 세션ID를 하나 미리 확보한다 — 첫 로그인 결과의 세션ID를
        //    그대로 재사용해 "로그인 이전부터 존재하던 세션"을 흉내낸다.
        MvcResult firstLogin = performLogin(email, RAW_PASSWORD, nextIp());
        String preExistingSessionId = extractCookieValue(firstLogin.getResponse(), WebSessionSecurityConfig.SESSION_COOKIE_NAME);
        assertThat(preExistingSessionId).isNotNull();
        assertThat(mapSessionRepository.findById(preExistingSessionId)).isNotNull();

        // 2) 그 세션ID를 그대로 실어 다시 로그인 요청 — 세션 고정 공격 시나리오 재현.
        MvcResult secondLogin = mockMvc.perform(post("/api/web/auth/login")
                        .header("X-Forwarded-For", nextIp())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, RAW_PASSWORD))
                        .cookie(new jakarta.servlet.http.Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, preExistingSessionId)))
                .andDo(print())
                .andExpect(status().isOk())
                .andReturn();

        String newSessionId = extractCookieValue(secondLogin.getResponse(), WebSessionSecurityConfig.SESSION_COOKIE_NAME);
        assertThat(newSessionId).isNotNull();
        // 핵심 검증: 로그인 전 세션ID와 로그인 후 세션ID가 달라야 한다(세션 고정 방어).
        assertThat(newSessionId).isNotEqualTo(preExistingSessionId);
        // 옛 세션ID는 무효화되어 저장소에서 더 이상 조회되지 않아야 한다.
        assertThat(mapSessionRepository.findById(preExistingSessionId)).isNull();
        // 새 세션ID는 정상적으로 인증 상태를 담고 있어야 한다.
        assertThat(mapSessionRepository.findById(newSessionId)).isNotNull();
    }
}
