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

    /**
     * 매장 전체 직원의 계약을 한 번에 조회(N+1 방지용 배치 조회).
     * 직원별로 묶어 최신순(createdAt desc)으로 정렬되므로, 호출부에서 employeeId별 첫 항목만 취하면
     * {@link #findFirstByEmployeeIdAndStoreIdOrderByCreatedAtDesc}와 동일한 결과를 얻을 수 있다.
     */
    List<LaborContract> findByStoreIdOrderByEmployeeIdAscCreatedAtDesc(Long storeId);
}
