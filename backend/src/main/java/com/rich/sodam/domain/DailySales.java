package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 일일 매출 — 사장이 하루 한 번 입력하는 매장 총매출(원).
 *
 * <p>(store_id, sale_date) 유니크 — 같은 날 재입력 시 upsert(수정)로 처리한다.
 * 인건비율(labor-ratio) 산출의 분모로 사용된다.
 */
@Entity
@Table(name = "daily_sales",
        uniqueConstraints = @UniqueConstraint(name = "uk_daily_sales_store_date", columnNames = {"store_id", "sale_date"}),
        indexes = @Index(name = "idx_daily_sales_store_date", columnList = "store_id, sale_date"))
@Getter
@NoArgsConstructor
public class DailySales {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "daily_sales_id")
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    /** 매출 발생일. */
    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;

    /** 매출액(원, 0 이상). */
    @Column(nullable = false)
    private Long amount;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public DailySales(Long storeId, LocalDate saleDate, Long amount) {
        this.storeId = storeId;
        this.saleDate = saleDate;
        this.amount = amount;
    }

    /** 같은 날 재입력 시 금액을 갱신한다(upsert). */
    public void updateAmount(Long amount) {
        this.amount = amount;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
