package com.rich.sodam.service;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 90일 슬립 — 비활성 무료 계정을 휴면 처리한다. 수익화 확정안 §9.
 * 목적은 비용 절감(무료는 미수금 0)이 아니라 <b>MAU 집계 정화·재참여 트리거</b>다.
 * 상태(ACTIVE)는 유지하고 dormantAt 플래그만 설정하므로 사용자 데이터는 보존된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountSleepService {

    private final SubscriptionRepository subscriptionRepository;

    /**
     * {@code asOf} 기준 {@code inactiveDays}일 이상 갱신이 없는 무료·활성 구독을 휴면 처리.
     *
     * @return 휴면 처리된 건수
     */
    @Transactional
    public int sleepDormantFreeSubscriptions(LocalDateTime asOf, int inactiveDays) {
        LocalDateTime cutoff = asOf.minusDays(inactiveDays);
        List<Subscription> candidates = subscriptionRepository.findDormantFreeCandidates(cutoff);
        candidates.forEach(Subscription::markDormant);
        if (!candidates.isEmpty()) {
            log.info("90일 슬립: {}건 휴면 처리 (cutoff={})", candidates.size(), cutoff);
        }
        return candidates.size();
    }
}
