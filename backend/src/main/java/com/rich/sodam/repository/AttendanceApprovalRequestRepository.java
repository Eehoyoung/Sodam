package com.rich.sodam.repository;

import com.rich.sodam.domain.AttendanceApprovalRequest;
import com.rich.sodam.domain.AttendanceApprovalRequest.Status;
import com.rich.sodam.domain.AttendanceApprovalRequest.Type;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface AttendanceApprovalRequestRepository extends JpaRepository<AttendanceApprovalRequest, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM AttendanceApprovalRequest r WHERE r.id = :id")
    Optional<AttendanceApprovalRequest> findByIdForUpdate(@Param("id") Long id);

    /** 매장의 특정 상태 요청 목록(최신순) — 사장 승인 화면. */
    List<AttendanceApprovalRequest> findByStoreIdAndStatusOrderByRequestedAtDesc(Long storeId, Status status);

    /** 내 요청 이력(최신순). */
    List<AttendanceApprovalRequest> findByEmployeeIdOrderByRequestedAtDesc(Long employeeId);

    /** 중복 요청 방지 — 같은 직원·매장·유형의 대기중 요청 존재 여부. */
    boolean existsByEmployeeIdAndStoreIdAndTypeAndStatus(Long employeeId, Long storeId, Type type, Status status);
}
