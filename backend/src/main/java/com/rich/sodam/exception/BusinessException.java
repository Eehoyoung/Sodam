package com.rich.sodam.exception;

import lombok.Getter;

/**
 * 비즈니스 로직 관련 예외의 기본 클래스
 */
@Getter
public class BusinessException extends RuntimeException {

    private final String errorCode;

    public BusinessException(String message) {
        this(message, "BUSINESS_ERROR");
    }

    public BusinessException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }
}