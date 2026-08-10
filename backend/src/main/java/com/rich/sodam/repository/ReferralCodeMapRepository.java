package com.rich.sodam.repository;

import com.rich.sodam.domain.ReferralCodeMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReferralCodeMapRepository extends JpaRepository<ReferralCodeMap, Long> {

    Optional<ReferralCodeMap> findByCode(String code);

    Optional<ReferralCodeMap> findByUserId(Long userId);

    /** 레거시 이관 배치용 — 페이지 단위로 이미 매핑된 사용자만 골라낸다. */
    @Query("select m.userId from ReferralCodeMap m where m.userId in :userIds")
    List<Long> findUserIdsByUserIdIn(@Param("userIds") Collection<Long> userIds);

    /** 레거시 이관 배치용 — 페이지 단위로 이미 선점된 코드만 골라낸다. */
    @Query("select m.code from ReferralCodeMap m where m.code in :codes")
    List<String> findCodesByCodeIn(@Param("codes") Collection<String> codes);
}
