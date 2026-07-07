package com.rich.sodam.repository;

import com.rich.sodam.domain.LaborContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LaborContractRepository extends JpaRepository<LaborContract, Long> {

    List<LaborContract> findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(Long employeeId, Long storeId);

    /** 사장의 임시저장(미발송) 계약서 관리 화면용 — create()만 되고 send()가 안/못 된 초안만. */
    List<LaborContract> findByEmployeeIdAndStoreIdAndSentAtIsNullOrderByCreatedAtDesc(Long employeeId, Long storeId);

    /** 직원 본인 화면 노출용 — 아직 발송 전(sentAt null)인 임시저장 계약은 제외한다. */
    List<LaborContract> findByEmployeeIdAndSentAtIsNotNullOrderByCreatedAtDesc(Long employeeId);

    Optional<LaborContract> findFirstByEmployeeIdAndStoreIdOrderByCreatedAtDesc(Long employeeId, Long storeId);
}
