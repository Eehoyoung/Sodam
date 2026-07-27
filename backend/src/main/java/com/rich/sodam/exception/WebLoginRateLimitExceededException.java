package com.rich.sodam.exception;

/**
 * 웹 콘솔 로그인 — 계정(이메일) 기준 rate limit 초과(분당 10회, 04_보안정책.md §4).
 * IP 기준 초과는 {@link com.rich.sodam.config.RateLimitFilter} 가 필터 단에서 직접 429 를 내려준다
 * (서블릿 필터 계층이라 GlobalExceptionHandler 를 거치지 않음) — 이 예외는 컨트롤러/서비스 계층에서
 * 계정 기준 초과를 감지했을 때만 사용한다.
 */
public class WebLoginRateLimitExceededException extends RuntimeException {
    public WebLoginRateLimitExceededException() {
        super("로그인 시도가 너무 잦아요. 잠시 후 다시 시도해 주세요.");
    }
}
