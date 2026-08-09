package com.rich.sodam.exception;

public class PaymentUnavailableException extends RuntimeException {

    public PaymentUnavailableException() {
        super("결제 준비가 완료되지 않았습니다.");
    }
}
