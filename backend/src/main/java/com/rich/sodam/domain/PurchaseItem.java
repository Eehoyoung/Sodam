package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 매입 영수증의 한 줄(품목·수량·단가). {@link Purchase} 의 자식.
 *
 * <p>{@code normalizedName} 은 가격비교·발주참고에서 같은 품목을 묶기 위한 정규화 키
 * (공백 제거·소문자화). 표시는 {@code itemName} 으로 한다.
 */
@Entity
@Table(name = "purchase_item", indexes = {
        @Index(name = "idx_purchase_item_norm", columnList = "normalized_name")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PurchaseItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "purchase_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_id", nullable = false)
    private Purchase purchase;

    /** 품목 표시명(예: 양파, 대파). */
    @Column(name = "item_name", length = 100, nullable = false)
    private String itemName;

    /** 가격비교 묶음 키 — itemName 정규화(소문자·공백제거). */
    @Column(name = "normalized_name", length = 100, nullable = false)
    private String normalizedName;

    /** 수량(소수 허용 — 예: 1.5kg). */
    @Column(name = "quantity", nullable = false)
    private double quantity;

    /** 단위(kg/박스/병/EA 등). */
    @Column(name = "unit", length = 20)
    private String unit;

    /** 단가(원). 가격비교의 핵심 값. */
    @Column(name = "unit_price", nullable = false)
    private int unitPrice;

    /** 금액(원) = round(quantity × unitPrice). */
    @Column(name = "amount", nullable = false)
    private int amount;

    private PurchaseItem(String itemName, double quantity, String unit, int unitPrice) {
        this.itemName = itemName;
        this.normalizedName = normalize(itemName);
        this.quantity = quantity;
        this.unit = unit;
        this.unitPrice = unitPrice;
        this.amount = (int) Math.round(quantity * unitPrice);
    }

    public static PurchaseItem of(String itemName, double quantity, String unit, int unitPrice) {
        return new PurchaseItem(itemName, quantity, unit, unitPrice);
    }

    void attachTo(Purchase purchase) {
        this.purchase = purchase;
    }

    /** 가격비교 키 정규화: 앞뒤 공백 제거 + 내부 공백 제거 + 소문자. */
    public static String normalize(String name) {
        if (name == null) return "";
        return name.trim().replaceAll("\\s+", "").toLowerCase();
    }
}
