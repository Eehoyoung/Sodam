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

    /**
     * 사전 고지가 아직 하나라도 남아 있는 대상 — 파기 예정일이 {@code noticeHorizon}(=now+30일) 이내이고,
     * 아직 파기·법적 홀드가 아니며, 30/15/1일 고지 중 미발송이 있는 건.
     *
     * <p>정확한 단계 판정은 {@link RetentionPurgeSchedule#pendingNoticeMilestone}가 하고, 여기서는
     * 후보를 좁히기만 한다.</p>
     */
    @Query("SELECT r FROM RetentionPurgeSchedule r WHERE r.scheduledPurgeAt <= :noticeHorizon "
            + "AND r.purgedAt IS NULL AND r.legalHold = false "
            + "AND (r.notice30dSentAt IS NULL OR r.notice15dSentAt IS NULL OR r.notice1dSentAt IS NULL) "
            + "ORDER BY r.scheduledPurgeAt")
    List<RetentionPurgeSchedule> findNeedingNotice(@Param("noticeHorizon") LocalDateTime noticeHorizon);
}
