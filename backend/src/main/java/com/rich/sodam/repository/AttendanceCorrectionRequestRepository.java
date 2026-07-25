package com.rich.sodam.repository;

import com.rich.sodam.domain.AttendanceCorrectionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface AttendanceCorrectionRequestRepository
        extends JpaRepository<AttendanceCorrectionRequest, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from AttendanceCorrectionRequest r where r.id = :id")
    Optional<AttendanceCorrectionRequest> findByIdForUpdate(@Param("id") Long id);

    List<AttendanceCorrectionRequest> findByRequester_IdOrderByRequestedAtDesc(Long requesterId);

    List<AttendanceCorrectionRequest> findByAttendance_Store_IdAndStatus(
            Long storeId, AttendanceCorrectionRequest.Status status);

    long countByAttendance_Store_IdAndStatus(
            Long storeId, AttendanceCorrectionRequest.Status status);
}
