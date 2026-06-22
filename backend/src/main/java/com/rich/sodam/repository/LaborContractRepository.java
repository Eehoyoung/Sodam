package com.rich.sodam.repository;

import com.rich.sodam.domain.LaborContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LaborContractRepository extends JpaRepository<LaborContract, Long> {

    List<LaborContract> findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(Long employeeId, Long storeId);

    List<LaborContract> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    Optional<LaborContract> findFirstByEmployeeIdAndStoreIdOrderByCreatedAtDesc(Long employeeId, Long storeId);
}
