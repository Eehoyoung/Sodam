package com.rich.sodam.domain;

import com.rich.sodam.domain.type.PurchaseCategory;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 영수증 기반 경량 매입장부 — 한 건의 매입(영수증 1장). F-BUY-01.
 *
 * <p>거래처·일자·품목·수량·단가를 기록해 <b>품목별 가격비교</b>와 <b>발주량 참고</b>에 쓴다.
 * <p>스코프 경계(IDENTITY §8 개정): "사는 것(매입)의 기록·비교"까지만.
 * 재고 수량 자동차감·원가율·메뉴마진·판매연동(POS)은 만들지 않는다.
 * <p>PII 미저장 — 주민번호·계좌 없음. 영수증 이미지는 ref(S3 경로)만 보관하며 삭제 가능.
 */
@Entity
@Table(name = "purchase", indexes = {
        @Index(name = "idx_purchase_store_date", columnList = "store_id, purchase_date"),
        @Index(name = "idx_purchase_store_category", columnList = "store_id, category")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Purchase {

    /** OCR 자동인식 직후(보정 전) DRAFT, 사장 확정 저장 시 CONFIRMED. */
    public enum PurchaseStatus {
        DRAFT, CONFIRMED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "purchase_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** 거래처명(예: OO청과, 한빛주류). 가격비교의 거래처 축. */
    @Column(name = "vendor_name", length = 100, nullable = false)
    private String vendorName;

    /** 매입 일자(영수증 발행일). */
    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 20, nullable = false)
    private PurchaseCategory category;

    /** 합계(품목 금액의 합). 조회 편의를 위해 비정규화 저장. */
    @Column(name = "total_amount", nullable = false)
    private int totalAmount;

    /** 부가세 매입자료용(선택) — 공급가/부가세. 미입력 시 null. */
    @Column(name = "supply_amount")
    private Integer supplyAmount;

    @Column(name = "vat_amount")
    private Integer vatAmount;

    /** 영수증 이미지 저장 ref(S3 키 등). 원본 PII 없음, 삭제 가능. */
    @Column(name = "image_ref", length = 300)
    private String imageRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private PurchaseStatus status;

    @Column(name = "memo", length = 300)
    private String memo;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseItem> items = new ArrayList<>();

    private Purchase(Store store, String vendorName, LocalDate purchaseDate, PurchaseCategory category) {
        this.store = store;
        this.vendorName = vendorName;
        this.purchaseDate = purchaseDate;
        this.category = category;
        this.status = PurchaseStatus.CONFIRMED;
        this.createdAt = LocalDateTime.now();
        this.totalAmount = 0;
    }

    /** 확정 매입 생성. 품목은 {@link #addItem} 으로 채운 뒤 {@link #recalcTotal} 호출. */
    public static Purchase create(Store store, String vendorName, LocalDate purchaseDate,
                                  PurchaseCategory category) {
        return new Purchase(store, vendorName, purchaseDate, category);
    }

    public void addItem(PurchaseItem item) {
        item.attachTo(this);
        this.items.add(item);
    }

    /** 품목 전체 교체(수정 시). orphanRemoval 로 기존 품목 삭제. */
    public void replaceItems(List<PurchaseItem> newItems) {
        this.items.clear();
        for (PurchaseItem it : newItems) {
            addItem(it);
        }
        recalcTotal();
        this.updatedAt = LocalDateTime.now();
    }

    public void recalcTotal() {
        int sum = 0;
        for (PurchaseItem it : items) {
            sum += it.getAmount();
        }
        this.totalAmount = sum;
    }

    public void updateMeta(String vendorName, LocalDate purchaseDate, PurchaseCategory category,
                           String memo, Integer supplyAmount, Integer vatAmount) {
        this.vendorName = vendorName;
        this.purchaseDate = purchaseDate;
        this.category = category;
        this.memo = memo;
        this.supplyAmount = supplyAmount;
        this.vatAmount = vatAmount;
        this.updatedAt = LocalDateTime.now();
    }

    public void setImageRef(String imageRef) {
        this.imageRef = imageRef;
    }

    public void setMemo(String memo) {
        this.memo = memo;
    }

    public void setOptionalAmounts(Integer supplyAmount, Integer vatAmount) {
        this.supplyAmount = supplyAmount;
        this.vatAmount = vatAmount;
    }
}
