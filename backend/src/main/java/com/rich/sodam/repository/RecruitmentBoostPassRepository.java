package com.rich.sodam.repository;

import com.rich.sodam.domain.RecruitmentBoostPass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.Optional;

/**
 * 채용 부스트 무제한 패스 지갑 레포지토리(recruitment-monetization-gamification-plan.md §2.5).
 */
public interface RecruitmentBoostPassRepository extends JpaRepository<RecruitmentBoostPass, Long> {

    Optional<RecruitmentBoostPass> findByOwnerUserId(Long ownerUserId);

    /**
     * 결제 승인/웹훅 처리 시 사용 — 동시(중복) 콜백이 같은 지갑을 동시에 연장하지 못하도록 비관적
     * 락으로 직렬화한다(주문 자체도 {@code findByOrderIdForUpdate}로 직렬화되지만, 서로 다른 주문이
     * 동시에 같은 지갑을 연장할 수 있으므로 지갑 레벨 락도 함께 건다).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from RecruitmentBoostPass p where p.ownerUserId = :ownerUserId")
    Optional<RecruitmentBoostPass> findByOwnerUserIdForUpdate(@Param("ownerUserId") Long ownerUserId);
}
