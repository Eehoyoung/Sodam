package com.rich.sodam.repository;

import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.domain.EmployeeResignationRequest.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface EmployeeResignationRequestRepository
        extends JpaRepository<EmployeeResignationRequest, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from EmployeeResignationRequest r where r.id = :id")
    Optional<EmployeeResignationRequest> findByIdForUpdate(@Param("id") Long id);

    List<EmployeeResignationRequest> findByRequester_IdOrderByRequestedAtDesc(Long requesterId);

    List<EmployeeResignationRequest> findByRelation_Store_IdOrderByRequestedAtDesc(Long storeId);

    Optional<EmployeeResignationRequest> findByRelation_IdAndStatus(Long relationId, Status status);
}
