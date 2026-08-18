package com.rich.sodam.service.idempotency;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.function.Supplier;

/**
 * 금전·법적 효력이 있는 POST/PUT 요청의 중복 실행을 막는 멱등성 실행기
 * (05_동시성제어_및_고급아키텍처.md §3 — 급여 확정 등에 사용).
 *
 * <p>동일 {@code (idempotencyKey, scope)} 재요청은 {@code onFirstCall}을 다시 실행하지 않고,
 * 이미 처리됐다는 사실만 확인한 뒤 {@code onReplay}로 현재 DB 상태를 다시 조회해 응답을 만든다.
 * 처리 결과(예: {@code PayrollDto})를 JSON으로 직렬화·캐시하지 않으므로 응답 DTO의 Jackson
 * 역직렬화 가능 여부(세터·생성자 유무)에 의존하지 않고, 재요청 시에도 항상 최신 영속 상태를
 * 그대로 반영한다 — 급여 확정처럼 결과가 상태 전이 자체인 작업에 적합하다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RequestIdempotencyService {

    /** 결제 멱등 처리와 동일하게 짧은 TTL — 05_동시성제어_및_고급아키텍처.md §3 예시값(10분). */
    public static final Duration DEFAULT_TTL = Duration.ofMinutes(10);

    private final IdempotencyKeyStore store;

    /**
     * {@code idempotencyKey}가 없으면(null/blank) 멱등 처리 없이 바로 실행한다 — 기존 클라이언트
     * 호환을 위해 헤더를 선택적으로 취급하는 진입점(예: 개별 급여 발급)에서 사용.
     */
    public <T> T executeOptional(String idempotencyKey, String scope, Supplier<T> onFirstCall, Supplier<T> onReplay) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return onFirstCall.get();
        }
        return execute(idempotencyKey, scope, onFirstCall, onReplay);
    }

    /** {@code idempotencyKey}가 필수인 진입점(신규 웹 콘솔 엔드포인트)에서 사용. */
    public <T> T execute(String idempotencyKey, String scope, Supplier<T> onFirstCall, Supplier<T> onReplay) {
        // 선점(claim)을 먼저 원자적으로 따낸 쪽만 본 작업을 실행한다 — 확인과 기록을 나누면
        // 동시 요청이 둘 다 통과해 급여 확정 같은 금전 작업이 두 번 실행된다(H-3).
        if (!store.tryClaim(idempotencyKey, scope, DEFAULT_TTL)) {
            log.info("멱등 키 재요청 감지 — 재실행 없이 현재 상태를 재조회해 반환 scope={} key={}", scope, mask(idempotencyKey));
            return onReplay.get();
        }
        try {
            return onFirstCall.get();
        } catch (RuntimeException | Error e) {
            // 실패한 요청이 TTL 동안 정상 재시도를 막지 않도록 선점을 놓아준다.
            store.release(idempotencyKey, scope);
            throw e;
        }
    }

    private String mask(String key) {
        if (key == null || key.length() <= 8) return "***";
        return key.substring(0, 4) + "***" + key.substring(key.length() - 4);
    }
}
