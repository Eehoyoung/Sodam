package com.rich.sodam.dto.response;

import com.rich.sodam.domain.PurchaseItem;

/**
 * 매입 품목 응답 한 줄.
 */
public record PurchaseItemResponse(
        Long id,
        String itemName,
        double quantity,
        String unit,
        int unitPrice,
        int amount
) {
    public static PurchaseItemResponse from(PurchaseItem it) {
        return new PurchaseItemResponse(
                it.getId(), it.getItemName(), it.getQuantity(),
                it.getUnit(), it.getUnitPrice(), it.getAmount());
    }
}
