package com.rich.sodam.security.web;

import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextImpl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * {@link StompAuthChannelInterceptor} CONNECT 인증 분기 단위 테스트.
 *
 * <p>실제 WebSocket/STOMP 통신 없이 {@link StompHeaderAccessor} 를 직접 조립해 preSend 로직만
 * 검증한다(회귀 방지 목적) — 통합 레벨 검증은
 * {@code com.rich.sodam.integration.WebSocketDualAuthIntegrationTest} 참고.
 */
class StompAuthChannelInterceptorTest {

    private JwtTokenProvider jwtTokenProvider;
    private StoreAuthorizationPolicy storeAuthorizationPolicy;
    private StompAuthChannelInterceptor interceptor;
    private MessageChannel channel;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = Mockito.mock(JwtTokenProvider.class);
        storeAuthorizationPolicy = Mockito.mock(StoreAuthorizationPolicy.class);
        interceptor = new StompAuthChannelInterceptor(jwtTokenProvider, storeAuthorizationPolicy);
        channel = Mockito.mock(MessageChannel.class);
    }

    private Message<byte[]> connectMessage(String authorizationHeader, Map<String, Object> sessionAttributes) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (authorizationHeader != null) {
            accessor.setNativeHeader("Authorization", authorizationHeader);
        }
        if (sessionAttributes != null) {
            accessor.setSessionAttributes(sessionAttributes);
        }
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private Map<String, Object> sessionAttributesWithPrincipal(Long userId) {
        UserPrincipal principal = new UserPrincipal(userId, "web-master@example.com",
                List.of(new SimpleGrantedAuthority("ROLE_MASTER")));
        Authentication authentication =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContext securityContext = new SecurityContextImpl(authentication);

        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put(SessionHandshakeInterceptor.SESSION_SECURITY_CONTEXT_ATTR, securityContext);
        return sessionAttributes;
    }

    @Test
    @DisplayName("Authorization 헤더 + 유효한 JWT면 기존 경로대로 userId principal 설정")
    void connect_withValidJwt_setsUserPrincipal() {
        when(jwtTokenProvider.validateToken(anyString())).thenReturn(true);
        when(jwtTokenProvider.getUserId(anyString())).thenReturn(7L);

        Message<byte[]> message = connectMessage("Bearer valid-jwt-token", null);
        Message<?> result = interceptor.preSend(message, channel);

        StompHeaderAccessor resultAccessor =
                StompHeaderAccessor.wrap(result);
        assertThat(resultAccessor.getUser()).isNotNull();
        assertThat(resultAccessor.getUser().getName()).isEqualTo("7");
    }

    @Test
    @DisplayName("Authorization 헤더가 있지만 JWT가 무효하면 세션 attributes가 있어도 거부(JWT 우선, 세션으로 폴백하지 않음)")
    void connect_withInvalidJwt_rejectsEvenIfSessionPrincipalPresent() {
        when(jwtTokenProvider.validateToken(anyString())).thenReturn(false);

        Message<byte[]> message = connectMessage("Bearer expired-token", sessionAttributesWithPrincipal(99L));

        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    @DisplayName("Authorization 헤더 없이 세션 SecurityContext만 있으면 세션 principal의 userId로 CONNECT 허용")
    void connect_withoutJwtHeader_usesSessionPrincipal() {
        Message<byte[]> message = connectMessage(null, sessionAttributesWithPrincipal(42L));

        Message<?> result = interceptor.preSend(message, channel);

        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertThat(resultAccessor.getUser()).isNotNull();
        assertThat(resultAccessor.getUser().getName()).isEqualTo("42");
        Mockito.verifyNoInteractions(jwtTokenProvider);
    }

    @Test
    @DisplayName("Authorization 헤더도 세션 attributes도 없으면 CONNECT 거부")
    void connect_withoutJwtOrSession_rejects() {
        Message<byte[]> message = connectMessage(null, null);

        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    @DisplayName("세션 attributes는 있지만 인증정보가 없으면(비로그인) CONNECT 거부")
    void connect_withSessionAttributesButNoAuthentication_rejects() {
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put(SessionHandshakeInterceptor.SESSION_SECURITY_CONTEXT_ATTR, new SecurityContextImpl());

        Message<byte[]> message = connectMessage(null, sessionAttributes);

        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    @DisplayName("CONNECT 가 아닌 커맨드(SEND 등)는 인증 로직을 타지 않고 그대로 통과")
    void nonConnectCommand_passesThrough() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, channel);

        assertThat(result).isSameAs(message);
        Mockito.verifyNoInteractions(jwtTokenProvider);
    }

    @Test
    @DisplayName("매장 멤버가 아닌 사용자는 해당 매장 STOMP 토픽을 구독할 수 없다")
    void subscribeToOtherStore_isDenied() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/store.99");
        accessor.setUser(() -> "7");
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        org.springframework.security.access.AccessDeniedException denied =
                new org.springframework.security.access.AccessDeniedException("not a member");
        org.mockito.Mockito.doThrow(denied)
                .when(storeAuthorizationPolicy).assertActiveMemberOfStore(7L, 99L);

        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isSameAs(denied);
    }
}
