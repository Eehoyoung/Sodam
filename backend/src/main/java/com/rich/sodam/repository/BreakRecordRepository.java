package com.rich.sodam.repository;

import com.rich.sodam.domain.BreakRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface BreakRecordRepository extends JpaRepository<BreakRecord, Long> {

    /** 직원·매장의 휴게 부여 기록(최근 근무일 우선). */
    List<BreakRecord> findByEmployeeIdAndStoreIdOrderByWorkDateDescCreatedAtDesc(Long employeeId, Long storeId);

    /** 직원·매장의 특정 근무일 휴게 부여 기록. (§54 부여 여부 확인용) */
    List<BreakRecord> findByEmployeeIdAndStoreIdAndWorkDate(Long employeeId, Long storeId, LocalDate workDate);

    /** 매장의 기간 내 휴게 부여 기록(근무일 오름차순). */
    List<BreakRecord> findByStoreIdAndWorkDateBetweenOrderByWorkDateAsc(Long storeId, LocalDate from, LocalDate to);
}
