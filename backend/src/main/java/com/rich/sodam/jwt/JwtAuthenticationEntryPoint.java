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
        String exception = (String) request.getAttribute(JwtProperties.HEADER_STRING);
        String errorCode;

        if (exception != null && exception.equals("토큰 만료.")) {
            errorCode = "토큰 만료.";
            setResponse(response, errorCode);
        }

        if (exception != null && exception.equals("유효 않은 토큰.")) {
            errorCode = "유효 않은 토큰.";
            setResponse(response, errorCode);
        }
    }

    private void setResponse(HttpServletResponse response, String errorCode) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().println(JwtProperties.HEADER_STRING + " : " + errorCode);
    }
}
