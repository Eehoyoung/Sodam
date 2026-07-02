package com.rich.sodam.repository;

import com.rich.sodam.domain.ShiftTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, Long> {

    /** 매장 템플릿 목록(최신순). */
    List<ShiftTemplate> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    /** 매장 소유 검증 겸 조회 — 다른 매장 템플릿 접근 차단. */
    Optional<ShiftTemplate> findByIdAndStoreId(Long id, Long storeId);
}
