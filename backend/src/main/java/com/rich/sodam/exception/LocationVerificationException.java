package com.rich.sodam.exception;

/**
 * 위치 검증 실패 시 발생하는 예외
 */
public class LocationVerificationException extends BusinessException {

    public LocationVerificationException(String message) {
        super(message, "LOCATION_VERIFICATION_FAILED");
    }

    public static LocationVerificationException outOfRange() {
        return new LocationVerificationException("매장 위치를 벗어났습니다. 매장 내에서 처리해주세요.");
    }
}