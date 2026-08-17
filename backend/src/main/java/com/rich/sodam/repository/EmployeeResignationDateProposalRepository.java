package com.rich.sodam.repository;

import com.rich.sodam.domain.EmployeeResignationDateProposal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeResignationDateProposalRepository
        extends JpaRepository<EmployeeResignationDateProposal, Long> {

    List<EmployeeResignationDateProposal> findByRequest_IdOrderByProposedAtAsc(Long requestId);

    Optional<EmployeeResignationDateProposal> findTopByRequest_IdOrderByProposedAtDesc(Long requestId);
}
