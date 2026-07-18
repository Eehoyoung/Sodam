package com.rich.sodam.core.electronicsignature;

public record ElectronicSignatureReceipt(String receiptId, String appScheme, String marketUrl) {
    public ElectronicSignatureReceipt {
        if (receiptId == null || receiptId.isBlank() || receiptId.length() > 120) {
            throw new IllegalArgumentException("전자서명 접수 ID가 올바르지 않습니다.");
        }
    }
}
