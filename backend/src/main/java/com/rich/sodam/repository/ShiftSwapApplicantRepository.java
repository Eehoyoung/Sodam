package com.rich.sodam.repository;

import com.rich.sodam.domain.ShiftSwapApplicant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

/**
 * 대타 모집 지원자 레포지토리.
 */
public interface ShiftSwapApplicantRepository extends JpaRepository<ShiftSwapApplicant, Long> {

    /** 중복 지원 체크 — (모집, 직원) 당 1회. */
    boolean existsBySwapRequestIdAndEmployeeId(Long swapRequestId, Long employeeId);

    /** 모집의 지원자 목록(지원 순). */
    List<ShiftSwapApplicant> findBySwapRequestIdOrderByAppliedAtAsc(Long swapRequestId);

    /** 여러 모집의 지원자 일괄 조회(목록 응답 N+1 방지). */
    List<ShiftSwapApplicant> findBySwapRequestIdIn(Collection<Long> swapRequestIds);
}
