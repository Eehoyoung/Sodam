package com.rich.sodam.repository;

import com.rich.sodam.domain.EmploymentAmendment;
import com.rich.sodam.domain.type.EmploymentAmendmentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmploymentAmendmentRepository extends JpaRepository<EmploymentAmendment, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from EmploymentAmendment a where a.id = :id")
    Optional<EmploymentAmendment> findByIdForUpdate(@Param("id") Long id);
    List<EmploymentAmendment> findByStoreIdAndEmployeeIdOrderByCreatedAtDesc(Long storeId, Long employeeId);
    List<EmploymentAmendment> findByStatusAndEffectiveDateLessThanEqual(
            EmploymentAmendmentStatus status, LocalDate effectiveDate);
}
