package com.rich.sodam.jwt;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        // 인증 실패는 항상 401 로 응답한다. 필터가 만료/무효 사유를 request attribute 로 남기면 메시지에 반영하되,
        // 없더라도 401 은 반드시 내려야 FE 의 토큰 자동 갱신(401 트리거)이 동작한다.
        // (과거엔 attribute 가 세팅된 경우에만 응답을 써서, 만료 토큰이 403 으로 빠지고 갱신이 안 됐다.)
        String exception = (String) request.getAttribute(JwtProperties.HEADER_STRING);
        String message = exception != null ? exception : "인증이 필요합니다.";
        setResponse(response, message);
    }

    private void setResponse(HttpServletResponse response, String message) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"success\":false,\"errorCode\":\"UNAUTHORIZED\",\"message\":\"" + message + "\"}");
    }
}
