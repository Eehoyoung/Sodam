package com.rich.sodam.repository;

import com.rich.sodam.domain.EmploymentTypeChangeLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmploymentTypeChangeLogRepository extends JpaRepository<EmploymentTypeChangeLog, Long> {

    /** 특정 직원-매장 관계의 고용형태 전환 이력(최신순). */
    List<EmploymentTypeChangeLog> findByRelationIdOrderByChangedAtDesc(Long relationId);
}
