package com.rich.sodam.jwt;

/**
 * JWT 관련 상수를 정의하는 인터페이스
 * 민감한 정보는 환경변수로 관리하고, 여기서는 공통 상수만 정의
 */
public interface JwtProperties {

    String TOKEN_PREFIX = "Bearer ";
    String HEADER_STRING = "Authorization";
}
