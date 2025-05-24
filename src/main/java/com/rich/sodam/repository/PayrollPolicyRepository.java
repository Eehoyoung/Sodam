package com.rich.sodam.repository;

import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 급여 정책 레포지토리
 */
public interface PayrollPolicyRepository extends JpaRepository<PayrollPolicy, Long> {

    /**
     * 매장 기준으로 급여 정책 조회
     */
    Optional<PayrollPolicy> findByStore(Store store);

    /**
     * 매장 ID 기준으로 급여 정책 조회
     */
    Optional<PayrollPolicy> findByStore_Id(Long storeId);
}