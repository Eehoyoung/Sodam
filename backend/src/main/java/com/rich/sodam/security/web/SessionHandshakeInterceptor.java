package com.rich.sodam.security.web;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * 사장님 웹 콘솔(세션 로그인) 사용자를 위한 STOMP 핸드셰이크(HTTP GET /ws) 인터셉터.
 *
 * <p>브라우저는 같은 오리진의 {@code /ws} 핸드셰이크 요청에 세션 쿠키({@code sodam_web_sid})를
 * 자동으로 함께 보낸다. 이 시점의 {@link ServerHttpRequest} 는 서블릿 기반 배포에서 항상
 * {@link ServletServerHttpRequest} 이므로, 그 안의 {@link HttpSession} 에 로그인 시
 * {@link HttpSessionSecurityContextRepository}(표준 구현, 웹 콘솔 로그인 컨트롤러가 사용하는 것과
 * 동일한 빈) 가 저장해둔 {@link SecurityContext} 를 그대로 꺼내 WebSocket 세션 attributes 로
 * 옮겨 담는다.</p>
 *
 * <p>모바일 JWT 클라이언트는 세션 쿠키를 보내지 않으므로({@code getSession(false)} 가 null 반환)
 * 이 인터셉터는 아무 것도 하지 않고 통과시킨다 — {@link StompAuthChannelInterceptor} 의 기존 JWT
 * CONNECT 경로에는 전혀 영향을 주지 않는다.</p>
 */
public class SessionHandshakeInterceptor implements HandshakeInterceptor {

    /** WebSocket 세션(STOMP {@code accessor.getSessionAttributes()}) 에 저장되는 키. */
    public static final String SESSION_SECURITY_CONTEXT_ATTR = "SODAM_WEB_SESSION_SECURITY_CONTEXT";

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpSession session = servletRequest.getServletRequest().getSession(false);
            if (session != null) {
                Object contextAttr = session.getAttribute(
                        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
                if (contextAttr instanceof SecurityContext securityContext
                        && securityContext.getAuthentication() != null
                        && securityContext.getAuthentication().isAuthenticated()) {
                    attributes.put(SESSION_SECURITY_CONTEXT_ATTR, securityContext);
                }
            }
        }
        // 세션이 없거나 인증 정보가 없어도 핸드셰이크 자체는 항상 통과시킨다 — 최종 인증 여부 판단은
        // CONNECT 프레임 처리 시점의 StompAuthChannelInterceptor 가 담당한다(JWT/세션 둘 다 없으면
        // 거기서 거부).
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }
}
