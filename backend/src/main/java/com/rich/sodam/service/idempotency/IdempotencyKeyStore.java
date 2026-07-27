package com.rich.sodam.service.idempotency;

import java.time.Duration;

/**
 * 멱등성 키 저장소 추상화 — 05_동시성제어_및_고급아키텍처.md §3.
 *
 * <p>{@code (idempotencyKey, scope)} 조합의 "이미 처리됨" 여부만 짧은 TTL 동안 기록한다.
 * 실제 응답 재구성은 {@link RequestIdempotencyService}가 재요청 시 대상 리소스를 다시 조회해
 * 만든다 — 복잡한 응답 객체를 JSON으로 캐시·역직렬화하지 않아 스키마 드리프트에 안전하다.
 *
 * <p>운영(prod): Redis 백엔드({@link RedisIdempotencyKeyStore}, 기존 캐시/JWT Redis 재사용).
 * 개발/테스트(dev/test): In-memory 백엔드({@link InMemoryIdempotencyKeyStore}) —
 * {@link com.rich.sodam.service.TokenStore}/{@link com.rich.sodam.service.InMemoryTokenStore}와
 * 동일한 프로필 분리 패턴.
 */
public interface IdempotencyKeyStore {

    /**
     * 이미 처리된 요청인지 확인한다.
     *
     * @param idempotencyKey 클라이언트가 생성한 멱등성 키
     * @param scope          충돌 방지용 네임스페이스(예: {@code "payroll-issue:" + storeId})
     */
    boolean isProcessed(String idempotencyKey, String scope);

    /** 처리 완료를 기록한다. {@code ttl} 경과 후 자동 만료(같은 키 재사용 허용). */
    void markProcessed(String idempotencyKey, String scope, Duration ttl);
}
