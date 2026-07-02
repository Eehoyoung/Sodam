package com.rich.sodam.repository;

import com.rich.sodam.domain.WageHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface WageHistoryRepository extends JpaRepository<WageHistory, Long> {

    List<WageHistory> findByStore_IdOrderByEffectiveFromDesc(Long storeId);

    List<WageHistory> findByEmployee_IdAndStore_IdOrderByEffectiveFromDesc(Long employeeId, Long storeId);

    /** 특정 직원의 모든 EMPLOYEE_OVERRIDE 이력(소속 매장 무관, 본인분). */
    List<WageHistory> findByScopeAndEmployee_IdOrderByEffectiveFromDesc(
            WageHistory.Scope scope, Long employeeId);

    /** 여러 매장의 STORE_DEFAULT 이력(직원에게 적용되는 매장 기본 시급 변경분). */
    List<WageHistory> findByScopeAndStore_IdInOrderByEffectiveFromDesc(
            WageHistory.Scope scope, Collection<Long> storeIds);
}
