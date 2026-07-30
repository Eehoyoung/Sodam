package com.rich.sodam.repository;

import com.rich.sodam.domain.BreakRecord;
import com.rich.sodam.domain.type.RecordedBy;
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

    /** 직원·매장의 기간 내 휴게 기록(최근 근무일 우선) — 직원 본인 조회용. */
    List<BreakRecord> findByEmployeeIdAndStoreIdAndWorkDateBetweenOrderByWorkDateDescCreatedAtDesc(
            Long employeeId, Long storeId, LocalDate from, LocalDate to);

    /**
     * 직원이 해당 매장에서 아직 종료하지 않은(진행 중인) 실시간 휴게 기록이 있는지 — 중복 시작 방지.
     *
     * <p>recordedBy=MASTER 조건을 반드시 함께 걸어야 한다 — 사장의 사후입력 기록은 breakStartTime/
     * breakEndTime 을 아예 안 쓰므로 항상 null 이라, recordedBy 없이 breakEndTime IS NULL 만 보면
     * 사장이 입력한 과거 증빙 때문에 직원이 실시간 시작을 영원히 못 하게 되는 오검출이 난다.
     */
    boolean existsByEmployeeIdAndStoreIdAndRecordedByAndBreakEndTimeIsNull(
            Long employeeId, Long storeId, RecordedBy recordedBy);
}
