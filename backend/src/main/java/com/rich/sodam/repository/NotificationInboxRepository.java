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
}
