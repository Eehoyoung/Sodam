package com.rich.sodam.repository;

import com.rich.sodam.domain.RecruitmentBoostPassOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

/**
 * 채용 부스트 무제한 패스 주문 레포지토리(recruitment-monetization-gamification-plan.md §2.5, §7).
 */
public interface RecruitmentBoostPassOrderRepository extends JpaRepository<RecruitmentBoostPassOrder, Long> {

    Optional<RecruitmentBoostPassOrder> findByOrderId(String orderId);

    /**
     * 결제 승인/웹훅 처리 시 사용 — 동시(중복) 콜백이 같은 주문을 동시에 PAID 전이시키지 못하도록
     * 비관적 락으로 직렬화한다({@code AttendanceCreditChargeOrderRepository}와 동일 패턴, 웹훅 재시도
     * 멱등의 최종 방어선).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from RecruitmentBoostPassOrder o where o.orderId = :orderId")
    Optional<RecruitmentBoostPassOrder> findByOrderIdForUpdate(@Param("orderId") String orderId);

    List<RecruitmentBoostPassOrder> findByOwnerUserIdOrderByCreatedAtDesc(Long ownerUserId);
}
