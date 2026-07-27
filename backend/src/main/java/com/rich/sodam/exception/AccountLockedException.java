package com.rich.sodam.exception;

import lombok.Getter;

/**
 * 웹 콘솔 로그인 계정 임시 잠금 — 04_보안정책.md §4/§10:
 * 동일 계정 연속 로그인 실패 5회(성공 시 카운터 리셋) 시 15분간 로그인 차단.
 *
 * <p>상태코드는 423(Locked, WebDAV 확장이지만 Spring {@link org.springframework.http.HttpStatus#LOCKED}
 * 로 표준 지원)을 사용한다 — 근거: 문서에 상태코드가 명시되지 않아 직접 판단했다.
 * 429(Too Many Requests)는 이미 IP 기준 rate limit({@link com.rich.sodam.config.RateLimitFilter})이
 * 선점하고 있어 재사용하면 FE 가 "요청이 너무 잦음"과 "계정이 잠김"을 구분할 수 없다.
 * 401은 "이 요청의 자격증명이 틀렸다"는 의미로 굳어져 있어(FE 토큰 갱신 트리거) 재인증 유도로
 * 오분류될 위험이 있다. 423은 IANA 등록 상태코드로 "리소스(계정)가 잠겨 있다"는 의미가 가장
 * 정확히 부합하고, FE 가 errorCode(ACCOUNT_LOCKED)로 명확히 분기할 수 있다.
 */
@Getter
public class AccountLockedException extends RuntimeException {

    public static final String ERROR_CODE = "ACCOUNT_LOCKED";

    private final long retryAfterSeconds;

    public AccountLockedException(long retryAfterSeconds) {
        super("로그인 시도가 5회 실패해 계정이 일시적으로 잠겼어요. 잠시 후 다시 시도해 주세요.");
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
