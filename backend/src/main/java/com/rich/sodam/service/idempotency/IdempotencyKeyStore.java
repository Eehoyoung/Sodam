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
     * 이 요청의 실행 권한을 원자적으로 선점한다.
     *
     * <p>"확인 후 기록" 두 단계로 나누면 같은 키의 동시 요청이 둘 다 미처리로 판정돼 본 작업을
     * 두 번 실행한다(H-3). 선점은 반드시 단일 원자 연산이어야 한다.</p>
     *
     * @param idempotencyKey 클라이언트가 생성한 멱등성 키
     * @param scope          충돌 방지용 네임스페이스(예: {@code "payroll-issue:" + storeId})
     * @param ttl            선점 유지 시간. 경과 후 자동 만료(같은 키 재사용 허용)
     * @return 이번 호출이 선점에 성공했으면 true, 이미 선점된 키면 false
     */
    boolean tryClaim(String idempotencyKey, String scope, Duration ttl);

    /**
     * 선점을 해제한다. 본 작업이 예외로 끝났을 때만 호출된다 —
     * 실패한 요청 때문에 정상 재시도가 TTL 동안 막히면 안 되기 때문이다.
     */
    void release(String idempotencyKey, String scope);
}
