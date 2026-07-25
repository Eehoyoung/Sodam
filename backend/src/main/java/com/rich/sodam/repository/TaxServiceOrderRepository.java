package com.rich.sodam.repository;

import com.rich.sodam.domain.TaxServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface TaxServiceOrderRepository extends JpaRepository<TaxServiceOrder, Long> {

    Optional<TaxServiceOrder> findByOrderId(String orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from TaxServiceOrder o where o.orderId = :orderId")
    Optional<TaxServiceOrder> findByOrderIdForUpdate(@Param("orderId") String orderId);

    List<TaxServiceOrder> findByUser_IdOrderByCreatedAtDesc(Long userId);
}
