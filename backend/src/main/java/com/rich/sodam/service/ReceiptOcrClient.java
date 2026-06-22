package com.rich.sodam.service;

import com.rich.sodam.domain.type.PurchaseCategory;

import java.time.LocalDate;
import java.util.List;

/**
 * 영수증 OCR 추상화. 공급자 비종속 — 실제 구현(CLOVA 등)은 외부 API 계약·키·비용이
 * 동반되므로 <b>인간 승인 후</b> 별도 빈으로 배선한다(CLAUDE.md §5.2).
 *
 * <p>승인 전 기본 구현은 {@link NoopReceiptOcrClient} 로, 빈 초안을 반환해
 * 사장이 전부 수기로 입력하는 경로를 보장한다(외부비용 0). parse 결과는 항상
 * <b>초안(DRAFT)</b>이며, 저장 전 사장 보정을 거친다.
 */
public interface ReceiptOcrClient {

    ReceiptDraft parse(byte[] image, String contentType);

    /** OCR 자동인식 초안(미저장). 인식 실패 필드는 null/빈값으로 둔다. */
    record ReceiptDraft(
            String vendorName,
            LocalDate purchaseDate,
            PurchaseCategory category,
            List<DraftItem> items
    ) {
        public static ReceiptDraft empty() {
            return new ReceiptDraft(null, null, null, List.of());
        }
    }

    record DraftItem(String itemName, double quantity, String unit, int unitPrice) {
    }
}
