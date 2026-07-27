package com.rich.sodam.service.lock;

import java.time.Duration;

/**
 * Redis 기반 분산 락 추상화 — 05_동시성제어_및_고급아키텍처.md §7(급여 계산 동시 요청 차단).
 *
 * <p>구현은 자체 구현으로 확정(Redisson 등 외부 라이브러리 도입 안 함): 획득은
 * {@code SET key value NX PX ttl}로 원자적으로 수행하고, 해제는 "내가 넣은 토큰과 현재 값이
 * 일치하는지 확인 후 삭제"를 Lua 스크립트로 원자적으로 수행해 락 소유자가 아닌 요청이
 * 실수로 남의 락을 해제하는 것을 방지한다.
 *
 * <p>운영(prod): Redis 백엔드({@link RedisDistributedLockService}, 기존 캐시/JWT Redis 재사용).
 * 개발/테스트(dev/test): In-memory 백엔드({@link InMemoryDistributedLockService}).
 */
public interface DistributedLockService {

    /**
     * 락 획득을 시도한다.
     *
     * @param key   락 대상 키(예: {@code "payroll-calc:" + storeId + ":" + startDate + ":" + endDate})
     * @param token 이 락의 소유자를 식별하는 값(호출자가 생성, 보통 UUID) — 해제 시 소유권 검증에 사용
     * @param ttl   락 유효 시간(요청이 비정상 종료돼 해제를 못해도 이 시간 뒤 자동 만료)
     * @return 획득 성공 여부
     */
    boolean tryLock(String key, String token, Duration ttl);

    /**
     * 락을 해제한다. {@code token}이 현재 락 보유자와 일치할 때만 실제로 삭제된다(원자적 확인 후 삭제).
     */
    void unlock(String key, String token);
}
