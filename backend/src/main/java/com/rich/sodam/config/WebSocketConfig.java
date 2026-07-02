package com.rich.sodam.config;

import com.rich.sodam.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;

/**
 * 실시간 인앱 동기화용 STOMP over WebSocket 설정.
 *
 * <p>용도: 직원 입사·출퇴근 등 한 행위자의 변경을 같은 매장을 보고 있는 다른 화면/기기에 즉시 반영.
 * FCM(앱 종료 시 푸시)과 달리 <b>앱이 열려 있는 동안의 라이브 동기화</b>에 쓴다. 자체 서버에서
 * 동작하므로 외부 키 불필요.</p>
 *
 * <p>토픽: {@code /topic/store.{storeId}} — 해당 매장을 구독한 사장/직원에게 변경 신호 전달.
 * 페이로드는 "무엇이 바뀌었으니 다시 조회하라"는 트리거({type, storeId})일 뿐, 민감정보는 담지
 * 않는다. 실제 데이터는 BOLA 가드가 걸린 REST 재조회로 가져간다.</p>
 *
 * <p>인증: STOMP CONNECT 시 {@code Authorization: Bearer <jwt>} 헤더를 검증해 Principal(userId)을
 * 설정한다. 핸드셰이크 HTTP 업그레이드 경로(/ws)는 SecurityConfig 에서 permitAll.</p>
 */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // RN 클라이언트는 네이티브 WebSocket(@stomp/stompjs) 사용 — SockJS 불필요.
        // CORS: 모바일 앱은 Origin 이 없거나 임의이므로 허용(인증은 STOMP CONNECT JWT 로 별도 강제).
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String bearer = accessor.getFirstNativeHeader("Authorization");
                    String token = (bearer != null && bearer.startsWith("Bearer "))
                            ? bearer.substring(7) : bearer;
                    if (token == null || !jwtTokenProvider.validateToken(token)) {
                        // 인증 실패 시 CONNECT 거부 — 토큰 없는 연결은 동기화 채널에 들어오지 못한다.
                        throw new org.springframework.messaging.MessageDeliveryException("WS 인증 실패");
                    }
                    Long userId = jwtTokenProvider.getUserId(token);
                    accessor.setUser((Principal) () -> String.valueOf(userId));
                }
                return message;
            }
        });
    }
}
