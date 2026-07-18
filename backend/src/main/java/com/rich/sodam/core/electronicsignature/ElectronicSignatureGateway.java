package com.rich.sodam.core.electronicsignature;

/** 외부 전자서명 공급자 포트. 업무 도메인은 BaroCert SDK 타입을 직접 참조하지 않는다. */
public interface ElectronicSignatureGateway {
    ElectronicSignatureProvider provider();

    ElectronicSignatureReceipt request(ElectronicSignatureRequest request);

    ElectronicSignatureStatus getStatus(String receiptId);

    ElectronicSignatureVerification verify(String receiptId);
}
