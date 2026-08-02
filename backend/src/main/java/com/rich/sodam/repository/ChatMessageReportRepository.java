package com.rich.sodam.repository;

import com.rich.sodam.domain.ChatMessageReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageReportRepository extends JpaRepository<ChatMessageReport, Long> {

    boolean existsByMessage_IdAndReporter_Id(Long messageId, Long reporterId);

    /**
     * 특정 발신자(메시지 sender)를 신고한 서로 다른 신고자 수 — 누적 임계치 판정(§4.4)에 쓴다.
     * 신고자가 그 발신자의 여러 메시지를 각각 신고해도 1회로만 집계한다(DISTINCT reporter).
     */
    @Query("select count(distinct r.reporter.id) from ChatMessageReport r where r.message.sender.id = :senderId")
    long countDistinctReportersForSender(@Param("senderId") Long senderId);
}
