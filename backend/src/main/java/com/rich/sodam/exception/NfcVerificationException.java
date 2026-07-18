package com.rich.sodam.exception;

/**
 * NFC 태그 검증 실패 시 발생하는 예외.
 * {@link LocationVerificationException}(GPS 경로)의 NFC 대응 버전 — 매장에 등록된
 * 활성 태그가 아니면 대리출근 방지를 위해 출퇴근 기록 자체를 거부한다.
 */
public class NfcVerificationException extends BusinessException {

    public NfcVerificationException(String message) {
        super(message, "NFC_VERIFICATION_FAILED");
    }

    public static NfcVerificationException invalidTag() {
        return new NfcVerificationException("등록되지 않았거나 비활성화된 NFC 태그예요. 매장의 정식 태그를 태깅해 주세요.");
    }
}
