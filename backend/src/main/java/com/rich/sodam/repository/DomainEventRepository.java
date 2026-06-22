package com.rich.sodam.repository;

import com.rich.sodam.domain.DomainEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface DomainEventRepository extends JpaRepository<DomainEvent, Long> {

    /** 한 매장의 기간 내 이벤트(집계는 서비스에서 type별 그룹핑). */
    List<DomainEvent> findByStoreIdAndOccurredAtGreaterThanEqual(Long storeId, LocalDateTime since);

    /** 전체 퍼널 카운트용(관리자) — 기간 내 전 이벤트. */
    List<DomainEvent> findByOccurredAtGreaterThanEqual(LocalDateTime since);
}
