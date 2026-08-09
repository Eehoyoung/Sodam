package com.rich.sodam.repository;

import com.rich.sodam.domain.ReferralCodeMap;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReferralCodeMapRepository extends JpaRepository<ReferralCodeMap, Long> {

    Optional<ReferralCodeMap> findByCode(String code);

    Optional<ReferralCodeMap> findByUserId(Long userId);
}
