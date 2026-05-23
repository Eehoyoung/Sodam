package com.rich.sodam.repository;

import com.rich.sodam.domain.Referral;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReferralRepository extends JpaRepository<Referral, Long> {

    Optional<Referral> findByReferee_Id(Long refereeId);

    List<Referral> findByReferrer_IdOrderByRegisteredAtDesc(Long referrerId);

    boolean existsByReferralCodeAndReferee_Id(String code, Long refereeId);
}
