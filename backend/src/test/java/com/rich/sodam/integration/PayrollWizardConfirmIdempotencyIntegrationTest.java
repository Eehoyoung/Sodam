package com.rich.sodam.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.config.WebSessionSecurityConfig;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.StoreDelegationAudit;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.PayrollStatus;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreDelegationAuditRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.StepUpAuthenticationService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 급여 정산 마법사 일괄 확정(POST /api/web/payroll/wizard/confirm) 멱등성 통합 테스트
 * (05_동시성제어_및_고급아키텍처.md §3 — "급여 확정 중복 실행 방지가 실제 네트워크 재시도 시나리오에서
 * 검증됨").
 *
 * <p>동일 Idempotency-Key로 같은 확정 요청을 실제 HTTP(MockMvc) 두 번 보내 재현한다 — 두 번째 요청은
 * step-up 비밀번호를 재검증하지도, 감사 기록을 다시 남기지도, 급여 상태를 다시 전이시키지도 않고
 * 첫 번째 처리 결과와 동일한 응답을 그대로 반환해야 한다.
 *
 * <p><b>인증은 반드시 실제 로그인으로 얻은 세션 쿠키+CSRF 토큰을 써야 한다</b> —
 * {@code SecurityMockMvcRequestPostProcessors.user(...)}는 이 엔드포인트({@code /api/web/**})가
 * 라우팅되는 {@link WebSessionSecurityConfig}의 커스텀 {@code SecurityContextRepository}(세션 기반)와
 * 충돌한다: 요청이 {@code webSessionFilterChain}을 타면 {@code SecurityContextHolderFilter}가 항상
 * 그 리포지토리로 컨텍스트를 다시 로드하는데, MockMvc 테스트 요청엔 실제 세션이 없으니 빈 컨텍스트로
 * 덮어써져 {@code user()}로 주입한 인증이 무시된다(실제로 403 회귀를 겪고 확인함). 그래서
 * {@code WebAuthSessionIntegrationTest}와 동일하게 {@code POST /api/web/auth/login}을 실제로 호출해
 * 세션 쿠키·CSRF 쿠키를 발급받아 사용한다. {@code /api/web/**}는 CSRF Double Submit Cookie 검증도
 * 적용되므로(SodamCsrfFilter) 상태변경 요청엔 {@code X-Sodam-CSRF} 헤더도 함께 실어야 한다.
 *
 * <p>{@link StepUpAuthenticationService}만 mock — 고위험 재인증 로직 자체는
 * {@code PayrollHighRiskActionServiceTest}가 이미 단위 테스트로 커버하고, 이 테스트의 관심사는
 * 멱등성 배선(컨트롤러→서비스→실행기→Redis 대체 In-memory 스토어)이 실제 Spring 컨텍스트에서
 * 끝까지 동작하는지다. {@code StepUpAttemptLimiter}가 운영 Redis(`cacheRedisTemplate`)에 직접
 * 의존해 test 프로필에서도 실제 연결을 시도하므로, 이를 우회하기 위해 상위 서비스를 mock한다.
 *
 * <p>{@code @Transactional}(클래스 레벨) — {@code EmployeeProfile}/{@code MasterProfile}은
 * {@code @MapsId}로 User와 PK를 공유하는데, 각 {@code repository.save()} 호출이 서로 다른(자동커밋)
 * 트랜잭션으로 실행되면 방금 저장한 User가 다음 save 시점엔 이미 detached 상태가 되어
 * {@code PersistentObjectException: detached entity passed to persist}가 난다. MockMvc는 기본적으로
 * 테스트 메서드와 같은 스레드에서 실행되므로, 클래스 레벨 {@code @Transactional}로 setUp()과 이후
 * MockMvc 요청 전부를 하나의 트랜잭션(각 테스트 종료 후 자동 롤백)에 묶는 것으로 충분하다.
 *
 * <p>{@code trust-forwarded-headers=true} 오버라이드로 이 테스트 클래스 전용 Spring 컨텍스트를
 * 격리한다 — {@code RateLimitFilter}/로그인 계정잠금 상태가 다른 테스트 클래스와 공유되면 flaky
 * 해지므로({@code WebAuthSessionIntegrationTest}의 동일 근거 참고).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "sodam.security.trust-forwarded-headers=true")
@Transactional
class PayrollWizardConfirmIdempotencyIntegrationTest {

    private static final String RAW_PASSWORD = "Sodam123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository employeeStoreRelationRepository;
    @Autowired private MasterProfileRepository masterProfileRepository;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepository;
    @Autowired private PayrollRepository payrollRepository;
    @Autowired private StoreDelegationAuditRepository storeDelegationAuditRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockBean private StepUpAuthenticationService stepUpAuthenticationService;

    private User masterUser;
    private Store store;
    private Payroll draftPayroll;
    private String masterEmail;

    @BeforeEach
    void setUp() {
        doNothing().when(stepUpAuthenticationService).verifyPassword(anyLong(), any());

        masterEmail = "wizard_master_" + UUID.randomUUID() + "@sodam.dev";
        masterUser = new User(masterEmail, "정산마법사사장");
        masterUser.setUserGrade(UserGrade.MASTER);
        masterUser.setPassword(passwordEncoder.encode(RAW_PASSWORD));
        masterUser = userRepository.save(masterUser);

        User employeeUser = new User("wizard_emp_" + UUID.randomUUID() + "@sodam.dev", "정산마법사직원");
        employeeUser.setUserGrade(UserGrade.EMPLOYEE);
        employeeUser.setPassword(passwordEncoder.encode(RAW_PASSWORD));
        employeeUser = userRepository.save(employeeUser);
        EmployeeProfile employeeProfile = employeeProfileRepository.save(new EmployeeProfile(employeeUser));

        String bizNo = String.valueOf(910_000_0000L + (System.nanoTime() % 100_000_0000L));
        store = storeRepository.save(new Store("정산마법사매장", bizNo, "02-1234-5678", "카페", 12_000, 100));

        MasterProfile masterProfile = masterProfileRepository.save(new MasterProfile(masterUser));
        masterStoreRelationRepository.save(new MasterStoreRelation(masterProfile, store));
        employeeStoreRelationRepository.save(new EmployeeStoreRelation(employeeProfile, store, 12_000));

        draftPayroll = new Payroll();
        draftPayroll.setEmployee(employeeProfile);
        draftPayroll.setStore(store);
        draftPayroll.setStartDate(LocalDate.of(2026, 7, 1));
        draftPayroll.setEndDate(LocalDate.of(2026, 7, 31));
        draftPayroll.setRegularHours(160.0);
        draftPayroll.setOvertimeHours(0.0);
        draftPayroll.setNightWorkHours(0.0);
        draftPayroll.setHolidayWorkHours(0.0);
        draftPayroll.setBaseHourlyWage(12_000);
        draftPayroll.setRegularWage(1_920_000);
        draftPayroll.setGrossWage(1_920_000);
        draftPayroll.setTaxAmount(0);
        draftPayroll.setDeductions(0);
        draftPayroll.setNetWage(1_920_000);
        draftPayroll.setStatus(PayrollStatus.DRAFT);
        draftPayroll.setCreatedAt(LocalDateTime.now());
        draftPayroll.setUpdatedAt(LocalDateTime.now());
        draftPayroll = payrollRepository.save(draftPayroll);
    }

    // ── 헬퍼: 실제 세션 로그인 ──────────────────────────────────────────

    private record Session(String sessionCookie, String csrfToken) {
    }

    private Session login() throws Exception {
        Map<String, String> body = new HashMap<>();
        body.put("email", masterEmail);
        body.put("password", RAW_PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/web/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpServletResponse response = result.getResponse();
        String sessionCookie = extractCookieValue(response, WebSessionSecurityConfig.SESSION_COOKIE_NAME);
        String csrfToken = extractCookieValue(response, "sodam_web_csrf");
        assertThat(sessionCookie).isNotNull();
        assertThat(csrfToken).isNotNull();
        return new Session(sessionCookie, csrfToken);
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

    @Test
    @DisplayName("동일 Idempotency-Key로 재시도해도 급여가 두 번 확정되지 않고 동일한 응답을 반환한다")
    void duplicateConfirmRequestWithSameIdempotencyKeyReplaysFirstResult() throws Exception {
        Session session = login();
        String requestBody = objectMapper.writeValueAsString(Map.of(
                "storeId", store.getId(),
                "payrollIds", List.of(draftPayroll.getId()),
                "stepUpPassword", "correct-password"));
        String idempotencyKey = "wizard-confirm-" + UUID.randomUUID();

        MvcResult first = mockMvc.perform(post("/api/web/payroll/wizard/confirm")
                        .cookie(new Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, session.sessionCookie()))
                        .header("X-Sodam-CSRF", session.csrfToken())
                        .header("Origin", "http://localhost:3000")
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andReturn();

        // 네트워크 재시도 재현 — 동일 헤더·동일 바디로 다시 전송.
        MvcResult second = mockMvc.perform(post("/api/web/payroll/wizard/confirm")
                        .cookie(new Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, session.sessionCookie()))
                        .header("X-Sodam-CSRF", session.csrfToken())
                        .header("Origin", "http://localhost:3000")
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(second.getResponse().getContentAsString())
                .isEqualTo(first.getResponse().getContentAsString());

        // step-up 비밀번호 재검증은 최초 1회만 — 재요청은 재실행되지 않았다는 직접 증거.
        verify(stepUpAuthenticationService, times(1)).verifyPassword(anyLong(), any());

        // 감사 기록도 1건만 — 중복 확정이 아니라는 증거.
        List<StoreDelegationAudit> audits = storeDelegationAuditRepository
                .findByStoreIdOrderByCreatedAtDesc(store.getId());
        assertThat(audits).hasSize(1);
        assertThat(audits.get(0).getAction()).isEqualTo(StoreDelegationAudit.Action.PAYROLL_CONFIRMED);
        // 웹 콘솔 경로로 확정했으니 감사기록의 접근 채널도 WEB이어야 한다 — MOBILE 기본값으로
        // 새는 배선 결함(AccessChannel 필드를 추가만 하고 실제로 세팅하지 않는 실수)을 잡아낸다.
        assertThat(audits.get(0).getAccessChannel()).isEqualTo(StoreDelegationAudit.AccessChannel.WEB);

        // 급여 레코드도 정확히 1건, PAID 상태로 정상 확정.
        Payroll reloaded = payrollRepository.findById(draftPayroll.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(PayrollStatus.PAID);
        assertThat(payrollRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Idempotency-Key 헤더가 없으면 400을 반환하고 아무것도 확정되지 않는다")
    void missingIdempotencyKeyIsRejected() throws Exception {
        Session session = login();
        String requestBody = objectMapper.writeValueAsString(Map.of(
                "storeId", store.getId(),
                "payrollIds", List.of(draftPayroll.getId()),
                "stepUpPassword", "correct-password"));

        mockMvc.perform(post("/api/web/payroll/wizard/confirm")
                        .cookie(new Cookie(WebSessionSecurityConfig.SESSION_COOKIE_NAME, session.sessionCookie()))
                        .header("X-Sodam-CSRF", session.csrfToken())
                        .header("Origin", "http://localhost:3000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());

        Payroll reloaded = payrollRepository.findById(draftPayroll.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(PayrollStatus.DRAFT);
    }
}
