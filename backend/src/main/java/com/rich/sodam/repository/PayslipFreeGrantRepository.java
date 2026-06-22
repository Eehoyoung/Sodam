package com.rich.sodam.repository;

import com.rich.sodam.domain.PayslipFreeGrant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayslipFreeGrantRepository extends JpaRepository<PayslipFreeGrant, Long> {

    boolean existsByStoreIdAndYearMonthKey(Long storeId, String yearMonthKey);
}
