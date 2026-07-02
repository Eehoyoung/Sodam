package com.rich.sodam.repository;

import com.rich.sodam.domain.AttendanceCorrectionRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttendanceCorrectionRequestRepository
        extends JpaRepository<AttendanceCorrectionRequest, Long> {

    List<AttendanceCorrectionRequest> findByRequester_IdOrderByRequestedAtDesc(Long requesterId);

    List<AttendanceCorrectionRequest> findByAttendance_Store_IdAndStatus(
            Long storeId, AttendanceCorrectionRequest.Status status);
}
