package com.rich.sodam.exception;

/**
 * 애플리케이션에서 사용되는 에러 코드를 정의하는 열거형
 */
public enum ErrorCode {

    // 인증 관련 에러 코드
    KAKAO_AUTH_ERROR("KAKAO_AUTH_ERROR", "auth.kakao.failed"),
    UNAUTHORIZED("UNAUTHORIZED", "auth.login.failed"),
    USER_NOT_FOUND("USER_NOT_FOUND", "auth.user.not.found"),

    // 리프레시 토큰 관련 에러 코드
    REFRESH_TOKEN_REQUIRED("REFRESH_TOKEN_REQUIRED", "auth.refresh.token.required"),
    REFRESH_TOKEN_INVALID("REFRESH_TOKEN_INVALID", "auth.refresh.token.invalid"),
    REFRESH_TOKEN_EXPIRED("REFRESH_TOKEN_EXPIRED", "auth.refresh.token.expired"),

    // 일반적인 에러 코드
    VALIDATION_ERROR("VALIDATION_ERROR", "error.validation.failed"),
    ENTITY_NOT_FOUND("ENTITY_NOT_FOUND", "error.resource.not.found"),
    INVALID_ARGUMENT("INVALID_ARGUMENT", "error.validation.failed"),
    RESOURCE_NOT_FOUND("RESOURCE_NOT_FOUND", "error.resource.not.found"),
    INTERNAL_SERVER_ERROR("INTERNAL_SERVER_ERROR", "error.internal.server");

    private final String code;
    private final String messageKey;

    ErrorCode(String code, String messageKey) {
        this.code = code;
        this.messageKey = messageKey;
    }

    /**
     * 에러 코드를 반환합니다.
     *
     * @return 에러 코드
     */
    public String getCode() {
        return code;
    }

    /**
     * 메시지 키를 반환합니다.
     *
     * @return 메시지 키
     */
    public String getMessageKey() {
        return messageKey;
    }
}
