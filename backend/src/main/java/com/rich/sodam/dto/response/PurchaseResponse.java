package com.rich.sodam.dto.response;

import com.rich.sodam.domain.Purchase;

import java.time.LocalDate;
import java.util.List;

/**
 * 매입 한 건 응답(품목 포함).
 */
public record PurchaseResponse(
        Long id,
        String vendorName,
        LocalDate purchaseDate,
        String category,
        String categoryLabel,
        int totalAmount,
        Integer supplyAmount,
        Integer vatAmount,
        String status,
        String memo,
        String imageRef,
        List<PurchaseItemResponse> items
) {
    public static PurchaseResponse from(Purchase p) {
        return new PurchaseResponse(
                p.getId(),
                p.getVendorName(),
                p.getPurchaseDate(),
                p.getCategory() != null ? p.getCategory().name() : null,
                p.getCategory() != null ? p.getCategory().getDescription() : null,
                p.getTotalAmount(),
                p.getSupplyAmount(),
                p.getVatAmount(),
                p.getStatus() != null ? p.getStatus().name() : null,
                p.getMemo(),
                p.getImageRef(),
                p.getItems().stream().map(PurchaseItemResponse::from).toList());
    }
}
