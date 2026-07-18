package com.rich.sodam.repository;

import com.rich.sodam.domain.TaxReportSendLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

/**
 * 세무사 인건비 내역서 발송 이력 레포지토리
 */
public interface TaxReportSendLogRepository extends JpaRepository<TaxReportSendLog, Long> {

    List<TaxReportSendLog> findByStore_IdOrderBySentAtDesc(Long storeId);

    /** 같은 정산기간에 이미 성공 발송된 이력 존재 여부 — 중복 발송 경고용 */
    boolean existsByStore_IdAndPeriodStartAndPeriodEndAndStatus(
            Long storeId, LocalDate periodStart, LocalDate periodEnd, TaxReportSendLog.SendStatus status);
}
