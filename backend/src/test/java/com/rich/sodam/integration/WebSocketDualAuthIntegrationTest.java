package com.rich.sodam.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.config.WebSessionSecurityConfig;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.jwt.JwtTokenProvider;
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
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationListener;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * STOMP CONNECT 이중 인증(모바일 JWT / 웹 콘솔 세션) 통합 테스트.
 *
 * <p>{@link com.rich.sodam.config.WebSocketConfig} 의 {@code StompAuthChannelInterceptor} +
 * {@code SessionHandshakeInterceptor} 배선이 실제 임베디드 서버(RANDOM_PORT)에서 동작하는지 검증한다.
 * 로그인은 {@link MockMvc} 로 수행하되(기존 {@code WebAuthSessionIntegrationTest} 패턴), 세션은
 * 실제 {@code SessionRepository} 빈(컨텍스트 공유)에 저장되므로 이후 실 WebSocket 핸드셰이크가 같은
 * 세션 쿠키를 실어 보내면 그대로 인증된다.</p>
 *
 * <p>principal 검증은 {@link SessionConnectedEvent}(CONNECTED 프레임 응답 후 발행, {@code getUser()}
 * 가 CONNECT 채널 인터셉터가 설정한 사용자와 동일)를 컨텍스트에 리스너로 등록해 캡처하는 방식을 쓴다 —
 * STOMP 클라이언트 쪽에서는 서버가 설정한 Principal 을 직접 읽을 수 있는 API가 없기 때문.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "sodam.security.trust-forwarded-headers=true")
class WebSocketDualAuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private MasterProfileRepository masterProfileRepository;
    @Autowired
    private MasterStoreRelationRepository masterStoreRelationRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    @Autowired
    private ConfigurableApplicationContext applicationContext;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @LocalServerPort
    private int port;

    private static final String RAW_PASSWORD = "Sodam123!";
    private static int ipCounter = 1;

    private WebSocketStompClient stompClient;
    private TransactionTemplate transactionTemplate;
    private final LinkedBlockingQueue<Principal> connectedPrincipals = new LinkedBlockingQueue<>();

    @BeforeEach
    void setUp() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        // 이 테스트 클래스는 (WebSocket 핸드셰이크가 별도 스레드/커넥션에서 실제 임베디드 서버를 거치므로)
        // 클래스 레벨 @Transactional 을 쓰지 않는다 — 롤백 대상 트랜잭션 안에서 만든 데이터는 다른
        // 스레드에 보이지 않기 때문. 대신 엔티티 생성 묶음(User→MasterProfile→MasterStoreRelation,
        // @MapsId 로 서로 얽혀 있어 각각 별도 트랜잭션으로 저장하면 "detached entity" 예외가 난다)만
        // TransactionTemplate 로 짧게 묶어 커밋한다 — 커밋되므로 이후 실 HTTP 스레드에서도 보인다.
        transactionTemplate = new TransactionTemplate(transactionManager);
        connectedPrincipals.clear();
        // 실제 SessionConnectedEvent 를 캡처해 서버측이 설정한 Principal 을 검증한다(클라이언트
        // STOMP 세션 API 에는 서버가 설정한 Principal 을 직접 읽는 수단이 없다).
        applicationContext.addApplicationListener((ApplicationListener<SessionConnectedEvent>) event -> {
            if (event.getUser() != null) {
                connectedPrincipals.offer(event.getUser());
            }
        });
    }

    private String wsUrl() {
        return "ws://localhost:" + port + "/ws";
    }

    // ── 헬퍼(WebAuthSessionIntegrationTest 패턴 재사용) ──────────────

    private User createMaster(String email) {
        return transactionTemplate.execute(status -> {
            String uniqueBizNo = String.valueOf(920_000_0000L + (System.nanoTime() % 100_000_0000L));
            Store store = new Store("WS 인증 테스트 매장 " + uniqueBizNo.substring(0, 4), uniqueBizNo,
                    "02-1234-5678", "카페", 12_000, 100);
            store.updateLocation(37.5665, 126.9780, "서울 중구", 100);
            store = storeRepository.save(store);

            User user = new User(email, "WS 테스트 사장");
            user.setUserGrade(UserGrade.MASTER);
            user.setPassword(passwordEncoder.encode(RAW_PASSWORD));
            user = userRepository.save(user);
            MasterProfile profile = masterProfileRepository.save(new MasterProfile(user));
            masterStoreRelationRepository.save(new MasterStoreRelation(profile, store));
            return user;
        });
    }

    private String nextIp() {
        return "10.30." + (ipCounter++) + ".1";
    }

    private String loginBody(String email, String password) throws Exception {
        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("password", password);
        return objectMapper.writeValueAsString(body);
    }

    private String loginAndExtractSessionCookie(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/web/auth/login")
                        .header("X-Forwarded-For", nextIp())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, RAW_PASSWORD)))
                .andReturn();
        MockHttpServletResponse response = result.getResponse();
        assertThat(response.getStatus()).isEqualTo(200);
        return extractCookieValue(response, WebSessionSecurityConfig.SESSION_COOKIE_NAME);
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

    // ── #1: 세션 쿠키만으로(JWT 없이) CONNECT 성공 + principal 검증 ──

    @Test
    @DisplayName("#1 세션 쿠키만으로(JWT 헤더 없이) STOMP CONNECT 성공, principal이 로그인한 사용자ID와 일치")
    void sessionOnly_connectSucceeds_withCorrectPrincipal() throws Exception {
        String email = "ws-session-1@example.com";
        User master = createMaster(email);
        String sessionValue = loginAndExtractSessionCookie(email);
        assertThat(sessionValue).isNotNull();

        WebSocketHttpHeaders handshakeHeaders = new WebSocketHttpHeaders();
        handshakeHeaders.add("Cookie", WebSessionSecurityConfig.SESSION_COOKIE_NAME + "=" + sessionValue);

        CompletableFuture<StompSession> future = stompClient.connectAsync(
                wsUrl(), handshakeHeaders, new StompHeaders(), new StompSessionHandlerAdapter() {});

        StompSession session = future.get(10, TimeUnit.SECONDS);
        try {
            assertThat(session.isConnected()).isTrue();

            Principal connectedUser = connectedPrincipals.poll(10, TimeUnit.SECONDS);
            assertThat(connectedUser).as("SessionConnectedEvent 의 principal").isNotNull();
            assertThat(connectedUser.getName()).isEqualTo(String.valueOf(master.getId()));
        } finally {
            session.disconnect();
        }
    }

    // ── #2: 기존 JWT CONNECT 경로 회귀 확인 ───────────────────────────

    @Test
    @DisplayName("#2 기존 모바일 JWT CONNECT 플로우는 세션 배선 추가 후에도 그대로 동작")
    void jwtOnly_connectStillSucceeds_regression() throws Exception {
        String email = "ws-jwt-2@example.com";
        User master = createMaster(email);
        String token = jwtTokenProvider.createToken(master);

        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + token);

        CompletableFuture<StompSession> future = stompClient.connectAsync(
                wsUrl(), new WebSocketHttpHeaders(), connectHeaders, new StompSessionHandlerAdapter() {});

        StompSession session = future.get(10, TimeUnit.SECONDS);
        try {
            assertThat(session.isConnected()).isTrue();

            Principal connectedUser = connectedPrincipals.poll(10, TimeUnit.SECONDS);
            assertThat(connectedUser).as("SessionConnectedEvent 의 principal").isNotNull();
            assertThat(connectedUser.getName()).isEqualTo(String.valueOf(master.getId()));
        } finally {
            session.disconnect();
        }
    }

    // ── #3: JWT도 세션도 없으면 CONNECT 거부 ──────────────────────────

    @Test
    @DisplayName("#3 JWT 헤더도 세션 쿠키도 없으면 STOMP CONNECT 거부")
    void noAuth_connectRejected() {
        CompletableFuture<StompSession> future = stompClient.connectAsync(
                wsUrl(), new WebSocketHttpHeaders(), new StompHeaders(), new StompSessionHandlerAdapter() {});

        assertThatThrownBy(() -> future.get(10, TimeUnit.SECONDS))
                .isInstanceOf(ExecutionException.class);
    }
}
