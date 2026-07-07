package com.rich.sodam.repository;

import com.rich.sodam.domain.AttendanceIrregularity;
import com.rich.sodam.domain.type.AttendanceIrregularityResolution;
import com.rich.sodam.domain.type.AttendanceIrregularityType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceIrregularityRepository extends JpaRepository<AttendanceIrregularity, Long> {

    /** 감지 중복 방지 — 같은 시프트에 같은 유형이 이미 있으면 재생성하지 않는다(사장 확정 결과 보존). */
    boolean existsByWorkShiftIdAndType(Long workShiftId, AttendanceIrregularityType type);

    List<AttendanceIrregularity> findByStoreIdAndShiftDateBetweenOrderByShiftDateDesc(
            Long storeId, LocalDate from, LocalDate to);

    List<AttendanceIrregularity> findByEmployeeIdAndStoreIdAndResolutionNotOrderByShiftDateDesc(
            Long employeeId, Long storeId, AttendanceIrregularityResolution resolution);

    /** 정산 반영용 — WAIVED(공제 없이 처리) 건의 미근무시간을 자동 공제 계산에서 제외하기 위한 조회. */
    List<AttendanceIrregularity> findByEmployeeIdAndStoreIdAndShiftDateBetweenAndResolution(
            Long employeeId, Long storeId, LocalDate from, LocalDate to, AttendanceIrregularityResolution resolution);
}
