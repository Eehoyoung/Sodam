package com.rich.sodam.repository;

import com.rich.sodam.domain.WageHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WageHistoryRepository extends JpaRepository<WageHistory, Long> {

    List<WageHistory> findByStore_IdOrderByEffectiveFromDesc(Long storeId);

    List<WageHistory> findByEmployee_IdAndStore_IdOrderByEffectiveFromDesc(Long employeeId, Long storeId);
}
