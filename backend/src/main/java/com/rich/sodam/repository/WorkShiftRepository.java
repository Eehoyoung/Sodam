package com.rich.sodam.repository;

import com.rich.sodam.domain.WorkShift;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface WorkShiftRepository extends JpaRepository<WorkShift, Long> {

    /** 매장 기간 조회(사장) — 시프트 일자 오름차순. */
    List<WorkShift> findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(Long storeId, LocalDate from, LocalDate to);

    List<WorkShift> findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullOrderByShiftDateAsc(
            Long storeId, LocalDate from, LocalDate to);

    List<WorkShift> findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNullOrderByShiftDateAsc(
            Long storeId, LocalDate from, LocalDate to);

    List<WorkShift> findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullAndConfirmationNotificationSentAtIsNullOrderByShiftDateAsc(
            Long storeId, LocalDate from, LocalDate to);

    /** 직원 본인 기간 조회 — 시프트 일자 오름차순. */
    List<WorkShift> findByEmployeeIdAndShiftDateBetweenOrderByShiftDateAsc(Long employeeId, LocalDate from, LocalDate to);

    List<WorkShift> findByEmployeeIdAndShiftDateBetweenAndConfirmedAtIsNotNullOrderByShiftDateAsc(
            Long employeeId, LocalDate from, LocalDate to);

    /** 월급제 급여 계산용 — 직원×매장×기간의 확정 시프트(소정근로일 판정 근거). */
    List<WorkShift> findByEmployeeIdAndStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNull(
            Long employeeId, Long storeId, LocalDate from, LocalDate to);

    /** 출근 리마인드 스케줄러용 — 특정 일자 시프트 전체. */
    List<WorkShift> findByShiftDate(LocalDate shiftDate);

    /** 지각·미출근 감지 배치용 — 특정 일자의 확정 시프트만. */
    List<WorkShift> findByShiftDateAndConfirmedAtIsNotNull(LocalDate shiftDate);
}
