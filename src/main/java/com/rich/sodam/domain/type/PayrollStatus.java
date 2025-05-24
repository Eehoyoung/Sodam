package com.rich.sodam.domain.type;


import lombok.Getter;

@Getter
public enum PayrollStatus {
    DRAFT("작성중"),
    CONFIRMED("확정"),
    PAID("지급완료"),
    CANCELLED("취소됨");

    private final String description;

    PayrollStatus(String description) {
        this.description = description;
    }
}