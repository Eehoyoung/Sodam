package com.rich.sodam.repository;

import com.rich.sodam.domain.AttendanceNotice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface AttendanceNoticeRepository extends JpaRepository<AttendanceNotice, Long> {

    /** 근태 이상 확정 화면에서 직원이 남긴 사전 신고를 함께 보여주기 위한 조회. */
    Optional<AttendanceNotice> findFirstByEmployeeIdAndStoreIdAndForDateOrderByCreatedAtDesc(
            Long employeeId, Long storeId, LocalDate forDate);
}
