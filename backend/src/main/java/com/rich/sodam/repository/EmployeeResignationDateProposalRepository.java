package com.rich.sodam.repository;

import com.rich.sodam.domain.EmployeeResignationDateProposal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeResignationDateProposalRepository
        extends JpaRepository<EmployeeResignationDateProposal, Long> {

    // proposed_at 은 DATETIME(초 단위)이라 같은 초에 들어온 두 제안이 동률이 된다. 그때 정렬이
    // 임의로 뒤집히면 "마지막 제안자" 판정이 어긋나 본인 제안에 동의할 수 있게 된다 — append-only
    // 테이블이므로 AUTO_INCREMENT id 를 2차 정렬 키로 써서 삽입 순서를 확정한다.
    List<EmployeeResignationDateProposal> findByRequest_IdOrderByProposedAtAscIdAsc(Long requestId);

    Optional<EmployeeResignationDateProposal> findTopByRequest_IdOrderByProposedAtDescIdDesc(Long requestId);
}
