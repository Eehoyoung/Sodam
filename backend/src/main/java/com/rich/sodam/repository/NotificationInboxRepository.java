package com.rich.sodam.repository;

import com.rich.sodam.domain.NotificationInbox;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationInboxRepository extends JpaRepository<NotificationInbox, Long> {

    Page<NotificationInbox> findByUser_IdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUser_IdAndIsReadFalse(Long userId);

    @Query("SELECT n FROM NotificationInbox n WHERE n.id = :id AND n.user.id = :userId")
    Optional<NotificationInbox> findByIdAndOwner(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 보존기간 만료 스캔용(Phase 4, §2.5) — 카테고리별로 보존기간이 달라 정책마다 대상 카테고리
     * 집합과 cutoff를 다르게 넘긴다({@code com.rich.sodam.service.retention} 패키지의 3개 정책).
     */
    List<NotificationInbox> findByCategoryInAndCreatedAtLessThan(
            List<NotificationInbox.Category> categories, LocalDateTime cutoff);
}
