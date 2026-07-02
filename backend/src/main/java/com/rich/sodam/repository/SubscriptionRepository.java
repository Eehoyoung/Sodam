package com.rich.sodam.repository;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.type.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Optional<Subscription> findFirstByUser_IdAndStatusIn(Long userId, List<SubscriptionStatus> statuses);

    Optional<Subscription> findByCustomerKey(String customerKey);

    @Query("select s from Subscription s " +
            "where s.status = com.rich.sodam.domain.type.SubscriptionStatus.ACTIVE " +
            "  and s.nextBillingAt <= :now")
    List<Subscription> findDueForBilling(LocalDateTime now);

    @Query("select s from Subscription s " +
            "where s.status = com.rich.sodam.domain.type.SubscriptionStatus.PAST_DUE " +
            "  and s.nextBillingAt <= :now")
    List<Subscription> findPastDueForRetry(LocalDateTime now);

    /** 90일 슬립 후보: 비활성(updatedAt 오래됨) 무료·활성·미휴면 구독. */
    @Query("select s from Subscription s " +
            "where s.plan = com.rich.sodam.domain.type.PlanType.FREE " +
            "  and s.status = com.rich.sodam.domain.type.SubscriptionStatus.ACTIVE " +
            "  and s.dormantAt is null " +
            "  and s.updatedAt <= :cutoff")
    List<Subscription> findDormantFreeCandidates(LocalDateTime cutoff);

    /**
     * win-back 대상(GR-NEW-05): 휴면 전환 시각(dormantAt)이 [from, to) 구간에 든 휴면 구독.
     * 스케줄러가 하루 1회 호출하며 from/to 로 D+N 임계 '그날'만 잡아 중복 발송을 막는다.
     */
    @Query("select s from Subscription s " +
            "where s.dormantAt is not null " +
            "  and s.dormantAt >= :from " +
            "  and s.dormantAt < :to")
    List<Subscription> findDormantBetween(LocalDateTime from, LocalDateTime to);
}
