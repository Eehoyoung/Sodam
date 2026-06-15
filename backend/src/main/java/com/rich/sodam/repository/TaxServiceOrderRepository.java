package com.rich.sodam.repository;

import com.rich.sodam.domain.TaxServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaxServiceOrderRepository extends JpaRepository<TaxServiceOrder, Long> {

    Optional<TaxServiceOrder> findByOrderId(String orderId);

    List<TaxServiceOrder> findByUser_IdOrderByCreatedAtDesc(Long userId);
}
