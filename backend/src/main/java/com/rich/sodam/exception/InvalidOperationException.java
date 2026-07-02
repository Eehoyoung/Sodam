package com.rich.sodam.exception;

/**
 * 유효하지 않은 작업 요청 시 발생하는 예외
 */
public class InvalidOperationException extends BusinessException {

    public InvalidOperationException(String message) {
        super(message, "INVALID_OPERATION");
    }
}