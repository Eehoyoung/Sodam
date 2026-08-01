package com.rich.sodam.service.webauth;

/**
 * 로그인 계정 임시 잠금 저장소 추상화 — 04_보안정책.md §4/§10.
 * 웹 콘솔({@link com.rich.sodam.controller.WebAuthController})과 모바일
 * ({@link com.rich.sodam.controller.LoginController}) 로그인이 동일 계정 보호를 위해 공유한다.
 *
 * <p>동일 계정(이메일) 연속 로그인 실패 5회(성공 시 카운터 리셋) 시 15분간 해당 계정의 로그인을
 * 차단한다. IP 기준 rate limit({@link com.rich.sodam.config.RateLimitFilter})과는 별개 방어선 —
 * IP 는 짧은 시간창 내 시도 횟수를, 이 서비스는 시간창과 무관하게 누적 실패 자체를 본다.
 *
 * <p>운영(prod): Redis 백엔드({@link RedisLoginLockoutService}).
 * 개발/테스트(dev/test): In-memory 백엔드({@link InMemoryLoginLockoutService}) —
 * {@link com.rich.sodam.service.TokenStore}/{@link com.rich.sodam.service.InMemoryTokenStore} 와
 * 동일한 프로필 분리 패턴.
 */
public interface LoginLockoutService {

    /** 최대 연속 실패 허용 횟수 — 이 값에 도달하면 잠금. */
    int MAX_CONSECUTIVE_FAILURES = 5;

    /** 잠금 지속 시간(분). */
    int LOCK_DURATION_MINUTES = 15;

    /**
     * 계정이 현재 잠겨 있으면 {@link com.rich.sodam.exception.AccountLockedException} 을 던진다.
     * 잠겨 있지 않으면 아무 일도 하지 않는다(정상 진행).
     *
     * @param accountKey 정규화된 이메일(소문자 trim) — 계정 식별 키
     */
    void assertNotLocked(String accountKey);

    /**
     * 로그인 실패를 기록한다. 누적 실패 횟수가 {@link #MAX_CONSECUTIVE_FAILURES} 에 도달하면
     * {@link #LOCK_DURATION_MINUTES} 분간 잠금을 건다.
     */
    void recordFailure(String accountKey);

    /** 로그인 성공 시 실패 카운터·잠금 상태를 초기화한다. */
    void recordSuccess(String accountKey);
}
