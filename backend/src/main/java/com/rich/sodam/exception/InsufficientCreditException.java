package com.rich.sodam.exception;

import lombok.Getter;

/**
 * 출근권 잔액 부족 — 채용 제안 발송/지원서 열람+채팅 개설 등 능동적 매칭 행위에 필요한 출근권이
 * 부족할 때. HTTP 402(Payment Required)로 매핑되어 FE가 충전(페이월) 유도로 분기한다
 * (api-design.md: "결제 필요 402" + FE 분기용 errorCode).
 */
@Getter
public class InsufficientCreditException extends RuntimeException {

    /** 이번 행위에 필요한 수량. */
    private final int required;
    /** 현재(스윕 반영) 잔액. */
    private final int balance;

    public InsufficientCreditException(String message, int required, int balance) {
        super(message);
        this.required = required;
        this.balance = balance;
    }
}
