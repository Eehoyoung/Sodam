package com.rich.sodam.config;

import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.security.web.SessionHandshakeInterceptor;
import com.rich.sodam.security.web.StompAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

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
 * <p>인증: 모바일 앱은 STOMP CONNECT 시 {@code Authorization: Bearer <jwt>} 헤더로 인증한다
 * (기존 경로, 변경 없음). 사장님 웹 콘솔(세션 로그인)은 JWT 헤더를 보내지 않는 대신, 핸드셰이크
 * (HTTP GET /ws) 시점에 브라우저가 자동으로 동봉하는 세션 쿠키를 {@link SessionHandshakeInterceptor}
 * 가 읽어 SecurityContext 를 STOMP 세션 attributes 로 옮겨두고, {@link StompAuthChannelInterceptor}
 * 가 Authorization 헤더가 없을 때에 한해 그 값으로 대체 인증한다(우선순위: JWT → 세션 → 거부).
 * 핸드셰이크 HTTP 업그레이드 경로(/ws)는 모바일 SecurityConfig 에서 permitAll, 웹 세션 체인에서는
 * 세션 쿠키가 있으면 인증된 요청으로 통과한다.</p>
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
        // CORS: 모바일 앱은 Origin 이 없거나 임의이므로 허용(인증은 STOMP CONNECT 시점에 별도 강제).
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(new SessionHandshakeInterceptor());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new StompAuthChannelInterceptor(jwtTokenProvider));
    }
}
