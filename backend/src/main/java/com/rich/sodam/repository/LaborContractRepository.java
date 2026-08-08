package com.rich.sodam.repository;

import com.rich.sodam.domain.LaborContract;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface LaborContractRepository extends JpaRepository<LaborContract, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from LaborContract c where c.id = :id")
    Optional<LaborContract> findByIdForUpdate(@Param("id") Long id);

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

    /**
     * 보존기간이 만료된 근로계약 조회 — 기산점은 <b>근로관계 종료일</b>({@code deactivatedAt})이다
     * (근로기준법 §42 및 시행령 §22 취지: 계약 서류는 근로관계가 끝난 때부터 보존기간을 센다).
     *
     * <p>반환 원소는 {@code [laborContractId, deactivatedAt]} 2요소 배열이다.
     * 재입사 제외·복수 비활성 관계 처리는 {@link AttendanceRepository#findExpiredAfterEmploymentEnded}와 동일하다.</p>
     */
    @Query("SELECT c.id, MAX(r.deactivatedAt) FROM LaborContract c, EmployeeStoreRelation r " +
            "WHERE r.employeeProfile.id = c.employeeId AND r.store.id = c.storeId " +
            "AND r.isActive = false AND r.deactivatedAt IS NOT NULL AND r.deactivatedAt <= :cutoff " +
            "AND NOT EXISTS (SELECT 1 FROM EmployeeStoreRelation r2 " +
            "  WHERE r2.employeeProfile.id = c.employeeId AND r2.store.id = c.storeId " +
            "  AND r2.isActive = true) " +
            "GROUP BY c.id ORDER BY c.id")
    List<Object[]> findExpiredAfterEmploymentEnded(@Param("cutoff") LocalDateTime cutoff, Pageable pageable);
}
