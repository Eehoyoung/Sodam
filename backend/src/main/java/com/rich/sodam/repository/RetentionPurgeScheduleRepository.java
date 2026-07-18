package com.rich.sodam.repository;

import com.rich.sodam.domain.RetentionPurgeSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RetentionPurgeScheduleRepository extends JpaRepository<RetentionPurgeSchedule, Long> {

    Optional<RetentionPurgeSchedule> findByTableNameAndEntityId(String tableName, Long entityId);

    /** 파기 예정일이 도래했고(오늘 이하), 아직 파기되지 않았고, 법적 홀드가 아닌 대상. */
    @Query("SELECT r FROM RetentionPurgeSchedule r WHERE r.scheduledPurgeAt <= :now "
            + "AND r.purgedAt IS NULL AND r.legalHold = false")
    List<RetentionPurgeSchedule> findDueForPurge(@Param("now") LocalDateTime now);
}
