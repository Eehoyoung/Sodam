package com.rich.sodam.dto.response;

import com.rich.sodam.service.ReceiptOcrClient.DraftItem;
import com.rich.sodam.service.ReceiptOcrClient.ReceiptDraft;

import java.time.LocalDate;
import java.util.List;

/**
 * 영수증 OCR 자동인식 초안(미저장). 사장이 화면에서 보정 후 저장한다.
 * OCR 미설정(Noop) 시 모든 필드가 빈 값 — 수기 입력 경로.
 */
public record ReceiptDraftResponse(
        String vendorName,
        LocalDate purchaseDate,
        String category,
        List<DraftItemResponse> items,
        boolean ocrAvailable
) {
    public record DraftItemResponse(String itemName, double quantity, String unit, int unitPrice) {
        static DraftItemResponse from(DraftItem d) {
            return new DraftItemResponse(d.itemName(), d.quantity(), d.unit(), d.unitPrice());
        }
    }

    public static ReceiptDraftResponse from(ReceiptDraft draft) {
        boolean available = draft.vendorName() != null || !draft.items().isEmpty();
        List<DraftItemResponse> items = draft.items().stream()
                .map(DraftItemResponse::from).toList();
        return new ReceiptDraftResponse(
                draft.vendorName(),
                draft.purchaseDate(),
                draft.category() != null ? draft.category().name() : null,
                items,
                available);
    }
}
