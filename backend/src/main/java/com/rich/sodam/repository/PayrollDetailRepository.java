package com.rich.sodam.repository;

import com.rich.sodam.domain.PayrollDetail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 급여 상세 내역 레포지토리
 */
public interface PayrollDetailRepository extends JpaRepository<PayrollDetail, Long> {

    /**
     * 급여 ID로 상세 내역 조회
     * 근무일 기준 오름차순 정렬
     */
    List<PayrollDetail> findByPayroll_IdOrderByWorkDateAsc(Long payrollId);
}