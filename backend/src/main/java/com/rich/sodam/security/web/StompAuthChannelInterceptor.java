package com.rich.sodam.security.web;

import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;

import java.security.Principal;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * STOMP CONNECT 인증 — 모바일 JWT 와 사장님 웹 콘솔 세션 인증을 모두 인식한다.
 *
 * <p>우선순위는 고정이다: {@code Authorization} 헤더가 있으면 기존 모바일 JWT 검증 경로만 탄다
 * (동작 변경 없음). 헤더가 아예 없을 때에 한해 {@link SessionHandshakeInterceptor} 가 핸드셰이크
 * 시점에 STOMP 세션 attributes 에 심어둔 {@link SecurityContext} 로 대체 인증한다. 둘 다 없으면
 * 기존과 동일하게 CONNECT 를 거부한다.</p>
 */
@Slf4j
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern STORE_TOPIC = Pattern.compile("^/topic/store\\.(\\d+)$");
    private final JwtTokenProvider jwtTokenProvider;
    private final StoreAuthorizationPolicy storeAuthorizationPolicy;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String bearer = accessor.getFirstNativeHeader("Authorization");
            Long userId;
            if (bearer != null) {
                // 기존 모바일 JWT CONNECT 경로 — 로직 변경 없음.
                String token = bearer.startsWith("Bearer ") ? bearer.substring(7) : bearer;
                if (!jwtTokenProvider.validateToken(token)) {
                    // 인증 실패 시 CONNECT 거부 — 토큰 없는 연결은 동기화 채널에 들어오지 못한다.
                    throw new MessageDeliveryException("WS 인증 실패");
                }
                userId = jwtTokenProvider.getUserId(token);
            } else {
                // Authorization 헤더가 없을 때만 세션 인증 대체 경로 시도(웹 콘솔).
                UserPrincipal sessionPrincipal = resolveSessionPrincipal(accessor);
                if (sessionPrincipal == null) {
                    throw new MessageDeliveryException("WS 인증 실패");
                }
                userId = sessionPrincipal.getId();
            }
            accessor.setUser((Principal) () -> String.valueOf(userId));
        }
        if (accessor != null && StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeStoreTopicSubscription(accessor);
        }
        return message;
    }

    private void authorizeStoreTopicSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith("/topic/store.")) {
            return;
        }
        Matcher matcher = STORE_TOPIC.matcher(destination);
        Principal principal = accessor.getUser();
        if (!matcher.matches() || principal == null) {
            throw new MessageDeliveryException("WS store topic authorization failed");
        }
        try {
            long userId = Long.parseLong(principal.getName());
            long storeId = Long.parseLong(matcher.group(1));
            // Store membership is enforced for every subscription, not just at CONNECT time.
            // Historical employee relations are not enough: former staff must not receive live store signals.
            storeAuthorizationPolicy.assertActiveMemberOfStore(userId, storeId);
        } catch (NumberFormatException e) {
            throw new MessageDeliveryException("WS store topic authorization failed");
        }
    }

    /**
     * {@link SessionHandshakeInterceptor} 가 핸드셰이크 시점에 STOMP 세션 attributes 에 넣어둔
     * {@link SecurityContext} 에서 {@link UserPrincipal} 을 꺼낸다. 세션이 없거나(모바일 클라이언트),
     * 세션은 있으나 인증 정보가 없으면(로그인 안 한 상태) {@code null} 을 반환한다.
     */
    private UserPrincipal resolveSessionPrincipal(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return null;
        }
        Object contextAttr = sessionAttributes.get(SessionHandshakeInterceptor.SESSION_SECURITY_CONTEXT_ATTR);
        if (!(contextAttr instanceof SecurityContext securityContext)) {
            return null;
        }
        Authentication authentication = securityContext.getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        if (authentication.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal;
        }
        return null;
    }
}
