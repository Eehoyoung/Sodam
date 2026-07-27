package com.rich.sodam.service;

import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.service.lock.DistributedLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * 급여 계산 동시 요청 차단 (05_동시성제어_및_고급아키텍처.md §7).
 *
 * <p>동일 매장·동일 정산 기간에 대한 급여 계산 요청이 웹/모바일에서 동시에 들어와도 한 번에
 * 하나만 처리되도록 {@code (storeId, startDate, endDate)} 키로 분산 락을 건다. 락 획득 실패 시
 * {@link ConflictException}(409)을 던진다. 이는 §3의 멱등성 키(같은 요청의 중복)와는 별개
 * 방어선 — 다른 요청(다른 idempotency key)이라도 같은 대상에 대한 동시 계산을 막는다.
 */
@Service
@RequiredArgsConstructor
public class PayrollCalculationLockService {

    /** 계산 자체는 짧게 끝나야 하는 트랜잭션 — 비정상 종료 시 자동 해제까지의 최대 대기. */
    private static final Duration LOCK_TTL = Duration.ofSeconds(30);

    private final DistributedLockService lockService;

    public <T> T runLocked(Long storeId, LocalDate startDate, LocalDate endDate, Supplier<T> action) {
        String key = lockKey(storeId, startDate, endDate);
        String token = UUID.randomUUID().toString();
        if (!lockService.tryLock(key, token, LOCK_TTL)) {
            throw new ConflictException(
                    "이미 같은 기간에 대한 급여 계산이 진행 중이에요. 잠시 후 다시 시도해 주세요.",
                    "PAYROLL_CALCULATION_IN_PROGRESS");
        }
        try {
            return action.get();
        } finally {
            lockService.unlock(key, token);
        }
    }

    private String lockKey(Long storeId, LocalDate startDate, LocalDate endDate) {
        return "payroll-calc:" + storeId + ":" + startDate + ":" + endDate;
    }
}
