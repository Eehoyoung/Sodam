package com.rich.sodam.exception;

/**
 * 리소스의 현재 상태와 충돌하는 요청(409 Conflict).
 * 예: 이미 진행 중인 대타 모집이 있는 시프트에 재모집, 중복 지원, 마감된 모집에 지원.
 */
public class ConflictException extends BusinessException {

    public ConflictException(String message) {
        super(message, "CONFLICT");
    }
}
