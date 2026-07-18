package com.rich.sodam.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ManagerAccessDeniedException extends RuntimeException {
    private final String code;
    private final HttpStatus status;

    public ManagerAccessDeniedException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public static ManagerAccessDeniedException permissionDenied() {
        return new ManagerAccessDeniedException("MGR-001", HttpStatus.FORBIDDEN, "매니저 권한이 없습니다.");
    }

    public static ManagerAccessDeniedException signaturePending() {
        return new ManagerAccessDeniedException("MGR-004", HttpStatus.CONFLICT, "위임 전자서명이 완료되지 않았습니다.");
    }

    public static ManagerAccessDeniedException subscriptionFrozen() {
        return new ManagerAccessDeniedException("MGR-005", HttpStatus.PAYMENT_REQUIRED, "매장 구독 상태로 인해 위임 권한이 동결됐습니다.");
    }

    public static ManagerAccessDeniedException featureDisabled() {
        return new ManagerAccessDeniedException(
                "MGR-006", HttpStatus.SERVICE_UNAVAILABLE, "매니저 권한 위임 기능이 비활성화되어 있습니다.");
    }
}
