package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 시프트 템플릿 생성 요청 — 지정 기간(from~to)의 근무를 요일 패턴으로 스냅샷.
 */
@Getter
@Setter
public class ShiftTemplateCreateRequest {

    @NotBlank(message = "템플릿 이름을 입력해 주세요.")
    private String name;

    @NotNull(message = "기간 시작일을 입력해 주세요.")
    private LocalDate from;

    @NotNull(message = "기간 종료일을 입력해 주세요.")
    private LocalDate to;
}
