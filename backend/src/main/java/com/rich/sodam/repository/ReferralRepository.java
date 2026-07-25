package com.rich.sodam.repository;

import com.rich.sodam.domain.Referral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface ReferralRepository extends JpaRepository<Referral, Long> {

    Optional<Referral> findByReferee_Id(Long refereeId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Referral r where r.referee.id = :refereeId")
    Optional<Referral> findByRefereeIdForUpdate(@Param("refereeId") Long refereeId);

    List<Referral> findByReferrer_IdOrderByRegisteredAtDesc(Long referrerId);

    boolean existsByReferralCodeAndReferee_Id(String code, Long refereeId);

    /** 레퍼럴 보상(S2) — 전환 완료 건수(보상 요약용). */
    long countByReferrer_IdAndStatus(Long referrerId, Referral.Status status);
}
