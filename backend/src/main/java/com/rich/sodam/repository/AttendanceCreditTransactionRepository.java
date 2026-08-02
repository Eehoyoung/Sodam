package com.rich.sodam.repository;

import com.rich.sodam.domain.AttendanceCreditTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 출근권 거래 원장 레포지토리(recruitment-monetization-gamification-plan.md §2, §7).
 */
public interface AttendanceCreditTransactionRepository extends JpaRepository<AttendanceCreditTransaction, Long> {

    /**
     * FIFO 소모 대상 lot — 아직 남아있고(remainingQuantity&gt;0) 만료되지 않은 공급성 거래를
     * 만료 임박순(오름차순, 무기한 NULL은 맨 뒤)으로 반환한다.
     */
    @Query("select t from AttendanceCreditTransaction t "
            + "where t.ownerUserId = :ownerUserId and t.remainingQuantity > 0 "
            + "and (t.expiresAt is null or t.expiresAt > :now) "
            + "order by case when t.expiresAt is null then 1 else 0 end, t.expiresAt asc, t.id asc")
    List<AttendanceCreditTransaction> findActiveLotsForConsumption(@Param("ownerUserId") Long ownerUserId,
                                                                     @Param("now") LocalDateTime now);

    /** 만료됐지만 아직 스윕(remainingQuantity→0 반영)되지 않은 lot. */
    @Query("select t from AttendanceCreditTransaction t "
            + "where t.ownerUserId = :ownerUserId and t.remainingQuantity > 0 "
            + "and t.expiresAt is not null and t.expiresAt <= :now")
    List<AttendanceCreditTransaction> findExpiredUnsweptLots(@Param("ownerUserId") Long ownerUserId,
                                                               @Param("now") LocalDateTime now);

    /** 아직 스윕되지 않은(만료됐지만 remainingQuantity가 남아있는) 총 수량 — GET /me 응답용 lazy 보정치. */
    @Query("select coalesce(sum(t.remainingQuantity), 0) from AttendanceCreditTransaction t "
            + "where t.ownerUserId = :ownerUserId and t.remainingQuantity > 0 "
            + "and t.expiresAt is not null and t.expiresAt <= :now")
    int sumExpiredUnswept(@Param("ownerUserId") Long ownerUserId, @Param("now") LocalDateTime now);

    /** 이번 주(지금부터 주 마지막 시각까지) 소멸 예정 수량 — FE 배너용. */
    @Query("select coalesce(sum(t.remainingQuantity), 0) from AttendanceCreditTransaction t "
            + "where t.ownerUserId = :ownerUserId and t.remainingQuantity > 0 "
            + "and t.expiresAt is not null and t.expiresAt > :now and t.expiresAt <= :weekEnd")
    int sumExpiringBetween(@Param("ownerUserId") Long ownerUserId, @Param("now") LocalDateTime now,
                            @Param("weekEnd") LocalDateTime weekEnd);
}
